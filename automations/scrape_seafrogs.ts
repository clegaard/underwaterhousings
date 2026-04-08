/**
 * Scrape Sea Frogs housings and ports from their website.
 *
 * Unlike Nauticam (Shopify JSON API), Sea Frogs uses a custom CMS. Scraping
 * requires two phases:
 *   1.  Fetch paginated HTML listing pages to collect product URLs.
 *   2.  Fetch each product detail page to extract specs, images, and price.
 *
 * Pagination format (discovered from page-1 link targets):
 *   /Products/{categoryId}-{offset}-{pageSize}.html
 *
 * Output:
 *   A single JSON file whose structure mirrors the Prisma schema so that
 *   it can be loaded and ingested by prisma/seed.ts or any custom seeder.
 *
 * Usage:
 *   npx tsx automations/scrape_seafrogs.ts
 *   npx tsx automations/scrape_seafrogs.ts --output my_output.json
 *   npx tsx automations/scrape_seafrogs.ts --delay 1.5
 */

import { writeFileSync } from "fs";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL = "https://www.seafrogs.com";
const DEFAULT_OUTPUT = "automations/seafrogs_scraped.json";
const DEFAULT_DELAY_MS = 1200; // respectful for a non-Shopify custom website
const PRODUCTS_PER_PAGE = 12;

const REQUEST_HEADERS = {
    "User-Agent":
        "Mozilla/5.0 (compatible; SeafrogsScraper/1.0; +https://github.com/underwaterhousings)",
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
};

// Housing category listing pages (category slug → first-page path).
// &-signs encoded to %26 so the URL is valid in HTTP requests.
const HOUSING_CATEGORIES: CategoryConfig[] = [
    {
        label: "Aluminum Camera Housings",
        firstPagePath: "/Products/Aluminum_Camera_Housings.html",
        defaultMaterial: "Aluminum",
        interchangeablePort: true,
    },
    {
        label: "Polycarbonate Camera Housings",
        firstPagePath: "/Products/Polycarbonate_Camera_Housings.html",
        defaultMaterial: "Polycarbonate",
        interchangeablePort: false,
    },
    {
        label: "Polycarbonate Mobile & Action Camera Housings",
        firstPagePath: "/Products/Polycarbonate_Mobile_Housings.html",
        defaultMaterial: "Polycarbonate",
        interchangeablePort: false,
    },
];

