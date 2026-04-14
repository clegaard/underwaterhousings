/**
 * Scrape Nauticam housings and ports from the Shopify JSON API.
 *
 * Nauticam's website is a Shopify store, so product data is available via
 * the public /collections/<collection>/products.json endpoint — no browser
 * rendering or HTML scraping of listing pages required.
 *
 * The body_html field on each product contains an HTML table of technical
 * specifications which is parsed with lightweight regex.
 *
 * Output:
 *   A single JSON file whose structure mirrors the Prisma schema so that
 *   it can be loaded and ingested by prisma/seed.ts or any custom seeder.
 *
 * Usage:
 *   npx tsx automations/scrape_nauticam.ts
 *   npx tsx automations/scrape_nauticam.ts --output my_output.json
 *   npx tsx automations/scrape_nauticam.ts --delay 1.0
 */

import { writeFileSync } from "fs";
import * as https from "https";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL = "https://www.nauticam.com";
const DEFAULT_OUTPUT = "automations/nauticam_scraped.json";
const DEFAULT_DELAY_MS = 500;
const MAX_PRODUCTS_PER_PAGE = 250;

const REQUEST_HEADERS = {
    "User-Agent":
        "Mozilla/5.0 (compatible; NauticamScraper/1.0; +https://github.com/underwaterhousings)",
    Accept: "application/json",
    // Force USD pricing — without this Shopify returns geo-IP local currency (e.g. IDR)
    Cookie: "cart_currency=USD",
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ShopifyVariant {
    sku: string;
    price: string;
}

interface ShopifyImage {
    src: string;
}

interface ShopifyProduct {
    title: string;
    handle: string;
    body_html: string | null;
    variants: ShopifyVariant[];
    images: ShopifyImage[];
}

interface ShopifyProductsResponse {
    products: ShopifyProduct[];
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

interface ScrapedExtensionRing {
    name: string;
    slug: string;
    sku: string;
    description: string;
    priceAmount: number | null;
    priceCurrency: string;
    lengthMm: number | null;
    housingMount: string | null;
    productPhotos: string[];
    sourceUrl: string;
}

interface ScrapedPortAdapter {
    name: string;
    slug: string;
    sku: string;
    description: string;
    priceAmount: number | null;
    priceCurrency: string;
    inputHousingMount: string | null;
    outputHousingMount: string | null;
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
    extensionRings: ScrapedExtensionRing[];
    portAdapters: ScrapedPortAdapter[];
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
    { brandName: "OM System", pattern: /\bfor\s+(?:Olympus\s+|OM\s+System\s+|OM-System\s+)(.+?)(?:\s+Camera)?\s*$/i },
    { brandName: "RED", pattern: /\bfor\s+RED[®™]?\s+(.+?)(?:\s+Camera)?\s*$/i },
    { brandName: "Insta360", pattern: /(?:\bfor\s+Insta360\s+|^Insta360\s+)(.+?)(?:\s+Housing|\s+Camera)?\s*$/i },
    { brandName: "Atomos", pattern: /\bfor\s+Atomos\s+(.+?)(?:\s+(?:Camera|Monitor|Recorder))?\s*$/i },
    { brandName: "SmallHD", pattern: /\bfor\s+SmallHD\s+(.+?)(?:\s+(?:Camera|Monitor))?\s*$/i },
    { brandName: "Blackmagic Design", pattern: /\bfor\s+(?:Blackmagic\s+|BMPCC\s*)(.+?)(?:\s+Camera)?\s*$/i },
    { brandName: "ARRI", pattern: /(?:\bfor\s+ARRI\s+|^ARRI\s+)(.+?)(?:\s+Camera)?\s*(?:~.*)?$/i },
    { brandName: "Z CAM", pattern: /\bfor\s+Z\s*CAM\s+(.+?)(?:\s+Cinema\s+Camera|\s+Camera)?\s*$/i },
    { brandName: "Hasselblad", pattern: /\bfor\s+Hasselblad\s+(.+?)\s*(?:system|Camera)?\s*$/i },
    // Sony RX-series without explicit brand prefix (e.g. "for RX100V")
    { brandName: "Sony", pattern: /\bfor\s+(RX\d+\w*)\b/i },
    // Apple iPhone (e.g. "for iPhone6")
    { brandName: "Apple", pattern: /\bfor\s+(iPhone\s*\w+)\b/i },
];

function extractCameraInfo(title: string): { brandName: string | null; cameraName: string | null } {
    // Nauticam housings are named "NA-{CameraCode} Housing for {Brand} …"
    // Using the product code (e.g. "NA-α1II") is more precise than parsing the
    // "for …" suffix because housings sometimes list multiple cameras there
    // (e.g. "NA-α1II Housing for Sony a1II and a9III Camera").
    const naCodeMatch = /^NA-([^\s(]+)/i.exec(title);
    if (naCodeMatch) {
        const modelFromCode = naCodeMatch[1]; // e.g. "α1II", "A7V", "R6III"
        for (const { brandName, pattern } of CAMERA_BRAND_PATTERNS) {
            if (pattern.test(title)) {
                return { brandName, cameraName: modelFromCode };
            }
        }
    }

    // Fall back to parsing "for Brand Model" from the title suffix.
    for (const { brandName, pattern } of CAMERA_BRAND_PATTERNS) {
        const m = pattern.exec(title);
        if (m) {
            let model = m[1].trim();
            model = model.replace(/\s+(Digital\s+)?Camera$/i, "").trim();
            return { brandName, cameraName: model };
        }
    }
    return { brandName: null, cameraName: null };
}

// ---------------------------------------------------------------------------
// HTML parsing helpers (regex-based, no extra deps)
// ---------------------------------------------------------------------------

/** Decode common HTML entities. */
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

/** Strip all HTML tags from a string. */
function stripTags(html: string): string {
    return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/**
 * Extract key→value pairs from all two-column HTML tables in body_html.
 * Returns a map with lower-cased, trimmed keys.
 */
function parseSpecTable(bodyHtml: string): Map<string, string> {
    const specs = new Map<string, string>();
    if (!bodyHtml) return specs;

    const tablePattern = /<table[\s\S]*?<\/table>/gi;
    const rowPattern = /<tr[\s\S]*?<\/tr>/gi;
    const cellPattern = /<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi;

    let tableMatch: RegExpExecArray | null;
    while ((tableMatch = tablePattern.exec(bodyHtml)) !== null) {
        const tableHtml = tableMatch[0];
        let rowMatch: RegExpExecArray | null;
        while ((rowMatch = rowPattern.exec(tableHtml)) !== null) {
            const cells: string[] = [];
            let cellMatch: RegExpExecArray | null;
            const cellRe = new RegExp(cellPattern.source, "gi");
            while ((cellMatch = cellRe.exec(rowMatch[0])) !== null) {
                cells.push(decodeEntities(stripTags(cellMatch[1])));
            }
            if (cells.length >= 2 && cells[0] && cells[1]) {
                specs.set(cells[0].toLowerCase().trim(), cells[1].trim());
            }
        }
    }
    return specs;
}

/**
 * Return a plain-text description from body_html.
 * Picks the first substantial paragraph (>40 chars), stripped of tables.
 */
function extractDescription(bodyHtml: string): string {
    if (!bodyHtml) return "";

    // Remove tables, scripts, styles
    const cleaned = bodyHtml
        .replace(/<table[\s\S]*?<\/table>/gi, "")
        .replace(/<script[\s\S]*?<\/script>/gi, "")
        .replace(/<style[\s\S]*?<\/style>/gi, "");

    const paraPattern = /<p[^>]*>([\s\S]*?)<\/p>/gi;
    let m: RegExpExecArray | null;
    while ((m = paraPattern.exec(cleaned)) !== null) {
        const text = decodeEntities(stripTags(m[1]));
        if (text.length > 40) {
            return text.slice(0, 1000);
        }
    }

    return decodeEntities(stripTags(cleaned)).slice(0, 1000);
}

function parseDepthRating(raw: string): number | null {
    if (!raw) return null;
    const upper = raw.trim().toUpperCase();
    if (upper === "TBA" || upper === "N/A") return null;
    const m = /(\d+)/.exec(raw);
    return m ? parseInt(m[1], 10) : null;
}

function parsePortDiameter(raw: string): number | null {
    if (!raw) return null;
    // millimetres
    const mmMatch = /([\d.]+)\s*mm/i.exec(raw);
    if (mmMatch) return parseFloat(mmMatch[1]);
    // inches → mm
    const inchMatch = /([\d.]+)\s*["'′]/.exec(raw);
    if (inchMatch) return Math.round(parseFloat(inchMatch[1]) * 25.4 * 10) / 10;
    return null;
}

function isFlatPort(name: string): boolean {
    const lower = name.toLowerCase();
    const flatKeywords = ["flat port", "macro port", "extension ring", "extension tube"];
    const domeKeywords = ["dome port", "wide-angle", "wide angle", "fisheye"];
    for (const kw of flatKeywords) if (lower.includes(kw)) return true;
    for (const kw of domeKeywords) if (lower.includes(kw)) return false;
    return true; // default: flat
}

// ---------------------------------------------------------------------------
// Port-type classification helpers
// ---------------------------------------------------------------------------

type PortKind = "port" | "extensionRing" | "portAdapter";

function classifyPortProduct(title: string): PortKind {
    const lower = title.toLowerCase();
    if (lower.includes("extension ring") || lower.includes("extension tube")) {
        return "extensionRing";
    }
    if (lower.includes("adapter") || lower.includes("adaptor")) {
        // Dome/flat ports that mention an adapter in their description are still ports
        const isActualPort = lower.includes("dome port") || lower.includes("flat port") || lower.includes("wide-angle") || lower.includes("wide angle");
        if (!isActualPort) return "portAdapter";
    }
    return "port";
}

/** Extract extension ring length from the product name, e.g. "N120 Extension Ring 50" → 50 */
function extractExtensionRingLength(name: string): number | null {
    const m = /extension\s+(?:ring|tube)\s+(\d+)/i.exec(name);
    return m ? parseInt(m[1], 10) : null;
}

/** Parse "N85 to N120" or "N100 to N200" from an adapter product name. */
function extractAdapterMounts(name: string): { inputMount: string | null; outputMount: string | null } {
    const m = /(N\d+)\s+to\s+(N\d+)/i.exec(name);
    if (m) return { inputMount: m[1].toUpperCase(), outputMount: m[2].toUpperCase() };
    return { inputMount: null, outputMount: null };
}

// ---------------------------------------------------------------------------
// Slug helper
// ---------------------------------------------------------------------------

function slugify(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// Fetching
// ---------------------------------------------------------------------------

async function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch a URL and parse the response body as JSON.
 * Uses Node's https.request instead of the global fetch() because Node's
 * fetch (undici) silently strips the Cookie header per the browser Fetch spec,
 * preventing the cart_currency=USD cookie from reaching Shopify.
 */
function fetchJson<T>(url: string): Promise<T> {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const options = {
            hostname: parsed.hostname,
            path: parsed.pathname + parsed.search,
            method: "GET",
            headers: REQUEST_HEADERS,
        };
        const req = https.request(options, (res) => {
            const chunks: Buffer[] = [];
            res.on("data", (chunk: Buffer) => chunks.push(chunk));
            res.on("end", () => {
                const body = Buffer.concat(chunks).toString("utf-8");
                if ((res.statusCode ?? 0) >= 400) {
                    reject(new Error(`HTTP ${res.statusCode} – ${url}`));
                    return;
                }
                try {
                    resolve(JSON.parse(body) as T);
                } catch (e) {
                    reject(e);
                }
            });
        });
        req.on("error", reject);
        req.end();
    });
}

async function fetchCollectionProducts(
    collection: string,
    delayMs: number
): Promise<ShopifyProduct[]> {
    const all: ShopifyProduct[] = [];
    let page = 1;

    while (true) {
        const url = `${BASE_URL}/collections/${collection}/products.json?limit=${MAX_PRODUCTS_PER_PAGE}&page=${page}`;
        console.log(`  Fetching page ${page}: ${url}`);

        let data: ShopifyProductsResponse;
        try {
            data = await fetchJson<ShopifyProductsResponse>(url);
        } catch (err) {
            console.warn(`  WARNING: request failed – ${err}`);
            break;
        }

        const products = data.products ?? [];
        if (products.length === 0) break;

        all.push(...products);
        console.log(`  Got ${products.length} products (total ${all.length})`);

        if (products.length < MAX_PRODUCTS_PER_PAGE) break;
        page++;
        await sleep(delayMs);
    }

    return all;
}

// ---------------------------------------------------------------------------
// Transformations
// ---------------------------------------------------------------------------

function transformHousing(product: ShopifyProduct): ScrapedHousing {
    const { title, handle, body_html, variants, images } = product;
    const bodyHtml = body_html ?? "";
    const specs = parseSpecTable(bodyHtml);

    const sku = variants[0]?.sku ?? "";
    const priceAmount = variants[0]?.price ? parseFloat(variants[0].price) : null;

    const depthRaw = specs.get("depth rating") ?? specs.get("depth rating ") ?? "";
    const depthRating = parseDepthRating(depthRaw) ?? 100; // Nauticam default

    // Older products use "Port Opening"; newer products use "Port Mount".
    // Treat "N/A" literally in the spec table as no port mount.
    const portMountRaw = (specs.get("port mount") ?? specs.get("port opening"))?.trim() ?? "";
    const portMount = (portMountRaw && portMountRaw.toUpperCase() !== "N/A") ? portMountRaw : null;

    const materialRaw = specs.get("body material") ?? "Anodized Aluminum Alloy";
    const material = /aluminum/i.test(materialRaw) ? "Aluminum" : materialRaw;

    const { brandName: cameraBrand, cameraName } = extractCameraInfo(title);
    const photos = images.map((img) => img.src).filter(Boolean);
    const description = extractDescription(bodyHtml);

    return {
        name: title,
        slug: handle,
        sku,
        description,
        priceAmount,
        priceCurrency: "USD",
        depthRating,
        material,
        housingMount: portMount,
        cameraName,
        cameraBrand,
        interchangeablePort: portMount !== null,
        productPhotos: photos,
        sourceUrl: `${BASE_URL}/collections/housings/products/${handle}`,
    };
}

function transformPort(product: ShopifyProduct): ScrapedPort {
    const { title, handle, body_html, variants, images } = product;
    const bodyHtml = body_html ?? "";
    const specs = parseSpecTable(bodyHtml);

    const sku = variants[0]?.sku ?? "";
    const priceAmount = variants[0]?.price ? parseFloat(variants[0].price) : null;

    const portSystem = specs.get("port system")?.trim() || null;

    const depthRaw = specs.get("depth rating") ?? specs.get("depth rating ") ?? "";
    const depthRating = parseDepthRating(depthRaw);

    const flat = isFlatPort(title);

    const diameterRaw = specs.get("port diameter") ?? "";
    const hemisphereWidth = !flat ? parsePortDiameter(diameterRaw) : null;

    const photos = images.map((img) => img.src).filter(Boolean);
    const description = extractDescription(bodyHtml);

    return {
        name: title,
        slug: handle,
        sku,
        description,
        priceAmount,
        priceCurrency: "USD",
        depthRating,
        isFlatPort: flat,
        hemisphereWidth,
        housingMount: portSystem,
        productPhotos: photos,
        sourceUrl: `${BASE_URL}/collections/ports/products/${handle}`,
    };
}

function transformExtensionRing(product: ShopifyProduct): ScrapedExtensionRing {
    const { title, handle, body_html, variants, images } = product;
    const bodyHtml = body_html ?? "";
    const specs = parseSpecTable(bodyHtml);

    const sku = variants[0]?.sku ?? "";
    const priceAmount = variants[0]?.price ? parseFloat(variants[0].price) : null;
    const portSystem = specs.get("port system")?.trim() || null;
    const photos = images.map((img) => img.src).filter(Boolean);
    const description = extractDescription(bodyHtml);

    return {
        name: title,
        slug: handle,
        sku,
        description,
        priceAmount,
        priceCurrency: "USD",
        lengthMm: extractExtensionRingLength(title),
        housingMount: portSystem,
        productPhotos: photos,
        sourceUrl: `${BASE_URL}/collections/ports/products/${handle}`,
    };
}

function transformPortAdapter(product: ShopifyProduct): ScrapedPortAdapter {
    const { title, handle, body_html, variants, images } = product;
    const bodyHtml = body_html ?? "";
    const specs = parseSpecTable(bodyHtml);

    const sku = variants[0]?.sku ?? "";
    const priceAmount = variants[0]?.price ? parseFloat(variants[0].price) : null;
    const portSystem = specs.get("port system")?.trim() || null;
    const photos = images.map((img) => img.src).filter(Boolean);
    const description = extractDescription(bodyHtml);

    const { inputMount, outputMount } = extractAdapterMounts(title);

    return {
        name: title,
        slug: handle,
        sku,
        description,
        priceAmount,
        priceCurrency: "USD",
        // Prefer parsed mounts from name; fall back to portSystem for input
        inputHousingMount: inputMount ?? portSystem,
        outputHousingMount: outputMount,
        productPhotos: photos,
        sourceUrl: `${BASE_URL}/collections/ports/products/${handle}`,
    };
}

// ---------------------------------------------------------------------------
// Collect unique housing mounts
// ---------------------------------------------------------------------------

function collectHousingMounts(
    housings: ScrapedHousing[],
    ports: ScrapedPort[],
    extensionRings: ScrapedExtensionRing[],
    portAdapters: ScrapedPortAdapter[],
): HousingMount[] {
    const seen = new Set<string>();
    const mounts: HousingMount[] = [];

    const allMountNames: Array<string | null> = [
        ...housings.map((h) => h.housingMount),
        ...ports.map((p) => p.housingMount),
        ...extensionRings.map((r) => r.housingMount),
        ...portAdapters.map((a) => a.inputHousingMount),
        ...portAdapters.map((a) => a.outputHousingMount),
    ];

    for (const name of allMountNames) {
        if (name && !seen.has(name)) {
            seen.add(name);
            mounts.push({ name, slug: slugify(name), manufacturer: "Nauticam" });
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

    console.log("=== Nauticam scraper ===");
    console.log(`Output: ${output}`);
    console.log(`Request delay: ${delayMs / 1000}s`);
    console.log();

    console.log("Fetching housings …");
    const rawHousings = await fetchCollectionProducts("housings", delayMs);
    console.log(`  Total raw housing products: ${rawHousings.length}`);
    const housings = rawHousings.map(transformHousing);

    await sleep(delayMs);

    console.log("Fetching ports …");
    const rawPorts = await fetchCollectionProducts("ports", delayMs);
    console.log(`  Total raw port products: ${rawPorts.length}`);
    const ports: ScrapedPort[] = [];
    const extensionRings: ScrapedExtensionRing[] = [];
    const portAdapters: ScrapedPortAdapter[] = [];
    for (const p of rawPorts) {
        const kind = classifyPortProduct(p.title);
        if (kind === "extensionRing") extensionRings.push(transformExtensionRing(p));
        else if (kind === "portAdapter") portAdapters.push(transformPortAdapter(p));
        else ports.push(transformPort(p));
    }

    const housingMounts = collectHousingMounts(housings, ports, extensionRings, portAdapters);

    const cameraSet = new Set(
        housings
            .filter((h) => h.cameraName && h.cameraBrand)
            .map((h) => `${h.cameraBrand}|${h.cameraName}`)
    );

    console.log();
    console.log(`  Housings scraped      : ${housings.length}`);
    console.log(`  Ports scraped         : ${ports.length}`);
    console.log(`  Extension rings       : ${extensionRings.length}`);
    console.log(`  Port adapters         : ${portAdapters.length}`);
    console.log(`  Housing mounts found  : ${housingMounts.length}`);
    console.log(`  Unique cameras found  : ${cameraSet.size}`);

    const unmapped = housings.filter((h) => !h.cameraName).map((h) => h.name);
    if (unmapped.length > 0) {
        console.log(`\n  ⚠  Housings with no camera match (${unmapped.length}):`);
        for (const name of unmapped) console.log(`       ${name}`);
    }

    const result: ScraperOutput = {
        scrapedAt: new Date().toISOString(),
        sourceBaseUrl: BASE_URL,
        _notes: [
            "Prices are in USD (fetched via Shopify products.json from a US IP; geo-based pricing).",
            "housingMount / portSystem fields are string references to HousingMount.name.",
            "cameraName / cameraBrand are string hints; exact DB IDs must be resolved during seeding.",
            "depthRating is in metres.",
            "extensionRings.lengthMm is the ring length in millimetres.",
            "portAdapters.inputHousingMount is the housing-side mount; outputHousingMount is the port-side mount.",
        ],
        manufacturer: { name: "Nauticam", slug: "nauticam" },
        housingMounts,
        housings,
        ports,
        extensionRings,
        portAdapters,
    };

    writeFileSync(output, JSON.stringify(result, null, 2), "utf-8");
    console.log(`\n✅  Saved to ${output}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
