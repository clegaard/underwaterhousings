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
            slug: 'sony',
            isActive: true
        }
    })

    const canon = await prisma.cameraManufacturer.create({
        data: {
            name: 'Canon',
            slug: 'canon',
            isActive: true
        }
    })

    const nikon = await prisma.cameraManufacturer.create({
        data: {
            name: 'Nikon',
            slug: 'nikon',
            isActive: true
        }
    })

    const omSystem = await prisma.cameraManufacturer.create({
        data: {
            name: 'OM System',
            slug: 'om-system',
            isActive: true
        }
    })

    const apple = await prisma.cameraManufacturer.create({
        data: {
            name: 'Apple',
            slug: 'apple',
            isActive: true
        }
    })

    // Create camera models based on scraped data


    const canonR6MarkII = await prisma.camera.create({
        data: {
            name: 'EOS R6 Mark II',
            slug: 'r6-ii',
            cameraManufacturerId: canon.id
        }
    })


    const omOM5II = await prisma.camera.create({
        data: {
            name: 'OM-5 II',
            slug: 'om5-ii',
            cameraManufacturerId: omSystem.id
        }
    })


    const iphone14Pro = await prisma.camera.create({
        data: {
            name: 'Iphone 14 Pro',
            slug: 'iphone-14-pro',
            cameraManufacturerId: apple.id
        }
    })


    // Create housings based on scraped data from Nauticam


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

    await prisma.housing.create({
        data: {
            model: 'SeaTouch 4',
            name: 'SeaTouch Pro',
            slug: 'seatouch-4',
            description: 'some case',
            priceAmount: 300,
            priceCurrency: 'USD',
            depthRating: 60,
            material: 'ABS plastic',
            housingManufacturerId: divevolk.id,
            cameraId: iphone14Pro.id,

        }
    })


    await prisma.housing.create({
        data: {
            model: 'SF-R6-MarkII',
            name: 'Sea Frogs 40m/130ft Underwater Camera Housing for Canon EOS R6 Mark II',
            slug: 'r6-ii',
            description: 'Professional underwater housing for Canon EOS R6 Mark II camera',
            priceAmount: 980,
            priceCurrency: 'USD',
            depthRating: 40,
            material: 'ABS Plastic',
            housingManufacturerId: seafrogs.id,
            cameraId: canonR6MarkII.id
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