const PORT_CATEGORIES: CategoryConfig[] = [
    {
        label: "Dome & Macro Ports",
        firstPagePath: "/Products/Dome_%26_Macro_port.html",
        defaultMaterial: "Aluminum",
        interchangeablePort: false,
    },
    {
        label: "Extension & Adapter Rings",
        firstPagePath: "/Products/Extension_%26_Adapter_Ring.html",
        defaultMaterial: "Aluminum",
        interchangeablePort: false,
    },
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CategoryConfig {
    label: string;
    firstPagePath: string;
    defaultMaterial: string;
    interchangeablePort: boolean;
}

interface RawProductDetail {
    url: string;
    title: string;
    price: number | null;
    specs: Map<string, string>;
    images: string[];
}

interface HousingMount {
    name: string;
    slug: string;
    manufacturer: string;
}

interface ScrapedHousing {
    name: string;
    slug: string;
    sku: string;
    description: string;
    priceAmount: number | null;
    priceCurrency: string;
    depthRating: number;
    material: string;
    housingMount: string | null;
    cameraName: string | null;
    cameraBrand: string | null;
    interchangeablePort: boolean;
    productPhotos: string[];
    sourceUrl: string;
}

interface ScrapedPort {
    name: string;
    slug: string;
    sku: string;
    description: string;
    priceAmount: number | null;
    priceCurrency: string;
    depthRating: number | null;
    isFlatPort: boolean;
    hemisphereWidth: number | null;
    housingMount: string | null;
    productPhotos: string[];
    sourceUrl: string;
}

interface ScraperOutput {
    scrapedAt: string;
    sourceBaseUrl: string;
    _notes: string[];
    manufacturer: { name: string; slug: string };
    housingMounts: HousingMount[];
    housings: ScrapedHousing[];
    ports: ScrapedPort[];
}

// ---------------------------------------------------------------------------
// Camera brand extraction
// ---------------------------------------------------------------------------

interface CameraBrandPattern {
    brandName: string;
    pattern: RegExp;
}

const CAMERA_BRAND_PATTERNS: CameraBrandPattern[] = [
    { brandName: "Sony", pattern: /\bfor\s+Sony\s+(.+?)(?:\s+Camera)?\s*$/i },
    { brandName: "Canon", pattern: /\bfor\s+Canon\s+(.+?)(?:\s+Camera)?\s*$/i },
    { brandName: "Nikon", pattern: /\bfor\s+Nikon\s+(.+?)(?:\s+Camera)?\s*$/i },
    { brandName: "Fujifilm", pattern: /\bfor\s+Fujifilm\s+(.+?)(?:\s+Camera)?\s*$/i },
    { brandName: "Panasonic", pattern: /\bfor\s+Panasonic\s+(.+?)(?:\s+Camera)?\s*$/i },
    {
        brandName: "OM System",
        pattern: /\bfor\s+(?:Olympus\s+|OM\s+System\s+|OM-System\s+)(.+?)(?:\s+Camera)?\s*$/i,
    },
    { brandName: "RED", pattern: /\bfor\s+RED[®™]?\s+(.+?)(?:\s+Camera)?\s*$/i },
    {
        brandName: "Insta360",
        pattern: /(?:\bfor\s+Insta360\s+|^Insta360\s+)(.+?)(?:\s+Housing|\s+Camera)?\s*$/i,
    },
    { brandName: "Blackmagic Design", pattern: /\bfor\s+(?:Blackmagic\s+|BMPCC\s*)(.+?)(?:\s+Camera)?\s*$/i },
    { brandName: "DJI", pattern: /\bfor\s+DJI\s+(.+?)(?:\s+Camera|\s+Action\s+Camera)?\s*$/i },
    { brandName: "GoPro", pattern: /\bfor\s+GoPro\s+(.+?)(?:\s+Camera)?\s*$/i },
    // Sony RX-series without explicit brand prefix
    { brandName: "Sony", pattern: /\bfor\s+(RX\d+\w*)\b/i },
    // Apple iPhone
    { brandName: "Apple", pattern: /\bfor\s+(iPhone\s*\w+)\b/i },
];

/**
 * Title fragments that indicate a fixed-lens housing (action cam, compact,
 * phone case). These housings never have an interchangeable port.
 */
const FIXED_PORT_TITLE_FRAGMENTS = [
    "gopro",
    "dji osmo",
    "dji action",
    "osmo action",
    "osmo pocket",
    "iphone",
    "smart phone",
    "smartphone",
    "phone case",
    " tg-",   // Olympus TG-5, TG-6, TG-7
    "tg5", "tg6", "tg7",
    "rx100",
    "rx0",
];

function hasFixedPort(title: string): boolean {
    const lower = title.toLowerCase();
    return FIXED_PORT_TITLE_FRAGMENTS.some(frag => lower.includes(frag));
}

function extractCameraInfo(
    title: string
): { brandName: string | null; cameraName: string | null } {
    for (const { brandName, pattern } of CAMERA_BRAND_PATTERNS) {
        const m = pattern.exec(title);
        if (m) {
            let model = m[1].trim();
            // strip trailing "Camera", "Digital Camera", port descriptors
            model = model
                .replace(/\s+(Digital\s+)?Camera$/i, "")
                .replace(/\s+with\s+(Flat|Dome)\s+Port.*$/i, "")
                .trim();
            return { brandName, cameraName: model };
        }
    }
    return { brandName: null, cameraName: null };
}

// ---------------------------------------------------------------------------
// HTML parsing helpers
// ---------------------------------------------------------------------------

function decodeEntities(html: string): string {
    return html
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&nbsp;/g, " ")
        .replace(/&#\d+;/g, "");
}

function stripTags(html: string): string {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Extract the product title from a detail-page HTML document.
 * Looks for the first <h1> tag; falls back to <title>.
 */
function extractTitle(html: string): string {
    const h1 = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html);
    if (h1) return decodeEntities(stripTags(h1[1])).trim();

    const titleTag = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
    if (titleTag) {
        const raw = decodeEntities(stripTags(titleTag[1])).trim();
        // remove site-name suffix like " - Sea Frogs"
        return raw.split(/\s*[-|]\s*Sea Frogs/i)[0].trim();
    }

    return "";
}

/**
 * Extract the price from a detail page.
 * Sea Frogs shows it as "$ 3523 USD" in the page body.
 */
function extractPrice(html: string): number | null {
    // Match first occurrence: $ 1250 USD  or  $1,250 USD
    const m = /\$\s*([\d,]+(?:\.\d+)?)\s*USD/i.exec(html);
    if (!m) return null;
    return parseFloat(m[1].replace(/,/g, ""));
}

/**
 * Extract all key→value pairs from HTML tables in the page.
 * Returns a map with lower-cased, trimmed keys.
 */
function parseSpecTable(html: string): Map<string, string> {
    const specs = new Map<string, string>();
    if (!html) return specs;

    const tableRe = /<table[\s\S]*?<\/table>/gi;
    let tableM: RegExpExecArray | null;
    while ((tableM = tableRe.exec(html)) !== null) {
        const rowRe = /<tr[\s\S]*?<\/tr>/gi;
        let rowM: RegExpExecArray | null;
        while ((rowM = rowRe.exec(tableM[0])) !== null) {
            const cells: string[] = [];
            const cellRe = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;
            let cellM: RegExpExecArray | null;
            while ((cellM = cellRe.exec(rowM[0])) !== null) {
                cells.push(decodeEntities(stripTags(cellM[1])));
            }
            if (cells.length >= 2 && cells[0] && cells[1]) {
                specs.set(cells[0].toLowerCase().trim(), cells[1].trim());
            }
        }
    }
    return specs;
}

/**
 * Extract product photos from a detail page.
 * Images are served from the omo-oss-image CDN; thumbnails have a
 * `_NNNxaf.ext` suffix which we strip to get the full-resolution URL.
 *
 * We stop at the "MORE PRODUCTS" section to avoid collecting other
 * products' thumbnails and site-wide footer images (social QR codes, logos).
 */
function extractImages(html: string): string[] {
    const seen = new Set<string>();
    const images: string[] = [];

    // Strip <script> blocks first (some CMSs embed image URLs in JS JSON)
    const noScript = html.replace(/<script[\s\S]*?<\/script>/gi, "");

    // Truncate at "MORE PRODUCTS" section — everything after that belongs to
    // related-product widgets and the page footer, not this product.
    const cutIdx = noScript.search(/MORE\s+PRODUCTS/i);
    const workHtml = cutIdx > 0 ? noScript.slice(0, cutIdx) : noScript;

    // Match both https:// and protocol-relative //omo-oss-image...
    const srcRe = /src="((?:https?:)?\/\/omo-oss-image\.thefastimg\.com\/[^"]+)"/gi;
    let m: RegExpExecArray | null;

    while ((m = srcRe.exec(workHtml)) !== null) {
        let src = m[1];

        // Skip placeholder and video-cover images
        if (src.includes("/npublic/img/s.png")) continue;
        if (src.includes("/cms/vedio/")) continue;

        // Ensure absolute URL
        if (src.startsWith("//")) src = "https:" + src;

        // Strip thumbnail suffix, e.g. _366xaf.jpg or _104xaf.png
        const base = src.replace(/_\d+xaf\.\w+$/, "");

        if (!seen.has(base)) {
            seen.add(base);
            images.push(base);
        }
    }

    return images;
}

