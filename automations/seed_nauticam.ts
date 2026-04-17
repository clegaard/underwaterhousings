/**
 * Seed the database with Nauticam housings and ports from nauticam_scraped.json.
 *
 * This script is additive and idempotent: it uses upsert on all entities so it
 * can be re-run safely without duplicating or wiping existing data.
 *
 * What it creates / updates:
 *   - Nauticam manufacturer record
 *   - HousingMount records (N100, N120, N200, N85, N50, etc.)
 *   - Camera manufacturer records (Sony, Canon, Nikon, …)
 *   - Camera records (one per unique brand+model in the data)
 *   - Housing records (skipped when no camera match is available)
 *   - Port records
 *
 * Image uploading (when S3_ENDPOINT / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY are set):
 *   - Downloads each product photo from the Shopify CDN
 *   - Uploads to S3 under housings/nauticam/{slug}/{n}.{ext} or ports/nauticam/{slug}/{n}.{ext}
 *   - Skips objects already present in S3 (idempotent re-runs don't re-download)
 *   - productPhotos in the DB is updated to the storage key path
 *
 * Without S3 configured the script falls back to storing the original CDN URLs.
 *
 * Usage:
 *   npx tsx automations/seed_nauticam.ts
 *   npx tsx automations/seed_nauticam.ts --input automations/nauticam_scraped.json
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { S3Client, PutObjectCommand, HeadObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// S3 setup
// ---------------------------------------------------------------------------

const s3Configured = !!(
    process.env.S3_ENDPOINT &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY
);

const s3 = s3Configured
    ? new S3Client({
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION ?? "us-east-1",
        credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID!,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
        },
        forcePathStyle: true,
    })
    : null;

const S3_BUCKET = process.env.S3_BUCKET ?? "underwaterhousings";

const CONTENT_TYPES: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".avif": "image/avif",
};

// ---------------------------------------------------------------------------
// Image download + upload helpers
// ---------------------------------------------------------------------------

/** Download a remote URL and return its bytes. Follows up to 3 redirects. */
function downloadUrl(url: string, redirectsLeft = 3): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith("https") ? https : http;
        lib.get(url, { headers: { "User-Agent": "NauticamSeeder/1.0" } }, (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                if (redirectsLeft === 0) return reject(new Error(`Too many redirects: ${url}`));
                return resolve(downloadUrl(res.headers.location, redirectsLeft - 1));
            }
            if (res.statusCode && res.statusCode >= 400) {
                return reject(new Error(`HTTP ${res.statusCode} fetching ${url}`));
            }
            const chunks: Buffer[] = [];
            res.on("data", (c: Buffer) => chunks.push(c));
            res.on("end", () => resolve(Buffer.concat(chunks)));
            res.on("error", reject);
        }).on("error", reject);
    });
}

/** Returns true if a key already exists in S3 (skip re-upload). */
async function s3KeyExists(key: string): Promise<boolean> {
    if (!s3) return false;
    try {
        await s3.send(new HeadObjectCommand({ Bucket: S3_BUCKET, Key: key }));
        return true;
    } catch {
        return false;
    }
}

/**
 * Derive the file extension from a URL, stripping query parameters.
 * Falls back to ".jpg".
 */
function extFromUrl(url: string): string {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname).toLowerCase();
    return CONTENT_TYPES[ext] ? ext : ".jpg";
}

/**
 * Download all photos for a product and upload them to S3.
 * Returns the list of storage keys to store in productPhotos.
 * If S3 is not configured returns the original URLs unchanged.
 */
