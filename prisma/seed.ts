import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { S3Client, PutObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

const s3Configured = !!(
    process.env.S3_ENDPOINT &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY
)

const s3Client = s3Configured
    ? new S3Client({
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION ?? 'us-east-1',
        credentials: {
            accessKeyId: process.env.S3_ACCESS_KEY_ID!,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
        },
        forcePathStyle: true,
    })
    : null

const s3Bucket = process.env.S3_BUCKET ?? 'underwaterhousings'

const CONTENT_TYPES: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.png': 'image/png',
    '.avif': 'image/avif',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
}

function getSeedDataPaths(): string[] {
    const seedDataDir = path.join(process.cwd(), 'seed_data')
    const result: string[] = []
    const subdirs = fs.readdirSync(seedDataDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name)
    for (const subdir of subdirs) {
        const subdirPath = path.join(seedDataDir, subdir)
        const files = fs.readdirSync(subdirPath, { withFileTypes: true })
            .filter(f => f.isFile())
            .map(f => `/${subdir}/${f.name}`)
        result.push(...files)
    }
    return result
}

async function uploadSeedFile(relativePath: string): Promise<void> {
    if (!s3Client) return
    const filePath = path.join(process.cwd(), 'seed_data', relativePath)
    if (!fs.existsSync(filePath)) {
        console.log(`  ⚠️  Skipping ${relativePath} (file not found)`)
        return
    }
    const buffer = fs.readFileSync(filePath)
    const ext = path.extname(relativePath).toLowerCase()
    const contentType = CONTENT_TYPES[ext] ?? 'application/octet-stream'
    const key = relativePath.startsWith('/') ? relativePath.slice(1) : relativePath
    await s3Client.send(
        new PutObjectCommand({ Bucket: s3Bucket, Key: key, Body: buffer, ContentType: contentType })
    )
    console.log(`  📤 ${key}`)
}