// ---------------------------------------------------------------------------
// Spec-value parsers
// ---------------------------------------------------------------------------

function parseDepthRating(raw: string): number | null {
    if (!raw) return null;
    const upper = raw.trim().toUpperCase();
    if (upper === "TBA" || upper === "N/A" || upper === "") return null;
    const m = /(\d+)/.exec(raw);
    return m ? parseInt(m[1], 10) : null;
}

/** Try to extract a diameter in mm from a port name like "230mm" or "8 inch". */
function parseDiameterFromName(name: string): number | null {
    const mm = /(\d+)\s*mm/i.exec(name);
    if (mm) return parseInt(mm[1], 10);
    const inch = /([\d.]+)\s*(?:inch|"|'')/i.exec(name);
    if (inch) return Math.round(parseFloat(inch[1]) * 25.4);
    return null;
}

function isFlatPort(name: string): boolean {
    const lower = name.toLowerCase();
    const domeKeywords = ["dome port", "wide angle", "wide-angle", "fisheye"];
    const flatKeywords = ["flat port", "macro port", "extension ring", "extension tube"];
    for (const kw of domeKeywords) if (lower.includes(kw)) return false;
    for (const kw of flatKeywords) if (lower.includes(kw)) return true;
    // Default: treat unknown port accessories as flat
    return true;
}

// ---------------------------------------------------------------------------
// Slug helpers
// ---------------------------------------------------------------------------

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

/**
 * Derive a stable slug from a product detail URL.
 * e.g. /products_details/Sea_frogs_100M/328ft_housing.html → sea-frogs-100m-328ft-housing
 */
function slugFromUrl(url: string): string {
    try {
        const pathname = new URL(url).pathname;
        const m = /\/products_details\/(.+?)(?:\.html)?$/.exec(pathname);
        if (m) return slugify(m[1].replace(/\//g, " "));
    } catch {
        // fall through
    }
    return slugify(url);
}

// ---------------------------------------------------------------------------
// Network helpers
// ---------------------------------------------------------------------------

async function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch a URL and return raw HTML. Returns null on error (logs a warning).
 */
async function fetchHtml(url: string): Promise<string | null> {
    try {
        const resp = await fetch(url, { headers: REQUEST_HEADERS });
        if (!resp.ok) {
            console.warn(`  WARNING: HTTP ${resp.status} – ${url}`);
            return null;
        }
        return await resp.text();
    } catch (err) {
        console.warn(`  WARNING: fetch failed – ${url} – ${err}`);
        return null;
    }
}

// ---------------------------------------------------------------------------
// Listing-page scraping
// ---------------------------------------------------------------------------

/**
 * Extract all /products_details/...html hrefs from a listing-page HTML blob.
 */
function extractProductLinks(html: string): string[] {
    const seen = new Set<string>();
    const links: string[] = [];
    // href may be absolute or root-relative; path sometimes contains encoded slashes
    const linkRe = /href="((?:https?:\/\/www\.seafrogs\.com)?\/products_details\/[^"?]+\.html)"/gi;
    let m: RegExpExecArray | null;
    while ((m = linkRe.exec(html)) !== null) {
        let href = m[1];
        if (href.startsWith("/")) href = BASE_URL + href;
        // Normalise to lowercase for dedup key, but keep original case for URL
        const key = href.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            links.push(href);
        }
    }
    return links;
}