async function uploadProductPhotos(
    remoteUrls: string[],
    storagePrefix: string,   // e.g. "housings/nauticam/na-a7v-..."
): Promise<string[]> {
    if (!s3 || remoteUrls.length === 0) return remoteUrls;

    const keys: string[] = [];
    for (let i = 0; i < remoteUrls.length; i++) {
        const url = remoteUrls[i];
        const ext = extFromUrl(url);
        const key = `${storagePrefix}/${i + 1}${ext}`;

        if (await s3KeyExists(key)) {
            process.stdout.write("·");
        } else {
            try {
                const body = await downloadUrl(url);
                const contentType = CONTENT_TYPES[ext] ?? "image/jpeg";
                await s3.send(new PutObjectCommand({ Bucket: S3_BUCKET, Key: key, Body: body, ContentType: contentType }));
                process.stdout.write("↑");
            } catch (err) {
                console.warn(`\n  ⚠ Failed to upload ${url}: ${err}`);
                keys.push(url); // fall back to original URL for this photo
                continue;
            }
        }
        keys.push(key);
    }
    return keys;
}

// ---------------------------------------------------------------------------
// Types mirroring nauticam_scraped.json
// ---------------------------------------------------------------------------

interface ScrapedMount {
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

interface ScrapedGear {
    name: string;
    slug: string;
    sku: string;
    description: string;
    priceAmount: number | null;
    priceCurrency: string;
    productPhotos: string[];
    lensHints: string[];
    sourceUrl: string;
}

interface ScrapedPortChartEntry {
    /** Lens name as extracted from the port product name. Used for fuzzy DB matching. */
    lensHint: string;
    /** Slug of the compatible Nauticam port. */
    portSlug: string;
    /** Housing restriction notes extracted from the port name, if any. */
    notes: string | null;
}

interface ScraperOutput {
    manufacturer: { name: string; slug: string };
    housingMounts: ScrapedMount[];
    housings: ScrapedHousing[];
    ports: ScrapedPort[];
    extensionRings: ScrapedExtensionRing[];
    portAdapters: ScrapedPortAdapter[];
    gears?: ScrapedGear[];
    portChartEntries?: ScrapedPortChartEntry[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate a URL-safe slug, stripping non-ASCII characters (e.g. Greek α, ™)
 * so we always produce a valid, ASCII-only identifier.
 */
function toSlug(s: string): string {
    return s
        .normalize("NFKD")
        .replace(/[^\x00-\x7F]/g, "") // drop non-ASCII
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

/** Produce a collision-safe camera slug by combining brand + model. */
function cameraSlug(brand: string, model: string): string {
    return `${toSlug(brand)}-${toSlug(model)}`.replace(/-+/g, "-").replace(/^-+|-+$/g, "");
}

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs(): { input: string } {
    const args = process.argv.slice(2);
    let input = path.join(process.cwd(), "automations", "nauticam_scraped.json");
    for (let i = 0; i < args.length; i++) {
        if (args[i] === "--input" && args[i + 1]) input = args[++i];
    }
    return { input };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
    const { input } = parseArgs();

    if (!fs.existsSync(input)) {
        console.error(`❌ Input file not found: ${input}`);
        process.exit(1);
    }

    const data: ScraperOutput = JSON.parse(fs.readFileSync(input, "utf-8"));
    console.log("=== Nauticam seeder ===");
    console.log(`Input: ${input}`);
    console.log(`  ${data.housingMounts.length} housing mounts`);
    console.log(`  ${data.housings.length} housings`);
    console.log(`  ${data.ports.length} ports`);
    console.log(`  ${(data.extensionRings ?? []).length} extension rings`);
    console.log(`  ${(data.portAdapters ?? []).length} port adapters`);
    console.log(`  ${(data.gears ?? []).length} gears`);
    console.log(`  ${(data.portChartEntries ?? []).length} port chart entries`);

    if (s3Configured) {
        console.log("  S3 configured ✅ — product photos will be downloaded and uploaded");
        // Verify S3 is reachable before spending time on DB work
        const abort = new AbortController();
        const timer = setTimeout(() => abort.abort(), 5000);
        try {
            await s3!.send(new HeadBucketCommand({ Bucket: S3_BUCKET }), { abortSignal: abort.signal });
        } catch {
            throw new Error("S3 is not reachable. Is MinIO running? Try: docker compose up -d");
        } finally {
            clearTimeout(timer);
        }
    } else {
        console.log("  S3 not configured ⚠  — original CDN URLs will be stored instead");
    }
    console.log();

    // ------------------------------------------------------------------
    // 1. Upsert Nauticam manufacturer
    // ------------------------------------------------------------------
    const nauticam = await prisma.manufacturer.upsert({
        where: { slug: "nauticam" },
        update: {},
        create: {
            name: "Nauticam",
            slug: "nauticam",
            description: "Premium underwater housings and accessories for professional photography",
            logoPath: "/manufacturers/nauticam.avif",
        },
    });
    console.log(`✅ Manufacturer: ${nauticam.name} (id=${nauticam.id})`);

    // ------------------------------------------------------------------
    // 2. Upsert housing mounts
    // ------------------------------------------------------------------
    const mountMap = new Map<string, number>(); // mount name → DB id
    for (const m of data.housingMounts) {
        const record = await prisma.housingMount.upsert({
            where: { slug: m.slug },
            update: { name: m.name },
            create: {
                name: m.name,
                slug: m.slug,
                manufacturerId: nauticam.id,
            },
        });
        mountMap.set(m.name, record.id);
    }
    console.log(`✅ Housing mounts: ${mountMap.size} upserted`);

    // ------------------------------------------------------------------
    // 3. Upsert camera manufacturers (Sony, Canon, Nikon, …)
    // ------------------------------------------------------------------
    const cameraBrands = [
        ...new Set(
            data.housings
                .filter((h) => h.cameraBrand)
                .map((h) => h.cameraBrand as string),
        ),
    ];

    const brandManufacturerMap = new Map<string, number>(); // brandName → DB manufacturer id
    for (const brand of cameraBrands) {
        const slug = toSlug(brand);
        const mfr = await prisma.manufacturer.upsert({
            where: { slug },
            update: {},
            create: { name: brand, slug },
        });
        brandManufacturerMap.set(brand, mfr.id);
    }
    console.log(`✅ Camera manufacturers: ${brandManufacturerMap.size} upserted`);

    // ------------------------------------------------------------------
    // 4. Upsert cameras (one per unique brand + model)
    // ------------------------------------------------------------------
    const uniqueCameraKeys = [
        ...new Set(
            data.housings
                .filter((h) => h.cameraBrand && h.cameraName)
                .map((h) => `${h.cameraBrand}|${h.cameraName}`),
        ),
    ];

    const cameraIdMap = new Map<string, number>(); // "brand|model" → DB camera id
    for (const key of uniqueCameraKeys) {
        const [brand, model] = key.split("|");
        const manufacturerId = brandManufacturerMap.get(brand)!;

        // Prefer an existing camera matched by manufacturer + name
        let camera = await prisma.camera.findFirst({
            where: { manufacturerId, name: model },
        });

        if (!camera) {
            // Create a new camera record; use brand-model slug for safety
            const slug = cameraSlug(brand, model);
            // If that slug is already taken by a different manufacturer, suffix with id placeholder
            const taken = await prisma.camera.findUnique({ where: { slug } });
            const finalSlug = taken && taken.manufacturerId !== manufacturerId
                ? `${slug}-${toSlug(brand)}`
                : slug;

            camera = await prisma.camera.create({
                data: { name: model, slug: finalSlug, manufacturerId },
            });
        }

        cameraIdMap.set(key, camera.id);
    }
    console.log(`✅ Cameras: ${cameraIdMap.size} upserted/found`);

    // ------------------------------------------------------------------
    // 5. Upsert housings
    // ------------------------------------------------------------------
    let housingOk = 0;
    let housingSkipped = 0;

    for (const h of data.housings) {
        const key = `${h.cameraBrand}|${h.cameraName}`;
        const cameraId = (h.cameraBrand && h.cameraName) ? cameraIdMap.get(key) : undefined;

        if (!cameraId) {
            console.warn(`  ⚠ Skipping housing (no camera): ${h.name}`);
            housingSkipped++;
            continue;
        }

        const housingMountId =
            h.housingMount && mountMap.has(h.housingMount)
                ? mountMap.get(h.housingMount)!
                : null;

        if (h.housingMount && !mountMap.has(h.housingMount)) {
            console.warn(`  ⚠ Unknown mount "${h.housingMount}" for: ${h.name}`);
        }

        process.stdout.write(`  Uploading photos for ${h.slug} `);
        const productPhotos = await uploadProductPhotos(
            h.productPhotos,
            `housings/nauticam/${h.slug}`,
        );
        process.stdout.write(" ✓\n");

        await prisma.housing.upsert({
            where: { slug: h.slug },
            update: {
                name: h.name,
                description: h.description || null,
                priceAmount: h.priceAmount,
                priceCurrency: h.priceCurrency,
                depthRating: h.depthRating,
                material: h.material || null,
                cameraId,
                housingMountId,
                interchangeablePort: h.interchangeablePort,
                productPhotos,
            },
            create: {
                name: h.name,
                slug: h.slug,
                description: h.description || null,
                priceAmount: h.priceAmount,
                priceCurrency: h.priceCurrency,
                depthRating: h.depthRating,
                material: h.material || null,
                manufacturerId: nauticam.id,
                cameraId,
                housingMountId,
                interchangeablePort: h.interchangeablePort,
                productPhotos,
            },
        });
        housingOk++;
    }

    console.log(`✅ Housings: ${housingOk} upserted, ${housingSkipped} skipped`);

    // ------------------------------------------------------------------
    // 6. Upsert ports
    // ------------------------------------------------------------------
    let portOk = 0;

    for (const p of data.ports) {
        const housingMountId =
            p.housingMount && mountMap.has(p.housingMount)
                ? mountMap.get(p.housingMount)!
                : null;

        if (p.housingMount && !mountMap.has(p.housingMount)) {
            console.warn(`  ⚠ Unknown mount "${p.housingMount}" for port: ${p.name}`);
        }

        process.stdout.write(`  Uploading photos for ${p.slug} `);
        const productPhotos = await uploadProductPhotos(
            p.productPhotos,
            `ports/nauticam/${p.slug}`,
        );
        process.stdout.write(" ✓\n");

        await prisma.port.upsert({
            where: { slug: p.slug },
            update: {
                name: p.name,
                description: p.description || null,
                priceAmount: p.priceAmount,
                priceCurrency: p.priceCurrency,
                depthRating: p.depthRating,
                isFlatPort: p.isFlatPort,
                hemisphereWidth: p.hemisphereWidth,
                housingMountId,
                productPhotos,
            },
            create: {
                name: p.name,
                slug: p.slug,
                description: p.description || null,
                priceAmount: p.priceAmount,
                priceCurrency: p.priceCurrency,
                depthRating: p.depthRating,
                isFlatPort: p.isFlatPort,
                hemisphereWidth: p.hemisphereWidth,
                manufacturerId: nauticam.id,
                housingMountId,
                productPhotos,
            },
        });
        portOk++;
    }

    console.log(`✅ Ports: ${portOk} upserted`);

    // ------------------------------------------------------------------
    // 7. Upsert extension rings
    // ------------------------------------------------------------------
    let ringOk = 0;
    for (const r of (data.extensionRings ?? [])) {
        const housingMountId =
            r.housingMount && mountMap.has(r.housingMount)
                ? mountMap.get(r.housingMount)!
                : null;

        if (r.housingMount && !mountMap.has(r.housingMount)) {
            console.warn(`  ⚠ Unknown mount "${r.housingMount}" for extension ring: ${r.name}`);
        }

        process.stdout.write(`  Uploading photos for ${r.slug} `);
        const productPhotos = await uploadProductPhotos(
            r.productPhotos,
            `extension-rings/nauticam/${r.slug}`,
        );
        process.stdout.write(" ✓\n");

        await prisma.extensionRing.upsert({
            where: { slug: r.slug },
            update: {
                name: r.name,
                description: r.description || null,
                priceAmount: r.priceAmount,
                priceCurrency: r.priceCurrency,
                lengthMm: r.lengthMm,
                housingMountId,
                productPhotos,
            },
            create: {
                name: r.name,
                slug: r.slug,
                description: r.description || null,
                priceAmount: r.priceAmount,
                priceCurrency: r.priceCurrency,
                lengthMm: r.lengthMm,
                manufacturerId: nauticam.id,
                housingMountId,
                productPhotos,
            },
        });
        ringOk++;
    }
    console.log(`✅ Extension rings: ${ringOk} upserted`);

    // ------------------------------------------------------------------
    // 8. Upsert port adapters
    // ------------------------------------------------------------------
    let adapterOk = 0;
    for (const a of (data.portAdapters ?? [])) {
        const inputHousingMountId =
            a.inputHousingMount && mountMap.has(a.inputHousingMount)
                ? mountMap.get(a.inputHousingMount)!
                : null;
        const outputHousingMountId =
            a.outputHousingMount && mountMap.has(a.outputHousingMount)
                ? mountMap.get(a.outputHousingMount)!
                : null;

        process.stdout.write(`  Uploading photos for ${a.slug} `);
        const productPhotos = await uploadProductPhotos(
            a.productPhotos,
            `port-adapters/nauticam/${a.slug}`,
        );
        process.stdout.write(" ✓\n");

        await prisma.portAdapter.upsert({
            where: { slug: a.slug },
            update: {
                name: a.name,
                description: a.description || null,
                priceAmount: a.priceAmount,
                priceCurrency: a.priceCurrency,
                inputHousingMountId,
                outputHousingMountId,
                productPhotos,
            },
            create: {
                name: a.name,
                slug: a.slug,
                description: a.description || null,
                priceAmount: a.priceAmount,
                priceCurrency: a.priceCurrency,
                manufacturerId: nauticam.id,
                inputHousingMountId,
                outputHousingMountId,
                productPhotos,
            },
        });
        adapterOk++;
    }
    console.log(`✅ Port adapters: ${adapterOk} upserted`);

    // ------------------------------------------------------------------
    // 9. Upsert gears
    // ------------------------------------------------------------------
    const rawGears = data.gears ?? [];

    if (rawGears.length === 0) {
        console.log("ℹ Gears: none in scraped data");
    } else {
        // Build a normalised lens-name index for fuzzy matching
        const normaliseName = (s: string): string =>
            s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

        const allLenses = await prisma.lens.findMany({ select: { id: true, name: true } });
        const lensNormMap = new Map<string, number>();
        for (const l of allLenses) {
            lensNormMap.set(normaliseName(l.name), l.id);
        }

        let gearOk = 0;
        let gearNoLens = 0;

        for (const g of rawGears) {
            // Resolve lens IDs from hints using fuzzy matching
            const lensIds = new Set<number>();
            for (const hint of g.lensHints ?? []) {
                const normHint = normaliseName(hint);
                let lensId = lensNormMap.get(normHint);
                if (!lensId) {
                    for (const [normName, id] of Array.from(lensNormMap)) {
                        if (normName.includes(normHint) || normHint.includes(normName)) {
                            lensId = id;
                            break;
                        }
                    }
                }
                if (lensId) lensIds.add(lensId);
            }

            if (lensIds.size === 0) {
                gearNoLens++;
            }

            process.stdout.write(`  Uploading photos for ${g.slug} `);
            const productPhotos = await uploadProductPhotos(
                g.productPhotos,
                `gears/nauticam/${g.slug}`,
            );
            process.stdout.write(" ✓\n");

            const lensConnect = Array.from(lensIds).map(id => ({ id }));

            await prisma.gear.upsert({
                where: { slug: g.slug },
                update: {
                    name: g.name,
                    sku: g.sku || null,
                    description: g.description || null,
                    priceAmount: g.priceAmount,
                    priceCurrency: g.priceCurrency,
                    manufacturerId: nauticam.id,
                    productPhotos,
                    lenses: lensIds.size > 0 ? { set: lensConnect } : undefined,
                },
                create: {
                    name: g.name,
                    slug: g.slug,
                    sku: g.sku || null,
                    description: g.description || null,
                    priceAmount: g.priceAmount,
                    priceCurrency: g.priceCurrency,
                    manufacturerId: nauticam.id,
                    productPhotos,
                    lenses: lensIds.size > 0 ? { connect: lensConnect } : undefined,
                },
            });
            gearOk++;
        }
        console.log(`✅ Gears: ${gearOk} upserted (${gearNoLens} without a matching lens)`);
    }

    // ------------------------------------------------------------------
    // 10. Seed port chart entries
    //    Derived from port product names in the scraped data.
    //    Each entry represents a direct lens → port pairing with no
    //    intermediate steps (extension rings must be added via admin UI).
    //    Entries are matched to DB lenses by fuzzy name search and are
    //    skipped gracefully if no match is found.
    // ------------------------------------------------------------------
    const rawEntries = data.portChartEntries ?? [];

    if (rawEntries.length === 0) {
        console.log("ℹ Port chart entries: none in scraped data (re-run scraper to generate)");
    } else {
        // Build a normalised lens-name index: normalisedName → lens DB record
        // Normalise: lowercase, collapse whitespace, remove non-alphanumeric
        const normaliseName = (s: string): string =>
            s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

        const allLenses = await prisma.lens.findMany({ select: { id: true, name: true } });
        // Map from normalised name → lens id (keep first hit on collision)
        const lensNormMap = new Map<string, number>();
        for (const l of allLenses) {
            lensNormMap.set(normaliseName(l.name), l.id);
        }

        // Build a port slug → port id map
        const allPorts = await prisma.port.findMany({ select: { id: true, slug: true } });
        const portSlugMap = new Map(allPorts.map((p) => [p.slug, p.id]));

        let chartOk = 0;
        let chartSkippedNoLens = 0;
        let chartSkippedNoPort = 0;
        let chartSkippedDupe = 0;

        for (const entry of rawEntries) {
            const portId = portSlugMap.get(entry.portSlug);
            if (!portId) {
                chartSkippedNoPort++;
                continue;
            }

            // Fuzzy lens matching: try exact normalised match first, then
            // check whether the normalised hint is a substring of any lens name.
            const normHint = normaliseName(entry.lensHint);
            let lensId = lensNormMap.get(normHint);

            if (!lensId) {
                // Substring search: find the lens whose normalised name contains the hint
                for (const [normName, id] of Array.from(lensNormMap)) {
                    if (normName.includes(normHint) || normHint.includes(normName)) {
                        lensId = id;
                        break;
                    }
                }
            }

            if (!lensId) {
                console.warn(`  ⚠ Port chart: no lens match for hint "${entry.lensHint}" (port: ${entry.portSlug})`);
                chartSkippedNoLens++;
                continue;
            }

            // Check for an existing identical entry (idempotency)
            const existing = await prisma.portChartEntry.findFirst({
                where: { manufacturerId: nauticam.id, lensId, portId },
            });
            if (existing) {
                chartSkippedDupe++;
                continue;
            }

            await prisma.portChartEntry.create({
                data: {
                    manufacturerId: nauticam.id,
                    lensId,
                    portId,
                    notes: entry.notes ?? null,
                    // No steps — extension ring chains must be added via admin UI
                },
            });
            chartOk++;
        }

        console.log(
            `✅ Port chart entries: ${chartOk} created, ` +
            `${chartSkippedNoLens} skipped (no lens), ` +
            `${chartSkippedNoPort} skipped (no port), ` +
            `${chartSkippedDupe} skipped (duplicate)`,
        );
    }

    console.log("\n✅ Done.");
}

main()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
