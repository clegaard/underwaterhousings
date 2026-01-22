import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// // Function to create URL-friendly slugs
// function createSlug(text: string): string {
//     return text
//         .toLowerCase()
//         .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
//         .replace(/\s+/g, '-') // Replace spaces with hyphens
//         .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
//         .trim()
// }

async function main() {
    console.log('🌱 Seeding database...')

    // Clear existing data
    await prisma.housing.deleteMany()
    await prisma.camera.deleteMany()
    await prisma.cameraManufacturer.deleteMany()
    await prisma.housingManufacturer.deleteMany()

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

    // Create camera models based on scraped data

    // Sony cameras
    const sonyZVE1 = await prisma.camera.create({
        data: {
            name: 'ZV-E1',
            slug: 'zv-e1',
            cameraManufacturerId: sony.id
        }
    })

    const sonyA7III = await prisma.camera.create({
        data: {
            name: 'A7 III',
            slug: 'a7-iii',
            cameraManufacturerId: sony.id
        }
    })

    const sonyA7RV = await prisma.camera.create({
        data: {
            name: 'A7R V',
            slug: 'a7r-v',
            cameraManufacturerId: sony.id
        }
    })

    const sonyA6700 = await prisma.camera.create({
        data: {
            name: 'A6700',
            slug: 'a6700',
            cameraManufacturerId: sony.id
        }
    })

    const sonyFX3 = await prisma.camera.create({
        data: {
            name: 'FX3',
            slug: 'fx3',
            cameraManufacturerId: sony.id
        }
    })

    // Canon cameras
    const canonR6MarkII = await prisma.camera.create({
        data: {
            name: 'EOS R6 Mark II',
            slug: 'r6-ii',
            cameraManufacturerId: canon.id
        }
    })

    const canonR5 = await prisma.camera.create({
        data: {
            name: 'EOS R5',
            slug: 'r5',
            cameraManufacturerId: canon.id
        }
    })

    // OM System cameras
    const omOM5II = await prisma.camera.create({
        data: {
            name: 'OM-5 II',
            slug: 'om5-ii',
            cameraManufacturerId: omSystem.id
        }
    })

    // Apple cameras
    const iphone14Pro = await prisma.camera.create({
        data: {
            name: 'Iphone 14 Pro',
            slug: 'iphone-14-pro',
            cameraManufacturerId: apple.id
        }
    })


    // Create housings based on scraped data from manufacturers

    // Nauticam housings
    await prisma.housing.create({
        data: {
            model: 'NA-OM5II',
            name: 'NA-OM5II Housing for OM SYSTEM OM-5II Camera',
            slug: 'na-om-5-ii',
            description: 'Professional underwater housing for the OM SYSTEM OM-5II camera',
            priceAmount: 1800,
            priceCurrency: 'USD',
            depthRating: 100,
            material: 'Aluminum',
            housingManufacturerId: nauticam.id,
            cameraId: omOM5II.id,

        }
    })

    // DiveVolk housings
    await prisma.housing.create({
        data: {
            model: 'SeaTouch 4',
            name: 'SeaTouch Pro',
            slug: 'seatouch-4',
            description: 'Touch-enabled smartphone underwater housing',
            priceAmount: 300,
            priceCurrency: 'USD',
            depthRating: 60,
            material: 'ABS Plastic',
            housingManufacturerId: divevolk.id,
            cameraId: iphone14Pro.id,

        }
    })

    // SeaFrogs housings - based on website data
    await prisma.housing.create({
        data: {
            model: 'SF-R6-MarkII',
            name: 'Sea Frogs 40m/130ft Underwater Camera Housing for Canon EOS R6 Mark II',
            slug: 'canon-r6-ii',
            description: 'Professional underwater housing for Canon EOS R6 Mark II camera',
            priceAmount: 980,
            priceCurrency: 'USD',
            depthRating: 40,
            material: 'ABS Plastic',
            housingManufacturerId: seafrogs.id,
            cameraId: canonR6MarkII.id
        }
    })

    await prisma.housing.create({
        data: {
            model: 'SF-ZV-E1',
            name: 'Sony ZV-E1 40M/130FT Underwater Camera Housing',
            slug: 'sony-zv-e1',
            description: 'Professional underwater housing for Sony ZV-E1 camera with full control access',
            priceAmount: 455,
            priceCurrency: 'USD',
            depthRating: 40,
            material: 'ABS Plastic',
            housingManufacturerId: seafrogs.id,
            cameraId: sonyZVE1.id
        }
    })

    await prisma.housing.create({
        data: {
            model: 'SF-A7III-SL',
            name: 'Sea Frogs Salted Line Underwater Camera Housing for Sony A7 III',
            slug: 'sony-a7-iii-salted',
            description: 'Enhanced Salted Line underwater housing for Sony A7 III with improved ergonomics',
            priceAmount: 520,
            priceCurrency: 'USD',
            depthRating: 40,
            material: 'ABS Plastic',
            housingManufacturerId: seafrogs.id,
            cameraId: sonyA7III.id
        }
    })

    await prisma.housing.create({
        data: {
            model: 'SF-A7RV',
            name: 'Sony A7R V 40M/130FT Underwater Camera Housing',
            slug: 'sony-a7r-v',
            description: 'Professional underwater housing for Sony A7R V high-resolution camera',
            priceAmount: 630,
            priceCurrency: 'USD',
            depthRating: 40,
            material: 'ABS Plastic',
            housingManufacturerId: seafrogs.id,
            cameraId: sonyA7RV.id
        }
    })

    await prisma.housing.create({
        data: {
            model: 'SF-A6700',
            name: 'Sony A6700 40M/130FT Underwater Camera Housing',
            slug: 'sony-a6700',
            description: 'Compact underwater housing for Sony A6700 APS-C camera',
            priceAmount: 485,
            priceCurrency: 'USD',
            depthRating: 40,
            material: 'ABS Plastic',
            housingManufacturerId: seafrogs.id,
            cameraId: sonyA6700.id
        }
    })

    await prisma.housing.create({
        data: {
            model: 'SF-FX3-SL',
            name: 'Sea Frogs Salted Line Underwater Camera Housing for Sony FX3',
            slug: 'sony-fx3-salted',
            description: 'Professional cinema camera housing for Sony FX3 with HDMI 2.0 support',
            priceAmount: 636,
            priceCurrency: 'USD',
            depthRating: 40,
            material: 'ABS Plastic',
            housingManufacturerId: seafrogs.id,
            cameraId: sonyFX3.id
        }
    })

    await prisma.housing.create({
        data: {
            model: 'SF-R5',
            name: 'Canon EOS R5 40M/130FT Underwater Camera Housing',
            slug: 'canon-r5',
            description: 'High-performance underwater housing for Canon EOS R5 professional camera',
            priceAmount: 720,
            priceCurrency: 'USD',
            depthRating: 40,
            material: 'ABS Plastic',
            housingManufacturerId: seafrogs.id,
            cameraId: canonR5.id
        }
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