/**
 * Extract all pagination page URLs (/Products/{id}-{offset}-{size}.html)
 * from page-1 HTML. Returns them sorted by offset (ascending).
 */
function extractPaginationUrls(html: string): string[] {
    const seen = new Set<string>();
    const urls: string[] = [];
    const pageRe = /href="((?:https?:\/\/www\.seafrogs\.com)?\/Products\/\d+-\d+-\d+\.html)"/gi;
    let m: RegExpExecArray | null;
    while ((m = pageRe.exec(html)) !== null) {
        let href = m[1];
        if (href.startsWith("/")) href = BASE_URL + href;
        const key = href.toLowerCase();
        if (!seen.has(key)) {
            seen.add(key);
            urls.push(href);
        }
    }
    // Sort by the offset number embedded in the URL
    urls.sort((a, b) => {
        const offsetA = parseInt(/\/\d+-(\d+)-\d+\.html/.exec(a)?.[1] ?? "0", 10);
        const offsetB = parseInt(/\/\d+-(\d+)-\d+\.html/.exec(b)?.[1] ?? "0", 10);
        return offsetA - offsetB;
    });
    return urls;
}

/**
 * Walk all pages in a category and return the unique product detail URLs found.
 */
async function fetchCategoryProductUrls(
    category: CategoryConfig,
    delayMs: number
): Promise<string[]> {
    const allUrls: string[] = [];
    const seen = new Set<string>();

    function addLinks(html: string): void {
        for (const url of extractProductLinks(html)) {
            const key = url.toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                allUrls.push(url);
            }
        }
    }

    const firstPageUrl = BASE_URL + category.firstPagePath;
    console.log(`  Fetching page 1: ${firstPageUrl}`);
    const firstHtml = await fetchHtml(firstPageUrl);
    if (!firstHtml) return [];

    addLinks(firstHtml);

    const remainingPages = extractPaginationUrls(firstHtml);
    console.log(
        `  Found ${remainingPages.length} additional page(s) in "${category.label}"`
    );

    for (let i = 0; i < remainingPages.length; i++) {
        await sleep(delayMs);
        const pageUrl = remainingPages[i];
        console.log(`  Fetching page ${i + 2}: ${pageUrl}`);
        const html = await fetchHtml(pageUrl);
        if (html) addLinks(html);
    }

    return allUrls;
}