async function main() {
    console.log('🌱 Seeding database...')

    // Upload all product and gallery images to S3 storage
    if (s3Configured) {
        console.log('� Checking S3 connectivity...')
        const abort = new AbortController()
        const timer = setTimeout(() => abort.abort(), 3000)
        try {
            await s3Client!.send(new HeadBucketCommand({ Bucket: s3Bucket }), { abortSignal: abort.signal })
        } catch {
            throw new Error('S3 is not reachable. Is MinIO running? Try: docker compose up -d')
        } finally {
            clearTimeout(timer)
        }
        console.log('📤 Uploading images to S3...')
        const imagePaths = getSeedDataPaths()
        for (const p of imagePaths) {
            await uploadSeedFile(p)
        }
        console.log('✅ Images uploaded!')
    } else {
        console.log('⚠️  S3 not configured, skipping image uploads')
    }

    // Clear existing data
    await prisma.galleryPhoto.deleteMany()
    await prisma.port.deleteMany()
    await prisma.housingMount.deleteMany()
    await prisma.housing.deleteMany()
    await prisma.camera.deleteMany()
    await prisma.lens.deleteMany()
    await prisma.cameraMount.deleteMany()
    await prisma.manufacturer.deleteMany()
    await prisma.rigReview.deleteMany()
    await prisma.user.deleteMany()

    // Create manufacturers
    const nauticam = await prisma.manufacturer.create({
        data: {
            name: 'Nauticam',
            slug: 'nauticam',
            description: 'Premium underwater housings for professional photography',
            logoPath: '/manufacturers/nauticam.avif',
        }
    })

    const seafrogs = await prisma.manufacturer.create({
        data: {
            name: 'SeaFrogs',
            slug: 'seafrogs',
            description: 'Affordable underwater housings for mirrorless and compact cameras',
            logoPath: '/manufacturers/seafrogs.jpg',
        }
    })

    const divevolk = await prisma.manufacturer.create({
        data: {
            name: 'DiveVolk',
            slug: 'divevolk',
            description: 'touch enabled smartphone cases',
            logoPath: '/manufacturers/divevolk.png',
        }
    })

    const sony = await prisma.manufacturer.create({
        data: {
            name: 'Sony',
            slug: 'sony',
            logoPath: '/manufacturers/sony.svg',
        }
    })

    const canon = await prisma.manufacturer.create({
        data: {
            name: 'Canon',
            slug: 'canon',
            logoPath: '/manufacturers/canon.svg',
        }
    })

    const nikon = await prisma.manufacturer.create({
        data: {
            name: 'Nikon',
            slug: 'nikon',
            logoPath: '/manufacturers/nikon.svg',
        }
    })

    const omSystem = await prisma.manufacturer.create({
        data: {
            name: 'OM System',
            slug: 'om-system',
        }
    })

    const apple = await prisma.manufacturer.create({
        data: {
            name: 'Apple',
            slug: 'apple',
            logoPath: '/manufacturers/apple.png',
        }
    })

    // Create a Sigma manufacturer for the Sigma lens
    const sigma = await prisma.manufacturer.create({
        data: {
            name: 'Sigma',
            slug: 'sigma',
            logoPath: '/manufacturers/sigma.svg',
        }
    })

    const sealife = await prisma.manufacturer.create({
        data: {
            name: 'SeaLife',
            slug: 'sealife',
            description: 'Underwater cameras and housings for recreational divers',
            logoPath: '/manufacturers/sealife.jpg',
        }
    })


    // ============================= CAMERA MOUNTS =============================

    // Create camera mounts based on common mount types
    const sonyE = await prisma.cameraMount.create({
        data: {
            name: 'Sony E-mount',
            slug: 'sony-e-mount'
        }

    })

    const canonRF = await prisma.cameraMount.create({
        data: {
            name: 'Canon RF mount',
            slug: 'canon-rf-mount'
        }
    })

    // ============================= CAMERAS =============================

    // Sony cameras
    const sonyZVE1 = await prisma.camera.create({
        data: {
            name: 'ZV-E1',
            slug: 'zv-e1',
            description: 'A content-creator-focused full-frame mirrorless camera with excellent video autofocus, AI background defocus, and vlog-optimised processing in a compact and lightweight body.',
            manufacturerId: sony.id,
            cameraMountId: sonyE.id,
            priceAmount: 2198,
            megapixels: 12.1,
            sensorWidth: 35.6,
            sensorHeight: 23.8,
        }
    })

    const sonyA7III = await prisma.camera.create({
        data: {
            name: 'A7 III',
            slug: 'a7-iii',
            description: "Sony's benchmark full-frame mirrorless camera featuring a 24.2 MP BSI-CMOS sensor, 693 phase-detect AF points, 10 fps continuous shooting, and class-leading low-light performance.",
            manufacturerId: sony.id,
            cameraMountId: sonyE.id,
            priceAmount: 1998,
            megapixels: 24.2,
            sensorWidth: 35.6,
            sensorHeight: 23.8,
        }
    })

    const sonyA7RV = await prisma.camera.create({
        data: {
            name: 'A7R V',
            slug: 'ilce-7rm5',
            description: "Sony's highest-resolution full-frame camera, packing a 61 MP sensor with a dedicated AI Processing Unit for advanced subject recognition and autofocus. Ideal for capturing fine underwater detail.",
            manufacturerId: sony.id,
            cameraMountId: sonyE.id,
            priceAmount: 3498,
            productPhotos: ['/cameras/ilce-7m5-front.webp'],
            megapixels: 61.0,
            sensorWidth: 35.9,
            sensorHeight: 24.0,
        }
    })

    const sonyA7IV = await prisma.camera.create({
        data: {
            name: 'A7 IV',
            slug: 'ilce-7m4',
            exifId: 'ILCE-7M4',
            description: "Sony's fourth-generation A7 full-frame hybrid featuring a 33 MP sensor, 4K 60p video, improved real-time tracking autofocus, and the BIONZ XR image processor.",
            manufacturerId: sony.id,
            cameraMountId: sonyE.id,
            priceAmount: 2498,
            productPhotos: ['/cameras/ilce-7m4-front.webp'],
            megapixels: 33.0,
            sensorWidth: 35.9,
            sensorHeight: 24.0,
        }
    })

    const sonyA6700 = await prisma.camera.create({
        data: {
            name: 'A6700',
            slug: 'a6700',
            description: "Sony's flagship APS-C mirrorless camera featuring a 26.0 MP sensor, AI-based autofocus with subject recognition, and 4K 120p video in a compact, weather-sealed body.",
            manufacturerId: sony.id,
            cameraMountId: sonyE.id,
            priceAmount: 1398,
            productPhotos: ['/cameras/a6700.webp'],
            megapixels: 26.0,
            sensorWidth: 23.5,
            sensorHeight: 15.6,
        }
    })

    const sonyFX3 = await prisma.camera.create({
        data: {
            name: 'FX3',
            slug: 'fx3',
            description: "Sony's full-frame cinema camera designed for run-and-gun filmmaking. Shares the A7S III sensor in a cinema-style body with improved thermal management for unlimited 4K 120p recording and professional audio inputs.",
            manufacturerId: sony.id,
            cameraMountId: sonyE.id,
            priceAmount: 3498,
            megapixels: 12.1,
            sensorWidth: 35.6,
            sensorHeight: 23.8,
        }
    })

    // Canon cameras
    const canonR6MarkII = await prisma.camera.create({
        data: {
            name: 'EOS R6 Mark II',
            slug: 'r6-ii',
            description: "Canon's versatile full-frame mirrorless camera featuring a 24.2 MP sensor, Dual Pixel CMOS AF II with subject detection, 40 fps RAW burst shooting, and 4K 60p video.",
            manufacturerId: canon.id,
            cameraMountId: canonRF.id,
            priceAmount: 2499,
            megapixels: 24.2,
            sensorWidth: 35.9,
            sensorHeight: 23.9,
            productPhotos: ['/cameras/eosr6ii.png'],
        }
    })

    const canonR5 = await prisma.camera.create({
        data: {
            name: 'EOS R5',
            slug: 'r5',
            description: "Canon's professional full-frame mirrorless flagship featuring a 45 MP sensor, in-body image stabilization up to 8 stops, Cinema RAW Light recording, and 8K RAW video capture.",
            manufacturerId: canon.id,
            cameraMountId: canonRF.id,
            priceAmount: 3799,
            megapixels: 45.0,
            sensorWidth: 36.0,
            sensorHeight: 24.0,
            productPhotos: ['/cameras/eosr5.png'],
        }
    })

    // OM System cameras
    const omOM5II = await prisma.camera.create({
        data: {
            name: 'OM-5 II',
            slug: 'om5-ii',
            description: 'A compact weather-sealed Micro Four Thirds camera with a 20.4 MP sensor, 5-axis in-body stabilization, and IP53 weather resistance. An excellent compact option for underwater housing setups.',
            manufacturerId: omSystem.id,
            megapixels: 20.4,
            sensorWidth: 17.4,
            sensorHeight: 13.0,
        }
    })

    const omTg7 = await prisma.camera.create({
        data: {
            name: 'Tough TG-7',
            slug: 'tg-7',
            description: 'An indestructible compact camera rated to 15 m depth straight out of the box, with built-in macro modes, a built-in ring light, and shock, freeze and crush resistance — the go-to camera for underwater reef snaps without a dedicated housing.',
            manufacturerId: omSystem.id,
            interchangeableLens: false,
            isZoomLens: true,
            canBeUsedWithoutAHousing: true,
            depthRating: 15,
            priceAmount: 500,
            productPhotos: ['/cameras/tg7-front.jpg'],
            megapixels: 12.0,
            sensorWidth: 6.17,
            sensorHeight: 4.55,
            focalLengthWide: 5,          // 25 mm equiv (native: ~4.5 mm on 1/2.3" sensor)
            focalLengthTele: 18,         // 100 mm equiv (native: ~18 mm)
            minimumFocusDistanceWide: 0.10,
            minimumFocusDistanceTele: 0.20,
            maximumMagnification: 4.0,   // Super-macro mode
        }
    })

    // Apple cameras
    const iphone14Pro = await prisma.camera.create({
        data: {
            name: 'Iphone 14 Pro',
            slug: 'iphone-14-pro',
            description: "Apple's professional smartphone featuring a 48 MP main camera, LiDAR scanner, ProRAW and ProRes capture, and an Action Mode for stabilized video — compatible with a range of underwater touchscreen housings.",
            manufacturerId: apple.id,
            interchangeableLens: false,
            productPhotos: ['/cameras/iphone-14-pro.jpg'],
            megapixels: 48.0,
            sensorWidth: 9.8,
            sensorHeight: 7.3,
        }
    })


    const sealifemc3 = await prisma.camera.create({
        data: {
            name: 'SeaLife Micro 3.0',
            slug: 'sl550',
            description: 'A purpose-built underwater digital camera rated to 60 m depth with no housing required. Features a 16 MP sensor, built-in diffused flash, and a sealed, diver-friendly control layout designed for hassle-free shooting underwater.',
            manufacturerId: sealife.id,
            interchangeableLens: false,
            canBeUsedWithoutAHousing: true,
            depthRating: 60,
            priceAmount: 600,
            productPhotos: ['/cameras/sl550.webp'],
            megapixels: 16.0,
            sensorWidth: 6.17,
            sensorHeight: 4.55,
            focalLengthTele: 3,          // Prime wide-angle (~16 mm equiv on 1/2.3" sensor)
            minimumFocusDistanceTele: 0.01,
            maximumMagnification: 1.5,
        }
    })

    // ============================= LENSES =============================

    // ----------------------------- E-MOUNT LENSES -----------------------------


    const lensSigma2470dgdnii = await prisma.lens.create({
        data: {
            name: 'Sigma 24-70mm f/2.8 DG DN Art II',
            slug: 'a024-24-70-28-ii',
            description: 'A versatile standard zoom designed for Sony E-mount mirrorless cameras. The Art II version delivers improved optical performance and faster autofocus making it a popular choice for underwater photography where flexibility and image quality matter.',
            cameraMountId: sonyE.id,
            manufacturerId: sigma.id,
            priceAmount: 899,
            isZoomLens: true,
            focalLengthWide: 24,
            focalLengthTele: 70,
            minimumFocusDistanceWide: 0.19,
            maximumMagnification: 0.30,
            productPhotos: ['/lenses/a024-24-70-28-ii.png']
        }
    })

    const lensFE90MacroGOSS = await prisma.lens.create({
        data: {
            name: 'Sony FE 90mm f/2.8 Macro G OSS',
            slug: 'sel90m28g',
            description: 'A dedicated macro lens offering 1:1 reproduction at its closest focusing distance. The built-in optical stabilization and fast autofocus make it an excellent choice for underwater macro photography, capturing nudibranchs, shrimp, and other small subjects with precision.',
            cameraMountId: sonyE.id,
            manufacturerId: sony.id,
            priceAmount: 1098,
            focalLengthTele: 90,
            minimumFocusDistanceWide: 0.28,
            maximumMagnification: 1.00,
            productPhotos: ['/lenses/sel90m28g.avif']
        }
    })

    const lensFE2470GMII = await prisma.lens.create({
        data: {
            name: 'Sony FE 24-70mm f/2.8 GM II',
            slug: 'sel2470gmii',
            description: "Sony's flagship standard zoom, known for corner-to-corner sharpness and a fast f/2.8 aperture throughout the zoom range. The second generation is notably lighter while improving autofocus speed, making it a go-to lens for underwater wide-angle and mid-range shots.",
            exifId: 'FE 24-70mm F2.8 GM II',
            cameraMountId: sonyE.id,
            manufacturerId: sony.id,
            priceAmount: 2298,
            isZoomLens: true,
            focalLengthWide: 24,
            focalLengthTele: 70,
            minimumFocusDistanceWide: 0.21,
            minimumFocusDistanceTele: 0.30,
            maximumMagnification: 0.32,
            productPhotos: ['/lenses/sel2470gmii.jpg']
        }
    })

    const lensFE1635GM = await prisma.lens.create({
        data: {
            name: 'Sony FE 16-35mm f/2.8 GM',
            slug: 'sony-fe-16-35mm-f28-gm',
            description: 'A professional wide-angle zoom engineered to G Master standards. The large f/2.8 aperture and ultra-wide range make it ideal for capturing expansive reef scenes, schooling fish, and ambient light diving conditions.',
            cameraMountId: sonyE.id,
            manufacturerId: sony.id,
            priceAmount: 2198,
            isZoomLens: true,
            focalLengthWide: 16,
            focalLengthTele: 35,
            minimumFocusDistanceWide: 0.28,
            maximumMagnification: 0.19,
            productPhotos: ['/lenses/sel1635gm.avif']

        }
    })

    const lensFE1635GMII = await prisma.lens.create({
        data: {
            name: 'Sony FE 16-35mm f/2.8 GM II',
            slug: 'sel1635gmii',
            description: 'The second-generation G Master ultra-wide zoom is significantly lighter than its predecessor while delivering sharper images. Improved close-focus performance and faster autofocus make it an outstanding underwater wide-angle option.',
            cameraMountId: sonyE.id,
            manufacturerId: sony.id,
            priceAmount: 2298,
            isZoomLens: true,
            focalLengthWide: 16,
            focalLengthTele: 35,
            minimumFocusDistanceWide: 0.22,
            maximumMagnification: 0.22,
            productPhotos: ['/lenses/sel1635gm2.webp']
        }
    })

    await prisma.lens.create({
        data: {
            name: 'Sony FE 70-200mm f/2.8 GM OSS II',
            slug: 'sel70200gmii',
            description: 'A professional telephoto zoom for capturing distant subjects. While rarely used for close-range underwater photography, this lens excels for surface and shallow-water wildlife photography where reach and subject isolation are key.',
            cameraMountId: sonyE.id,
            manufacturerId: sony.id,
            priceAmount: 2798,
            isZoomLens: true,
            focalLengthWide: 70,
            focalLengthTele: 200,
            minimumFocusDistanceWide: 0.40,
            minimumFocusDistanceTele: 0.82,
            maximumMagnification: 0.30,
            productPhotos: ['/lenses/sel70200gm2.webp']
        }
    })

    // Additional lenses from A7R V port chart
    const lensFE24105F4GOSS = await prisma.lens.create({
        data: {
            name: 'Sony FE 24-105mm f/4 G OSS',
            slug: 'sel24105',
            description: 'A versatile all-in-one zoom covering a useful range from wide to short telephoto. The constant f/4 aperture, built-in optical stabilization, and compact size make it a popular travel and underwater companion for varied shooting conditions.',
            cameraMountId: sonyE.id,
            manufacturerId: sony.id,
            priceAmount: 1298,
            isZoomLens: true,
            focalLengthWide: 24,
            focalLengthTele: 105,
            minimumFocusDistanceWide: 0.38,
            maximumMagnification: 0.31,
            productPhotos: ['/lenses/sel24105.avif']
        }
    })

    const lensFE2870OSS = await prisma.lens.create({
        data: {
            name: 'Sony FE 28-70mm f/3.5-5.6 OSS',
            slug: 'sel28702',
            description: 'The standard kit zoom bundled with many Sony full-frame cameras. Provides a useful zoom range at a compact size and accessible price point, with built-in optical stabilization.',
            cameraMountId: sonyE.id,
            manufacturerId: sony.id,
            priceAmount: 298,
            isZoomLens: true,
            focalLengthWide: 28,
            focalLengthTele: 70,
            minimumFocusDistanceWide: 0.30,
            maximumMagnification: 0.21,
            productPhotos: ['/lenses/sel28702.avif']
        }
    })

    const lensFE1635F4 = await prisma.lens.create({
        data: {
            name: 'Sony FE 16-35mm f/4 ZA OSS',
            slug: 'sony-fe-16-35mm-f4-za-oss',
            description: 'A wide-angle zoom from Sony\'s premium Zeiss-licensed ZA series, offering Zeiss-grade sharpness in a compact form factor. Built-in optical stabilization and an ultra-wide field of view make it well-suited for underwater environmental shooting.',
            cameraMountId: sonyE.id,
            manufacturerId: sony.id,
            priceAmount: 1348,
            isZoomLens: true,
            focalLengthWide: 16,
            focalLengthTele: 35,
            minimumFocusDistanceWide: 0.24,
            maximumMagnification: 0.20,
            productPhotos: ['/lenses/sel1635z.avif']
        }
    })

    const lensFE2470F4ZAOSS = await prisma.lens.create({
        data: {
            name: 'Sony FE 24-70mm f/4 ZA OSS',
            slug: 'sony-fe-24-70mm-f4-za-oss',
            description: "Sony's compact standard zoom from the Zeiss-licensed ZA series. A popular choice for travel and all-round underwater photography thanks to its sharp Zeiss-grade optics, modest size, and built-in stabilization.",
            cameraMountId: sonyE.id,
            manufacturerId: sony.id,
            priceAmount: 998,
            isZoomLens: true,
            focalLengthWide: 24,
            focalLengthTele: 70,
            minimumFocusDistanceWide: 0.40,
            maximumMagnification: 0.20,
            productPhotos: ['/lenses/sel2470f4za.avif']
        }
    })

    const lensFE1224F4G = await prisma.lens.create({
        data: {
            name: 'Sony FE 12-24mm f/4 G',
            slug: 'sony-fe-12-24mm-f4-g',
            description: 'An ultra-wide zoom with an impressively wide field of view at the short end. Popular for close-up wide-angle underwater shots, environmental portraits of large marine life, and creative perspective work in confined spaces.',
            cameraMountId: sonyE.id,
            manufacturerId: sony.id,
            priceAmount: 1698,
            isZoomLens: true,
            focalLengthWide: 12,
            focalLengthTele: 24,
            minimumFocusDistanceWide: 0.28,
            maximumMagnification: 0.14,
            productPhotos: ['/lenses/sel1224g.avif']
        }
    })

    const lensFE2470GM = await prisma.lens.create({
        data: {
            name: 'Sony FE 24-70mm f/2.8 GM',
            slug: 'sony-fe-24-70mm-f28-gm',
            description: 'The original G Master standard zoom, a benchmark professional lens known for outstanding sharpness across the frame. A proven choice that pairs well with underwater housings for versatile wide-to-standard shooting.',
            cameraMountId: sonyE.id,
            manufacturerId: sony.id,
            priceAmount: 1798,
            isZoomLens: true,
            focalLengthWide: 24,
            focalLengthTele: 70,
            minimumFocusDistanceWide: 0.38,
            maximumMagnification: 0.24,
            productPhotos: ['/lenses/sel2470gm.avif']
        }
    })

    const lensFEPZ1635F4G = await prisma.lens.create({
        data: {
            name: 'Sony FE PZ 16-35mm f/4 G',
            slug: 'sony-fe-pz-16-35mm-f4-g',
            description: 'A power zoom wide-angle lens with a smooth motorized focal-length mechanism. Useful for underwater video work where seamless zooming is needed without the jerkiness of manual zooming.',
            cameraMountId: sonyE.id,
            manufacturerId: sony.id,
            priceAmount: 1498,
            isZoomLens: true,
            focalLengthWide: 16,
            focalLengthTele: 35,
            minimumFocusDistanceWide: 0.30,
            maximumMagnification: 0.20,
            productPhotos: ['/lenses/sel1635z.avif']
        }
    })

    const lensEPZ18105F4GOSS = await prisma.lens.create({
        data: {
            name: 'Sony E PZ 18-105mm f/4 G OSS',
            slug: 'selp18105g',
            description: 'A versatile APS-C power zoom covering wide to telephoto range. The motorized zoom and optical stabilization make this a go-to lens for underwater video on Sony APS-C cameras, offering smooth focal-length transitions without housing controls.',
            cameraMountId: sonyE.id,
            manufacturerId: sony.id,
            priceAmount: 598,
            isZoomLens: true,
            focalLengthWide: 18,
            focalLengthTele: 105,
            minimumFocusDistanceWide: 0.45,
            maximumMagnification: 0.24,
            productPhotos: ['/lenses/selp18105g.avif']
        }
    })

    await prisma.lens.create({
        data: {
            name: 'Canon RF 15-35mm f/2.8L IS USM',
            slug: 'canon-rf-15-35mm-f28l-is-usm',
            description: "Canon's professional wide-angle zoom for the RF system. The fast f/2.8 aperture and excellent optical performance make it an ideal companion for underwater wide-angle photography with Canon housing systems.",
            cameraMountId: canonRF.id,
            manufacturerId: canon.id,
            priceAmount: 2299,
            isZoomLens: true,
            focalLengthWide: 15,
            focalLengthTele: 35,
            minimumFocusDistanceWide: 0.28,
            maximumMagnification: 0.21,
            productPhotos: ['/lenses/rf1535.png']
        }
    })

    await prisma.lens.create({
        data: {
            name: 'Canon RF 24-70mm f/2.8L IS USM',
            slug: 'canon-rf-24-70mm-f28l-is-usm',
            description: "Canon's premium L-series standard zoom for the RF mount. Delivers outstanding sharpness and reliable autofocus performance for underwater portrait and mid-range work.",
            cameraMountId: canonRF.id,
            manufacturerId: canon.id,
            priceAmount: 2299,
            isZoomLens: true,
            focalLengthWide: 24,
            focalLengthTele: 70,
            minimumFocusDistanceWide: 0.21,
            maximumMagnification: 0.30,
            productPhotos: ['/lenses/rf2470.png']
        }
    })

    await prisma.lens.create({
        data: {
            name: 'Canon RF 100mm f/2.8L Macro IS USM',
            slug: 'canon-rf-100mm-f28l-macro-is-usm',
            description: 'A macro lens with a unique spherical aberration control ring allowing creative bokeh effects. Designed for 1.4:1 maximum magnification, making it one of the most capable macro lenses available for the RF system.',
            cameraMountId: canonRF.id,
            manufacturerId: canon.id,
            priceAmount: 1499,
            focalLengthTele: 100,
            minimumFocusDistanceWide: 0.26,
            maximumMagnification: 1.40,
            productPhotos: ['/lenses/rf100.png']
        }
    })

    // ============= HOUSING MOUNTS ===============

    // Create housing mount types for different housings
    const mountTypeNauticamN120 = await prisma.housingMount.create({
        data: {
            name: 'Nauticam N120',
            slug: 'nauticam-n120',
            description: 'Standard mount type for Nauticam N120 ports',
            manufacturerId: nauticam.id
        }
    })

    // Create housing mount types for different housings
    const mountTypeSeaFrogsPolycarbonate = await prisma.housingMount.create({
        data: {
            name: 'SeaFrogs Polycarbonate',
            slug: 'polycarbonate',
            description: 'Standard mount type for polycarbonate SeaFrogs ports',
            manufacturerId: seafrogs.id
        }
    })


    // ========== HOUSINGS =================

    // Nauticam housings
    await prisma.housing.create({
        data: {
            name: 'NA-OM5II',
            slug: 'na-om-5-ii',
            description: 'Professional underwater housing for the OM SYSTEM OM-5II camera',
            priceAmount: 1800,
            priceCurrency: 'USD',
            depthRating: 100,
            material: 'Aluminum',
            manufacturerId: nauticam.id,
            cameraId: omOM5II.id,
            housingMountId: mountTypeNauticamN120.id,
            productPhotos: ['/housings/na-om5ii-front.webp', '/housings/na-om5ii-back.webp']
        }
    })

    // DiveVolk housings
    const housingDiveVolk = await prisma.housing.create({
        data: {
            name: 'SeaTouch 4 Pro',
            slug: 'seatouch-4',
            description: 'Touch-enabled smartphone underwater housing',
            priceAmount: 300,
            priceCurrency: 'USD',
            depthRating: 60,
            material: 'ABS Plastic',
            manufacturerId: divevolk.id,
            cameraId: iphone14Pro.id,
            interchangeablePort: false,
            productPhotos: ['/housings/divevolk-seatouch-4-front.webp']
        }
    })

    // SeaFrogs housings - based on website data
    await prisma.housing.create({
        data: {
            name: 'SF-R6-MarkII',
            slug: 'canon-r6-ii',
            description: 'Professional underwater housing for Canon EOS R6 Mark II camera',
            priceAmount: 980,
            priceCurrency: 'USD',
            depthRating: 40,
            material: 'ABS Plastic',
            manufacturerId: seafrogs.id,
            cameraId: canonR6MarkII.id,
            housingMountId: mountTypeSeaFrogsPolycarbonate.id,
            productPhotos: ['/housings/sf-s-r6-ii-front.webp', '/housings/sf-s-r6-ii-back.webp']
        }
    })

    await prisma.housing.create({
        data: {
            name: 'SF-S-ZV-E1',
            slug: 'sf-s-zv-e1',
            description: 'Professional underwater housing for Sony ZV-E1 camera with full control access',
            priceAmount: 455,
            priceCurrency: 'USD',
            depthRating: 40,
            material: 'ABS Plastic',
            manufacturerId: seafrogs.id,
            cameraId: sonyZVE1.id,
            housingMountId: mountTypeSeaFrogsPolycarbonate.id,
            productPhotos: ['/housings/sf-s-zv1-e1-front.webp']
        }
    })

    await prisma.housing.create({
        data: {
            name: 'SF-A7III-SL',
            slug: 'sony-a7-iii-salted',
            description: 'Enhanced Salted Line underwater housing for Sony A7 III with improved ergonomics',
            priceAmount: 520,
            priceCurrency: 'USD',
            depthRating: 40,
            material: 'ABS Plastic',
            manufacturerId: seafrogs.id,
            cameraId: sonyA7III.id,
            housingMountId: mountTypeSeaFrogsPolycarbonate.id,
            productPhotos: []
        }
    })

    const housingA7IV = await prisma.housing.create({
        data: {
            name: 'SF-A7IV-SL',
            slug: 'sony-a7-iv-salted',
            description: 'SeaFrogs Salted Line series underwater housing for the Sony A7 IV, waterproof to 40m/130ft. Features two stainless steel latches with locking pins, a larger LCD window, interchangeable port system, vacuum pump port, inbuilt leak detection sensor, and dual fiber-optic ports.',
            priceAmount: 460,
            priceCurrency: 'USD',
            depthRating: 40,
            material: 'ABS Plastic',
            manufacturerId: seafrogs.id,
            cameraId: sonyA7IV.id,
            housingMountId: mountTypeSeaFrogsPolycarbonate.id,
            productPhotos: ['/housings/sf-a7iv-sl.jpg']
        }
    })

    const housingA7RV = await prisma.housing.create({
        data: {
            name: 'SF-A7RV',
            slug: 'sony-a7r-v',
            description: 'Professional underwater housing for Sony A7R V high-resolution camera',
            priceAmount: 630,
            priceCurrency: 'USD',
            depthRating: 40,
            material: 'ABS Plastic',
            manufacturerId: seafrogs.id,
            cameraId: sonyA7RV.id,
            housingMountId: mountTypeSeaFrogsPolycarbonate.id,
            productPhotos: ['/housings/sf-s-a7rv-front.webp']
        }
    })

    // Create SeaFrogs ports for A7R V housing with lens compatibility
    // FL100 port combinations
    const portFL100 = await prisma.port.create({
        data: {
            name: 'FL100',
            manufacturerId: seafrogs.id,
            housingMountId: mountTypeSeaFrogsPolycarbonate.id,
            lens: { connect: [{ id: lensFE90MacroGOSS.id }, { id: lensFE2470GMII.id }, { id: lensFE24105F4GOSS.id }, { id: lensSigma2470dgdnii.id }] },
            slug: 'fl100',
            priceAmount: 189,
            priceCurrency: 'USD',
            depthRating: 40,
            isFlatPort: true,
            productPhotos: ['/ports/fl100.png']
        }
    })

    // WA000S-A port combinations
    await prisma.port.create({
        data: {
            name: 'WA000S-A',
            manufacturerId: seafrogs.id,
            housingMountId: mountTypeSeaFrogsPolycarbonate.id,
            lens: { connect: [{ id: lensFE24105F4GOSS.id }, { id: lensFE2470GM.id }, { id: lensFE2470GMII.id }] },
            slug: 'wa000s-a',
            priceAmount: 229,
            priceCurrency: 'USD',
            depthRating: 40,
            isFlatPort: false,
            productPhotos: ['/ports/wa000s-a.png']
        }
    })

    // FL1655 port combinations
    await prisma.port.create({
        data: {
            name: 'FL1655',
            manufacturerId: seafrogs.id,
            housingMountId: mountTypeSeaFrogsPolycarbonate.id,
            lens: { connect: [{ id: lensFE2470F4ZAOSS.id }] },
            slug: 'fl1655',
            priceAmount: 159,
            priceCurrency: 'USD',
            depthRating: 40,
            isFlatPort: true,
            productPhotos: ['/ports/fl1655.png']
        }
    })


    // WA005-B port combinations
    await prisma.port.create({
        data: {
            name: 'WA005-B',
            manufacturerId: seafrogs.id,
            housingMountId: mountTypeSeaFrogsPolycarbonate.id,
            lens: { connect: [{ id: lensFE1635GM.id }] },
            slug: 'wa005-b',
            priceAmount: 249,
            priceCurrency: 'USD',
            depthRating: 40,
            isFlatPort: false,
            productPhotos: ['/ports/wa005-b.png']
        }
    })

    // WA005-F port combinations
    await prisma.port.create({
        data: {
            name: 'WA005-F',
            manufacturerId: seafrogs.id,
            housingMountId: mountTypeSeaFrogsPolycarbonate.id,
            lens: { connect: [{ id: lensFE1224F4G.id }, { id: lensFEPZ1635F4G.id }] },
            slug: 'wa005-f',
            priceAmount: 249,
            priceCurrency: 'USD',
            depthRating: 40,
            isFlatPort: false,
            productPhotos: ['/ports/wa005-f.png']
        }
    })

    // FL2870 port combinations
    await prisma.port.create({
        data: {
            name: 'FL2870',
            manufacturerId: seafrogs.id,
            housingMountId: mountTypeSeaFrogsPolycarbonate.id,
            lens: { connect: [{ id: lensEPZ18105F4GOSS.id }] },
            slug: 'fl2870',
            priceAmount: 169,
            priceCurrency: 'USD',
            depthRating: 40,
            isFlatPort: true,
            productPhotos: ['/ports/fl2870.png']
        }
    })

    await prisma.housing.create({
        data: {
            name: 'SF-A6700',
            slug: 'sony-a6700',
            description: 'Compact underwater housing for Sony A6700 APS-C camera',
            priceAmount: 485,
            priceCurrency: 'USD',
            depthRating: 40,
            material: 'ABS Plastic',
            manufacturerId: seafrogs.id,
            cameraId: sonyA6700.id,
            housingMountId: mountTypeSeaFrogsPolycarbonate.id,
            productPhotos: ['/housings/sf-s-a6700-front.jpg', '/housings/sf-s-a6700-back.jpg']
        }
    })

    await prisma.housing.create({
        data: {
            name: 'SF-FX3-SL',
            slug: 'sony-fx3-salted',
            description: 'Professional cinema camera housing for Sony FX3 with HDMI 2.0 support',
            priceAmount: 636,
            priceCurrency: 'USD',
            depthRating: 40,
            material: 'ABS Plastic',
            manufacturerId: seafrogs.id,
            cameraId: sonyFX3.id,
            housingMountId: mountTypeSeaFrogsPolycarbonate.id,
            productPhotos: ['/housings/sf-s-fx3.jpg']
        }
    })

    await prisma.housing.create({
        data: {
            name: 'SF-R5',
            slug: 'canon-r5',
            description: 'High-performance underwater housing for Canon EOS R5 professional camera',
            priceAmount: 720,
            priceCurrency: 'USD',
            depthRating: 40,
            material: 'ABS Plastic',
            manufacturerId: seafrogs.id,
            cameraId: canonR5.id,
            housingMountId: mountTypeSeaFrogsPolycarbonate.id,
            productPhotos: ['/housings/sf-eosr5-np.webp']
        }
    })

    await prisma.housing.create({
        data: {
            name: 'SF-TG7',
            slug: 'om-tg7',
            description: 'Underwater housing for OM System Tough TG-7 compact camera, waterproof to 60m/130ft. Features dual O-ring seals, a large rear LCD window, and controls for all camera functions.',
            priceAmount: 150,
            priceCurrency: 'USD',
            depthRating: 60,
            material: 'ABS Plastic',
            manufacturerId: seafrogs.id,
            cameraId: omTg7.id,
            interchangeablePort: false,
            productPhotos: ['/housings/sf-tg-7.jpg']
        }
    })


    // Gallery photos
    const bcrypt = require('bcryptjs')

    const adminUser = await prisma.user.create({
        data: {
            email: 'admin@dev.local',
            password: await bcrypt.hash('password', 12),
            name: 'Dev Admin',
            isSuperuser: true,
            bio: 'Administrator account for development and testing purposes.',
            profilePicture: '/users/admin.jpeg',
        },
    })

    await prisma.galleryPhoto.createMany({
        data: [
            {
                imagePath: '/gallery/DSC01656.jpeg',
                width: 1280,
                height: 854,
                userId: adminUser.id,
                cameraId: sonyA7IV.id,
                housingId: housingA7IV.id,
                portId: portFL100.id,
                lensId: lensFE2470GMII.id,
                focalLength: 47,
                aperture: 16,
                shutterSpeed: '1/200',
            },
            {
                imagePath: '/gallery/DSC01728.jpeg',
                width: 1280,
                height: 854,
                userId: adminUser.id,
                cameraId: sonyA7IV.id,
                housingId: housingA7IV.id,
                portId: portFL100.id,
                lensId: lensFE2470GMII.id,
                focalLength: 70,
                aperture: 13,
                shutterSpeed: '1/200',
            },
            {
                imagePath: '/gallery/DSC01738.jpeg',
                width: 1280,
                height: 854,
                userId: adminUser.id,
                cameraId: sonyA7IV.id,
                housingId: housingA7IV.id,
                portId: portFL100.id,
                lensId: lensFE2470GMII.id,
                focalLength: 70,
                aperture: 11,
                shutterSpeed: '1/200',
            },
            {
                imagePath: '/gallery/DSC01881.jpeg',
                width: 1280,
                height: 1280,
                userId: adminUser.id,
                cameraId: sonyA7IV.id,
                housingId: housingA7IV.id,
                portId: portFL100.id,
                lensId: lensFE2470GMII.id,
                focalLength: 70,
                aperture: 3.2,
                shutterSpeed: '1/200',
            },
            {
                imagePath: '/gallery/DSC02017.jpeg',
                width: 1280,
                height: 854,
                userId: adminUser.id,
                cameraId: sonyA7IV.id,
                housingId: housingA7IV.id,
                portId: portFL100.id,
                lensId: lensFE2470GMII.id,
                focalLength: 70,
                aperture: 14,
                shutterSpeed: '1/60',
            },
            {
                imagePath: '/gallery/DSC02035.jpeg',
                width: 854,
                height: 1280,
                userId: adminUser.id,
                cameraId: sonyA7IV.id,
                housingId: housingA7IV.id,
                portId: portFL100.id,
                lensId: lensFE2470GMII.id,
                focalLength: 70,
                aperture: 10,
                shutterSpeed: '1/60',
            },
            {
                imagePath: '/gallery/DSC02155.jpeg',
                width: 1280,
                height: 854,
                userId: adminUser.id,
                cameraId: sonyA7IV.id,
                housingId: housingA7IV.id,
                portId: portFL100.id,
                lensId: lensFE2470GMII.id,
                focalLength: 53,
                aperture: 9,
                shutterSpeed: '1/200',
            },
            {
                imagePath: '/gallery/DSC02164.jpeg',
                width: 1280,
                height: 854,
                userId: adminUser.id,
                cameraId: sonyA7IV.id,
                housingId: housingA7IV.id,
                portId: portFL100.id,
                lensId: lensFE2470GMII.id,
                focalLength: 30,
                aperture: 14,
                shutterSpeed: '1/160',
            },
            {
                imagePath: '/gallery/DSC02174.jpeg',
                width: 1280,
                height: 854,
                userId: adminUser.id,
                cameraId: sonyA7IV.id,
                housingId: housingA7IV.id,
                portId: portFL100.id,
                lensId: lensFE2470GMII.id,
                focalLength: 40,
                aperture: 6.3,
                shutterSpeed: '1/200',
            },
            {
                imagePath: '/gallery/DSC02476.jpeg',
                width: 1280,
                height: 1280,
                userId: adminUser.id,
                cameraId: sonyA7IV.id,
                housingId: housingA7IV.id,
                portId: portFL100.id,
                lensId: lensFE2470GMII.id,
                focalLength: 27,
                aperture: 8,
                shutterSpeed: '1/60',
            },
            {
                imagePath: '/gallery/DSC02560.jpeg',
                width: 1280,
                height: 854,
                userId: adminUser.id,
                cameraId: sonyA7IV.id,
                housingId: housingA7IV.id,
                portId: portFL100.id,
                lensId: lensFE2470GMII.id,
                focalLength: 24,
                aperture: 8,
                shutterSpeed: '1/100',
            },
            {
                imagePath: '/gallery/DSC02640.jpeg',
                width: 1280,
                height: 1280,
                userId: adminUser.id,
                cameraId: sonyA7IV.id,
                housingId: housingA7IV.id,
                portId: portFL100.id,
                lensId: lensFE2470GMII.id,
                focalLength: 24,
                aperture: 18,
                shutterSpeed: '1/200',
            },
            {
                imagePath: '/gallery/DSC03346.jpeg',
                width: 1280,
                height: 854,
                userId: adminUser.id,
                cameraId: sonyA7IV.id,
                housingId: housingA7IV.id,
                portId: portFL100.id,
                lensId: lensFE2470GMII.id,
                focalLength: 53,
                aperture: 16,
                shutterSpeed: '1/100',
            },
            {
                imagePath: '/gallery/DSC03402.jpeg',
                width: 1280,
                height: 854,
                userId: adminUser.id,
                cameraId: sonyA7IV.id,
                housingId: housingA7IV.id,
                portId: portFL100.id,
                lensId: lensFE2470GMII.id,
                focalLength: 24,
                aperture: 4.5,
                shutterSpeed: '1/200',
            },
            {
                title: 'Nudibranch on coral',
                description: 'A colorful nudibranch discovered on a reef dive',
                imagePath: '/gallery/DSC06378.jpeg',
                width: 1280,
                height: 854,
                location: 'Red Sea',
                userId: adminUser.id,
                cameraId: sonyA7IV.id,
                lensId: lensFE2470GMII.id,
                housingId: housingA7IV.id,
                portId: portFL100.id,
                focalLength: 24,
                aperture: 4,
                shutterSpeed: '1/640',
            },
            {
                title: 'Wide angle reef scene',
                description: 'Expansive reef landscape with ambient light',
                imagePath: '/gallery/DSC07814.jpeg',
                width: 1280,
                height: 854,
                location: 'Red Sea',
                userId: adminUser.id,
                cameraId: sonyA7IV.id,
                lensId: lensFE2470GMII.id,
                housingId: housingA7IV.id,
                portId: portFL100.id,
                focalLength: 70,
                aperture: 4,
                shutterSpeed: '1/160',
            },
            {
                imagePath: '/gallery/whale_shark.jpeg',
                width: 1280,
                height: 854,
                userId: adminUser.id,
                cameraId: sonyA7IV.id,
                housingId: housingA7IV.id,
                portId: portFL100.id,
                lensId: lensFE2470GMII.id,
                focalLength: 24,
                aperture: 4.5,
                shutterSpeed: '1/200',
            },
            // iPhone 14 Pro photos through DiveVolk SeaTouch 4 Pro
            {
                imagePath: '/gallery/bobtail_squid.jpg',
                width: 2028,
                height: 2028,
                userId: adminUser.id,
                cameraId: iphone14Pro.id,
                housingId: housingDiveVolk.id,
                focalLength: 2.2,
                aperture: 2.2,
                shutterSpeed: '1/540',
            },
            {
                imagePath: '/gallery/candy_crab.jpg',
                width: 2534,
                height: 2534,
                userId: adminUser.id,
                cameraId: iphone14Pro.id,
                housingId: housingDiveVolk.id,
                focalLength: 2.2,
                aperture: 2.2,
                shutterSpeed: '1/160',
            },
            {
                imagePath: '/gallery/coconut_octopus.jpg',
                width: 3603,
                height: 2702,
                userId: adminUser.id,
                cameraId: iphone14Pro.id,
                housingId: housingDiveVolk.id,
                focalLength: 2.2,
                aperture: 2.2,
                shutterSpeed: '1/430',
            },
            {
                imagePath: '/gallery/flamboyant_cuttlefish.jpg',
                width: 2331,
                height: 2331,
                userId: adminUser.id,
                cameraId: iphone14Pro.id,
                housingId: housingDiveVolk.id,
                focalLength: 2.2,
                aperture: 2.2,
                shutterSpeed: '1/250',
            },
            {
                imagePath: '/gallery/ghost_pipefish.jpg',
                width: 3024,
                height: 4032,
                userId: adminUser.id,
                cameraId: iphone14Pro.id,
                housingId: housingDiveVolk.id,
                focalLength: 2.2,
                aperture: 2.2,
                shutterSpeed: '1/100',
            },
            {
                imagePath: '/gallery/giant_frogfish.jpg',
                width: 3024,
                height: 4032,
                userId: adminUser.id,
                cameraId: iphone14Pro.id,
                housingId: housingDiveVolk.id,
                focalLength: 2.2,
                aperture: 2.2,
                shutterSpeed: '1/290',
            },
            {
                imagePath: '/gallery/hairy_frogfish.jpg',
                width: 2798,
                height: 3730,
                userId: adminUser.id,
                cameraId: iphone14Pro.id,
                housingId: housingDiveVolk.id,
                focalLength: 2.2,
                aperture: 2.2,
                shutterSpeed: '1/100',
            },
            {
                imagePath: '/gallery/hairy_lobster.jpg',
                width: 1695,
                height: 2260,
                userId: adminUser.id,
                cameraId: iphone14Pro.id,
                housingId: housingDiveVolk.id,
                focalLength: 2.2,
                aperture: 2.2,
                shutterSpeed: '1/670',
            },
            {
                imagePath: '/gallery/nudi.jpg',
                width: 4032,
                height: 3024,
                userId: adminUser.id,
                cameraId: iphone14Pro.id,
                housingId: housingDiveVolk.id,
                focalLength: 2.2,
                aperture: 2.2,
                shutterSpeed: '1/200',
            },
            {
                imagePath: '/gallery/nudi_cropped.jpg',
                width: 5172,
                height: 3879,
                userId: adminUser.id,
                cameraId: iphone14Pro.id,
                housingId: housingDiveVolk.id,
                focalLength: 2.2,
                aperture: 2.2,
                shutterSpeed: '1/200',
            },
            {
                imagePath: '/gallery/nudibranch_eggs.jpg',
                width: 3024,
                height: 4032,
                userId: adminUser.id,
                cameraId: iphone14Pro.id,
                housingId: housingDiveVolk.id,
                focalLength: 2.2,
                aperture: 2.2,
                shutterSpeed: '1/530',
            },
            {
                imagePath: '/gallery/nudibranch_trunicate.jpg',
                width: 3024,
                height: 4032,
                userId: adminUser.id,
                cameraId: iphone14Pro.id,
                housingId: housingDiveVolk.id,
                focalLength: 2.2,
                aperture: 2.2,
                shutterSpeed: '1/470',
            },
            {
                imagePath: '/gallery/painted_frogfish.jpg',
                width: 2588,
                height: 3450,
                userId: adminUser.id,
                cameraId: iphone14Pro.id,
                housingId: housingDiveVolk.id,
                focalLength: 2.2,
                aperture: 2.2,
                shutterSpeed: '1/100',
            },
            {
                imagePath: '/gallery/pano.jpg',
                width: 11909,
                height: 3730,
                userId: adminUser.id,
                cameraId: iphone14Pro.id,
                housingId: housingDiveVolk.id,
                focalLength: 6.9,
                aperture: 1.8,
                shutterSpeed: '1/900',
            },
            {
                imagePath: '/gallery/pygmy_seahorse.jpg',
                width: 4032,
                height: 3024,
                userId: adminUser.id,
                cameraId: iphone14Pro.id,
                housingId: housingDiveVolk.id,
                focalLength: 2.2,
                aperture: 2.2,
                shutterSpeed: '1/560',
            },
            {
                imagePath: '/gallery/shrimp.jpg',
                width: 3024,
                height: 3024,
                userId: adminUser.id,
                cameraId: iphone14Pro.id,
                housingId: housingDiveVolk.id,
                focalLength: 2.2,
                aperture: 2.2,
                shutterSpeed: '1/800',
            },
            {
                imagePath: '/gallery/thresher.jpg',
                width: 4320,
                height: 7680,
                userId: adminUser.id,
                cameraId: iphone14Pro.id,
                housingId: housingDiveVolk.id,
            },
            {
                imagePath: '/gallery/torch.jpg',
                width: 3024,
                height: 4032,
                userId: adminUser.id,
                cameraId: iphone14Pro.id,
                housingId: housingDiveVolk.id,
                focalLength: 2.2,
                aperture: 2.2,
                shutterSpeed: '1/200',
            },
            {
                imagePath: '/gallery/turtle.jpg',
                width: 6048,
                height: 8064,
                userId: adminUser.id,
                cameraId: iphone14Pro.id,
                housingId: housingDiveVolk.id,
                focalLength: 6.9,
                aperture: 1.8,
                shutterSpeed: '1/60',
            },
            {
                imagePath: '/gallery/wobbegong_drift_dive.jpg',
                width: 8064,
                height: 6048,
                userId: adminUser.id,
                cameraId: iphone14Pro.id,
                housingId: housingDiveVolk.id,
                focalLength: 6.9,
                aperture: 1.8,
                shutterSpeed: '1/120',
            },
            {
                imagePath: '/gallery/wobbegong_top.jpg',
                width: 4914,
                height: 6552,
                userId: adminUser.id,
                cameraId: iphone14Pro.id,
                housingId: housingDiveVolk.id,
                focalLength: 6.9,
                aperture: 1.8,
                shutterSpeed: '1/170',
            },
        ],
    })

    console.log('✅ Database seeded successfully!')
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })