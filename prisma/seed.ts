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
}

async function uploadPublicFile(relativePath: string): Promise<void> {
    if (!s3Client) return
    const filePath = path.join(process.cwd(), 'public', relativePath)
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
        console.log('�📤 Uploading images to S3...')
        const imagePaths = [
            // Cameras
            '/cameras/ilce-7m5-front.webp',
            '/cameras/ilce-7m4-front.webp',
            '/cameras/a6700.webp',
            '/cameras/r6-ii-front.webp',
            '/cameras/iphone-14-pro.jpg',
            // Lenses
            '/lenses/a024-24-70-28-ii.png',
            '/lenses/sel90m28g.avif',
            '/lenses/sel2470gmii.jpg',
            '/lenses/sel24105.avif',
            '/lenses/sel28702.avif',
            '/lenses/selp18105g.avif',
            // Housings
            '/housings/na-om5ii-front.webp',
            '/housings/na-om5ii-back.webp',
            '/housings/divevolk-seatouch-4-front.webp',
            '/housings/sf-s-r6-ii-front.webp',
            '/housings/sf-s-r6-ii-back.webp',
            '/housings/sf-s-zv1-e1-front.webp',
            '/housings/sf-a7iv-sl.jpg',
            '/housings/sf-s-a7rv-front.webp',
            '/housings/sf-s-a6700-front.jpg',
            '/housings/sf-s-a6700-back.jpg',
            '/housings/sf-s-fx3.jpg',
            '/housings/sf-eosr5-np.webp',
            // Ports
            '/ports/fl100.png',
            '/ports/wa005-b.png',
            '/ports/wa005-f.png',
            '/ports/fl2870.png',
            // Gallery
            '/gallery/DSC01656.jpeg',
            '/gallery/DSC01728.jpeg',
            '/gallery/DSC01738.jpeg',
            '/gallery/DSC01881.jpeg',
            '/gallery/DSC02017.jpeg',
            '/gallery/DSC02035.jpeg',
            '/gallery/DSC02155.jpeg',
            '/gallery/DSC02164.jpeg',
            '/gallery/DSC02174.jpeg',
            '/gallery/DSC02476.jpeg',
            '/gallery/DSC02560.jpeg',
            '/gallery/DSC02640.jpeg',
            '/gallery/DSC03346.jpeg',
            '/gallery/DSC03402.jpeg',
            '/gallery/DSC06378.jpeg',
            '/gallery/DSC07814.jpeg',
            '/gallery/whale_shark.jpeg',
            '/gallery/bobtail_squid.jpg',
            '/gallery/candy_crab.jpg',
            '/gallery/coconut_octopus.jpg',
            '/gallery/flamboyant_cuttlefish.jpg',
            '/gallery/ghost_pipefish.jpg',
            '/gallery/giant_frogfish.jpg',
            '/gallery/hairy_frogfish.jpg',
            '/gallery/hairy_lobster.jpg',
            '/gallery/nudi.jpg',
            '/gallery/nudi_cropped.jpg',
            '/gallery/nudibranch_eggs.jpg',
            '/gallery/nudibranch_trunicate.jpg',
            '/gallery/painted_frogfish.jpg',
            '/gallery/pano.jpg',
            '/gallery/pygmy_seahorse.jpg',
            '/gallery/shrimp.jpg',
            '/gallery/thresher.jpg',
            '/gallery/torch.jpg',
            '/gallery/turtle.jpg',
            '/gallery/wobbegong_drift_dive.jpg',
            '/gallery/wobbegong_top.jpg',
        ]
        for (const p of imagePaths) {
            await uploadPublicFile(p)
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
    await prisma.cameraManufacturer.deleteMany()
    await prisma.housingManufacturer.deleteMany()
    await prisma.user.deleteMany()

    // Create housing manufacturers
    const nauticam = await prisma.housingManufacturer.create({
        data: {
            name: 'Nauticam',
            slug: 'nauticam',
            description: 'Premium underwater housings for professional photography'
        }
    })

    const seafrogs = await prisma.housingManufacturer.create({
        data: {
            name: 'SeaFrogs',
            slug: 'seafrogs',
            description: 'Affordable underwater housings for mirrorless and compact cameras'
        }
    })

    const divevolk = await prisma.housingManufacturer.create({
        data: {
            name: 'DiveVolk',
            slug: 'divevolk',
            description: 'touch enabled smartphone cases'
        }
    })

    // Create camera manufacturers
    const sony = await prisma.cameraManufacturer.create({
        data: {
            name: 'Sony',
            slug: 'sony'
        }
    })

    const canon = await prisma.cameraManufacturer.create({
        data: {
            name: 'Canon',
            slug: 'canon'
        }
    })

    const nikon = await prisma.cameraManufacturer.create({
        data: {
            name: 'Nikon',
            slug: 'nikon'
        }
    })

    const omSystem = await prisma.cameraManufacturer.create({
        data: {
            name: 'OM System',
            slug: 'om-system'
        }
    })

    const apple = await prisma.cameraManufacturer.create({
        data: {
            name: 'Apple',
            slug: 'apple'
        }
    })

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

    // Create camera models based on scraped data

    // Sony cameras
    const sonyZVE1 = await prisma.camera.create({
        data: {
            name: 'ZV-E1',
            slug: 'zv-e1',
            cameraManufacturerId: sony.id,
            cameraMountId: sonyE.id
        }
    })

    const sonyA7III = await prisma.camera.create({
        data: {
            name: 'A7 III',
            slug: 'a7-iii',
            cameraManufacturerId: sony.id,
            cameraMountId: sonyE.id
        }
    })

    // ============================= LENSES =============================

    // ----------------------------- E-MOUNT LENSES -----------------------------
    const lensSigma2470dgdnii = await prisma.lens.create({
        data: {
            name: 'Sigma 24-70mm f/2.8 DG DN Art II',
            slug: 'a024-24-70-28-ii',
            cameraMountId: sonyE.id,
            productPhotos: ['/lenses/a024-24-70-28-ii.png']
        }
    })

    const lensFE90MacroGOSS = await prisma.lens.create({
        data: {
            name: 'Sony FE 90mm f/2.8 Macro G OSS',
            slug: 'sel90m28g',
            cameraMountId: sonyE.id,
            productPhotos: ['/lenses/sel90m28g.avif']
        }
    })

    const lensFE2470GMII = await prisma.lens.create({
        data: {
            name: 'Sony FE 24-70mm f/2.8 GM II',
            slug: 'sel2470gmii',
            exifId: 'FE 24-70mm F2.8 GM II',
            cameraMountId: sonyE.id,
            productPhotos: ['/lenses/sel2470gmii.jpg']
        }
    })

    const lensFE1635GM = await prisma.lens.create({
        data: {
            name: 'Sony FE 16-35mm f/2.8 GM',
            slug: 'sony-fe-16-35mm-f28-gm',
            cameraMountId: sonyE.id
        }
    })

    const lensFE1635GMII = await prisma.lens.create({
        data: {
            name: 'Sony FE 16-35mm f/2.8 GM II',
            slug: 'sel1635gmii',
            cameraMountId: sonyE.id
        }
    })

    await prisma.lens.create({
        data: {
            name: 'Sony FE 70-200mm f/2.8 GM OSS II',
            slug: 'sel70200gmii',
            cameraMountId: sonyE.id
        }
    })

    // Additional lenses from A7R V port chart
    const lensFE24105F4GOSS = await prisma.lens.create({
        data: {
            name: 'Sony FE 24-105mm f/4 G OSS',
            slug: 'sel24105',
            cameraMountId: sonyE.id,
            productPhotos: ['/lenses/sel24105.avif']
        }
    })

    const lensFE2870OSS = await prisma.lens.create({
        data: {
            name: 'Sony FE 28-70mm f/3.5-5.6 OSS',
            slug: 'sel28702',
            cameraMountId: sonyE.id,
            productPhotos: ['/lenses/sel28702.avif']
        }
    })

    const lensFE1635F4 = await prisma.lens.create({
        data: {
            name: 'Sony FE 16-35mm f/4 ZA OSS',
            slug: 'sony-fe-16-35mm-f4-za-oss',
            cameraMountId: sonyE.id
        }
    })

    const lensFE2470F4ZAOSS = await prisma.lens.create({
        data: {
            name: 'Sony FE 24-70mm f/4 ZA OSS',
            slug: 'sony-fe-24-70mm-f4-za-oss',
            cameraMountId: sonyE.id
        }
    })

    const lensFE1224F4G = await prisma.lens.create({
        data: {
            name: 'Sony FE 12-24mm f/4 G',
            slug: 'sony-fe-12-24mm-f4-g',
            cameraMountId: sonyE.id
        }
    })

    const lensFE2470GM = await prisma.lens.create({
        data: {
            name: 'Sony FE 24-70mm f/2.8 GM',
            slug: 'sony-fe-24-70mm-f28-gm',
            cameraMountId: sonyE.id
        }
    })

    const lensFEPZ1635F4G = await prisma.lens.create({
        data: {
            name: 'Sony FE PZ 16-35mm f/4 G',
            slug: 'sony-fe-pz-16-35mm-f4-g',
            cameraMountId: sonyE.id
        }
    })

    const lensEPZ18105F4GOSS = await prisma.lens.create({
        data: {
            name: 'Sony E PZ 18-105mm f/4 G OSS',
            slug: 'selp18105g',
            cameraMountId: sonyE.id,
            productPhotos: ['/lenses/selp18105g.avif']
        }
    })

    await prisma.lens.create({
        data: {
            name: 'Canon RF 15-35mm f/2.8L IS USM',
            slug: 'canon-rf-15-35mm-f28l-is-usm',
            cameraMountId: canonRF.id
        }
    })

    await prisma.lens.create({
        data: {
            name: 'Canon RF 24-70mm f/2.8L IS USM',
            slug: 'canon-rf-24-70mm-f28l-is-usm',
            cameraMountId: canonRF.id
        }
    })

    await prisma.lens.create({
        data: {
            name: 'Canon RF 100mm f/2.8L Macro IS USM',
            slug: 'canon-rf-100mm-f28l-macro-is-usm',
            cameraMountId: canonRF.id
        }
    })

    const sonyA7RV = await prisma.camera.create({
        data: {
            name: 'A7R V',
            slug: 'ilce-7rm5',
            cameraManufacturerId: sony.id,
            cameraMountId: sonyE.id,
            productPhotos: ['/cameras/ilce-7m5-front.webp']
        }
    })

    const sonyA7IV = await prisma.camera.create({
        data: {
            name: 'A7 IV',
            slug: 'ilce-7m4',
            exifId: 'ILCE-7M4',
            cameraManufacturerId: sony.id,
            cameraMountId: sonyE.id,
            productPhotos: ['/cameras/ilce-7m4-front.webp']
        }
    })

    const sonyA6700 = await prisma.camera.create({
        data: {
            name: 'A6700',
            slug: 'a6700',
            cameraManufacturerId: sony.id,
            cameraMountId: sonyE.id,
            productPhotos: ['/cameras/a6700.webp']
        }
    })

    const sonyFX3 = await prisma.camera.create({
        data: {
            name: 'FX3',
            slug: 'fx3',
            cameraManufacturerId: sony.id,
            cameraMountId: sonyE.id
        }
    })

    // Canon cameras
    const canonR6MarkII = await prisma.camera.create({
        data: {
            name: 'EOS R6 Mark II',
            slug: 'r6-ii',
            cameraManufacturerId: canon.id,
            cameraMountId: canonRF.id,
            productPhotos: ['/cameras/r6-ii-front.webp']
        }
    })

    const canonR5 = await prisma.camera.create({
        data: {
            name: 'EOS R5',
            slug: 'r5',
            cameraManufacturerId: canon.id,
            cameraMountId: canonRF.id
        }
    })

    // OM System cameras
    const omOM5II = await prisma.camera.create({
        data: {
            name: 'OM-5 II',
            slug: 'om5-ii',
            cameraManufacturerId: omSystem.id,
        }
    })

    // Apple cameras
    const iphone14Pro = await prisma.camera.create({
        data: {
            name: 'Iphone 14 Pro',
            slug: 'iphone-14-pro',
            cameraManufacturerId: apple.id,
            interchangeableLens: false,
            productPhotos: ['/cameras/iphone-14-pro.jpg']
        }
    })

    // Create housing mount types for different housings
    const mountTypeNauticamN120 = await prisma.housingMount.create({
        data: {
            name: 'Nauticam N120',
            slug: 'nauticam-n120',
            description: 'Standard mount type for Nauticam N120 ports',
            housingManufacturerId: nauticam.id
        }
    })

    // Create housing mount types for different housings
    const mountTypeSeaFrogsPolycarbonate = await prisma.housingMount.create({
        data: {
            name: 'SeaFrogs Polycarbonate',
            slug: 'polycarbonate',
            description: 'Standard mount type for polycarbonate SeaFrogs ports',
            housingManufacturerId: seafrogs.id
        }
    })


    // Create housings based on scraped data from manufacturers

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
            housingManufacturerId: nauticam.id,
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
            housingManufacturerId: divevolk.id,
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
            housingManufacturerId: seafrogs.id,
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
            housingManufacturerId: seafrogs.id,
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
            housingManufacturerId: seafrogs.id,
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
            housingManufacturerId: seafrogs.id,
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
            housingManufacturerId: seafrogs.id,
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
            housingManufacturerId: seafrogs.id,
            housingMountId: mountTypeSeaFrogsPolycarbonate.id,
            lens: { connect: [{ id: lensFE90MacroGOSS.id }, { id: lensFE2470GMII.id }, { id: lensFE24105F4GOSS.id }, { id: lensSigma2470dgdnii.id }] },
            slug: 'fl100',
            productPhotos: ['/ports/fl100.png']
        }
    })

    // WA000S-A port combinations
    await prisma.port.create({
        data: {
            name: 'WA000S-A',
            housingManufacturerId: seafrogs.id,
            housingMountId: mountTypeSeaFrogsPolycarbonate.id,
            lens: { connect: [{ id: lensFE24105F4GOSS.id }, { id: lensFE2470GM.id }, { id: lensFE2470GMII.id }] },
            slug: 'wa000s-a'
        }
    })

    // FL1655 port combinations
    await prisma.port.create({
        data: {
            name: 'FL1655',
            housingManufacturerId: seafrogs.id,
            housingMountId: mountTypeSeaFrogsPolycarbonate.id,
            lens: { connect: [{ id: lensFE2470F4ZAOSS.id }] },
            slug: 'fl1655'
        }
    })


    // WA005-B port combinations
    await prisma.port.create({
        data: {
            name: 'WA005-B',
            housingManufacturerId: seafrogs.id,
            housingMountId: mountTypeSeaFrogsPolycarbonate.id,
            lens: { connect: [{ id: lensFE1635GM.id }] },
            slug: 'wa005-b',
            productPhotos: ['/ports/wa005-b.png']
        }
    })

    // WA005-F port combinations
    await prisma.port.create({
        data: {
            name: 'WA005-F',
            housingManufacturerId: seafrogs.id,
            housingMountId: mountTypeSeaFrogsPolycarbonate.id,
            lens: { connect: [{ id: lensFE1224F4G.id }, { id: lensFEPZ1635F4G.id }] },
            slug: 'wa005-f',
            productPhotos: ['/ports/wa005-f.png']
        }
    })

    // FL2870 port combinations
    await prisma.port.create({
        data: {
            name: 'FL2870',
            housingManufacturerId: seafrogs.id,
            housingMountId: mountTypeSeaFrogsPolycarbonate.id,
            lens: { connect: [{ id: lensEPZ18105F4GOSS.id }] },
            slug: 'fl2870',
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
            housingManufacturerId: seafrogs.id,
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
            housingManufacturerId: seafrogs.id,
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
            housingManufacturerId: seafrogs.id,
            cameraId: canonR5.id,
            housingMountId: mountTypeSeaFrogsPolycarbonate.id,
            productPhotos: ['/housings/sf-eosr5-np.webp']
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