// ---------------------------------------------------------------------------
// Product detail scraping
// ---------------------------------------------------------------------------

async function fetchProductDetail(
    url: string
): Promise<RawProductDetail | null> {
    const html = await fetchHtml(url);
    if (!html) return null;

    const title = extractTitle(html);
    if (!title) {
        console.warn(`  WARNING: could not extract title from ${url}`);
        return null;
    }

    const price = extractPrice(html);
    const specs = parseSpecTable(html);
    const images = extractImages(html);

    return { url, title, price, specs, images };
}

// ---------------------------------------------------------------------------
// Transformations
// ---------------------------------------------------------------------------

/**
 * Keywords in a product title that indicate it is NOT a camera housing but
 * rather a port, accessory, or other non-housing item. These are filtered
 * from housing category scrapes.
 */
const NON_HOUSING_TITLE_FRAGMENTS = [
    "extension ring",
    "dome port",
    "flat port",
    "macro port",
    "adapter ring",
    "tripod base",
    "square base",
    "lens gear",
    "focus gear",
    "zoom gear",
    "tray",
    "handle",
    "back cover",
    "top cover",
    "port accessories",
];

function isLikelyHousing(title: string): boolean {
    const lower = title.toLowerCase();
    for (const frag of NON_HOUSING_TITLE_FRAGMENTS) {
        if (lower.includes(frag)) return false;
    }
    return true;
}

function transformHousing(
    detail: RawProductDetail,
    category: CategoryConfig
): ScrapedHousing {
    const { url, title, price, specs, images } = detail;

    const sku = specs.get("model") ?? specs.get("sku") ?? "";

    const depthRaw =
        specs.get("depth rating") ?? specs.get("depth") ?? "";
    const depthRating = parseDepthRating(depthRaw) ?? 0;

    // Determine material from spec table; fall back to category default
    const materialRaw = specs.get("material") ?? "";
    let material: string;
    if (/aluminum/i.test(materialRaw)) material = "Aluminum";
    else if (/polycarbonate/i.test(materialRaw)) material = "Polycarbonate";
    else material = category.defaultMaterial;

    // "Port Size" in the spec table gives the Sea Frogs mount name (e.g. "SF125")
    const portSizeRaw = (specs.get("port size") ?? "").trim();
    let housingMount: string | null = portSizeRaw || null;

    // "Key Feature" may explicitly mention an interchangeable port system.
    // Polycarbonate ILC housings rely on this — they have no "Port Size" row.
    const keyFeature = (specs.get("key feature") ?? "").toLowerCase();
    const hasInterchangeablePortFeature = keyFeature.includes("interchangeable port system");

    // Polycarbonate housings that advertise an interchangeable port system use
    // the "WA005" port mount (the polycarbonate dome/flat port standard).
    if (!housingMount && hasInterchangeablePortFeature && /polycarbonate/i.test(materialRaw)) {
        housingMount = "WA005";
    }

    // A housing has an interchangeable port if:
    //   a) it has a named port mount (SF125 or WA005), OR
    //   b) the spec table explicitly says "Interchangeable port system", OR
    //   c) the category default is true (e.g. all aluminum housings)
    // EXCEPT for fixed-lens / action-cam housings which never have swappable ports.
    const interchangeablePort =
        !hasFixedPort(title) &&
        (housingMount !== null || hasInterchangeablePortFeature || category.interchangeablePort);

    const { brandName: cameraBrand, cameraName } = extractCameraInfo(title);

    return {
        name: title,
        slug: slugFromUrl(url),
        sku,
        description: "",
        priceAmount: price,
        priceCurrency: "USD",
        depthRating,
        material,
        housingMount,
        cameraName,
        cameraBrand,
        interchangeablePort,
        productPhotos: images,
        sourceUrl: url,
    };
}

function transformPort(detail: RawProductDetail): ScrapedPort {
    const { url, title, price, specs, images } = detail;

    const sku = specs.get("model") ?? specs.get("sku") ?? "";

    const depthRaw =
        specs.get("depth rating") ?? specs.get("depth") ?? "";
    const depthRating = parseDepthRating(depthRaw);

    // "Port Size" in the spec table (e.g. "SF125") → housingMount
    const portSizeRaw = (specs.get("port size") ?? "").trim();
    let housingMount = portSizeRaw || null;

    // Fallback for extension rings whose spec table is empty:
    // extract the SF-system prefix from the product name, e.g. "Sea Frogs SF125-20 Extension Ring" → "SF125"
    if (!housingMount) {
        const mountInName = /\b(SF\d+)\b/i.exec(title);
        if (mountInName) housingMount = mountInName[1].toUpperCase();
    }

    // For extension rings, derive SKU from the product name if spec table is absent
    const resolvedSku =
        sku ||
        (/\b(SF\d+[-–]\w+)\b/i.exec(title)?.[1] ?? "");

    const flat = isFlatPort(title);

    // For dome ports, try to extract the diameter (mm) from the product name
    const hemisphereWidth = !flat ? parseDiameterFromName(title) : null;

    return {
        name: title,
        slug: slugFromUrl(url),
        sku: resolvedSku,
        description: "",
        priceAmount: price,
        priceCurrency: "USD",
        depthRating,
        isFlatPort: flat,
        hemisphereWidth,
        housingMount,
        productPhotos: images,
        sourceUrl: url,
    };
}

// ---------------------------------------------------------------------------
// Collect housing mounts
// ---------------------------------------------------------------------------

function collectHousingMounts(
    housings: ScrapedHousing[],
    ports: ScrapedPort[]
): HousingMount[] {
    const seen = new Set<string>();
    const mounts: HousingMount[] = [];

    for (const item of [...housings, ...ports]) {
        const name = item.housingMount;
        if (name && !seen.has(name)) {
            seen.add(name);
            mounts.push({ name, slug: slugify(name), manufacturer: "Sea Frogs" });
        }
    }

    return mounts.sort((a, b) => a.name.localeCompare(b.name));
}

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs(): { output: string; delayMs: number } {
    const args = process.argv.slice(2);
    let output = DEFAULT_OUTPUT;
    let delayMs = DEFAULT_DELAY_MS;

    for (let i = 0; i < args.length; i++) {
        if (args[i] === "--output" && args[i + 1]) {
            output = args[++i];
        } else if (args[i] === "--delay" && args[i + 1]) {
            delayMs = Math.round(parseFloat(args[++i]) * 1000);
        }
    }

    return { output, delayMs };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
    const { output, delayMs } = parseArgs();

    console.log("=== Sea Frogs scraper ===");
    console.log(`Output: ${output}`);
    console.log(`Request delay: ${delayMs / 1000}s`);
    console.log();

    // ---- Phase 1: Collect all unique product URLs -------------------------

    // Maps lowercase URL → { original-case URL, category } for deduplication
    const housingUrlMap = new Map<string, { url: string; cat: CategoryConfig }>();
    // Maps lowercase URL → original-case URL for deduplication
    const portUrlMap = new Map<string, string>();

    console.log("Phase 1: collecting product URLs from listing pages …");

    for (const cat of HOUSING_CATEGORIES) {
        console.log(`\n  Category: "${cat.label}"`);
        const urls = await fetchCategoryProductUrls(cat, delayMs);
        console.log(`  Found ${urls.length} product links`);
        for (const url of urls) {
            const key = url.toLowerCase();
            if (!housingUrlMap.has(key)) housingUrlMap.set(key, { url, cat });
        }
        await sleep(delayMs);
    }

    for (const cat of PORT_CATEGORIES) {
        console.log(`\n  Category: "${cat.label}"`);
        const urls = await fetchCategoryProductUrls(cat, delayMs);
        console.log(`  Found ${urls.length} product links`);
        for (const url of urls) {
            const key = url.toLowerCase();
            if (!portUrlMap.has(key)) portUrlMap.set(key, url);
        }
        await sleep(delayMs);
    }

    // Collect original-case URLs with their category mapping
    const housingEntries: Array<{ url: string; cat: CategoryConfig }> =
        [...housingUrlMap.values()];

    const portUrls = [...portUrlMap.values()];

    console.log(
        `\nTotal housing product URLs: ${housingEntries.length}, port URLs: ${portUrls.length}`
    );
    console.log(
        `Total detail pages to fetch: ${housingEntries.length + portUrls.length}`
    );
    console.log();

    // ---- Phase 2: Fetch all product detail pages --------------------------

    console.log("Phase 2: fetching product detail pages …");

    const housings: ScrapedHousing[] = [];
    const ports: ScrapedPort[] = [];

    let done = 0;
    const totalDetail = housingEntries.length + portUrls.length;

    for (const { url, cat } of housingEntries) {
        await sleep(delayMs);
        done++;
        process.stdout.write(
            `  [${done}/${totalDetail}] ${url.split("/").pop()}\r`
        );

        const detail = await fetchProductDetail(url);
        if (!detail || !isLikelyHousing(detail.title)) {
            if (detail) {
                console.log(
                    `\n  Skipped (not a housing): "${detail.title}"`
                );
            }
            continue;
        }

        housings.push(transformHousing(detail, cat));
    }

    for (const url of portUrls) {
        await sleep(delayMs);
        done++;
        process.stdout.write(
            `  [${done}/${totalDetail}] ${url.split("/").pop()}\r`
        );

        const detail = await fetchProductDetail(url);
        if (!detail) continue;

        ports.push(transformPort(detail));
    }

    console.log("\n");

    // ---- Phase 3: Assemble output ----------------------------------------

    const housingMounts = collectHousingMounts(housings, ports);

    const cameraSet = new Set(
        housings
            .filter((h) => h.cameraName && h.cameraBrand)
            .map((h) => `${h.cameraBrand}|${h.cameraName}`)
    );

    console.log(`  Housings scraped     : ${housings.length}`);
    console.log(`  Ports scraped        : ${ports.length}`);
    console.log(`  Housing mounts found : ${housingMounts.length}`);
    console.log(`  Unique cameras found : ${cameraSet.size}`);

    const unmapped = housings.filter((h) => !h.cameraName).map((h) => h.name);
    if (unmapped.length > 0) {
        console.log(
            `\n  ⚠  Housings with no camera match (${unmapped.length}):`
        );
        for (const name of unmapped) console.log(`       ${name}`);
    }

    const result: ScraperOutput = {
        scrapedAt: new Date().toISOString(),
        sourceBaseUrl: BASE_URL,
        _notes: [
            "Prices are in USD as shown on the Sea Frogs website.",
            "housingMount / portSize fields reference HousingMount.name (e.g. 'SF125').",
            "cameraName / cameraBrand are string hints; DB IDs must be resolved during seeding.",
            "depthRating is in metres (0 = unknown).",
            "description is empty — Sea Frogs product pages contain image-only descriptions.",
        ],
        manufacturer: { name: "Sea Frogs", slug: "seafrogs" },
        housingMounts,
        housings,
        ports,
    };

    writeFileSync(output, JSON.stringify(result, null, 2), "utf-8");
    console.log(`\n✅  Saved to ${output}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
