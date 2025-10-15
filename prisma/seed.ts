import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Function to create URL-friendly slugs
function createSlug(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
        .trim()
}

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
            slug: createSlug('Nauticam'),
            description: 'Premium underwater housings for professional photography'
        }
    })

    const seafrogs = await prisma.housingManufacturer.create({
        data: {
            name: 'Sea Frogs',
            slug: createSlug('seafrogs'),
            description: 'Affordable underwater housings for mirrorless and compact cameras'
        }
    })

    // Create camera manufacturers
    const sony = await prisma.cameraManufacturer.create({
        data: {
            name: 'Sony',
            slug: createSlug('Sony'),
            isActive: true
        }
    })

    const canon = await prisma.cameraManufacturer.create({
        data: {
            name: 'Canon',
            slug: createSlug('Canon'),
            isActive: true
        }
    })

    const nikon = await prisma.cameraManufacturer.create({
        data: {
            name: 'Nikon',
            slug: createSlug('Nikon'),
            isActive: true
        }
    })

    const omSystem = await prisma.cameraManufacturer.create({
        data: {
            name: 'OM System',
            slug: createSlug('OM System'),
            isActive: true
        }
    })

    // Create camera models based on scraped data
    const sonyZVE1 = await prisma.camera.create({
        data: {
            name: 'ZV-E1',
            slug: createSlug('Sony ZV-E1'),
            cameraManufacturerId: sony.id
        }
    })

    const sonyFX3 = await prisma.camera.create({
        data: {
            name: 'FX3',
            slug: createSlug('Sony FX3'),
            cameraManufacturerId: sony.id
        }
    })

    const sonyFX30 = await prisma.camera.create({
        data: {
            name: 'FX30',
            slug: createSlug('Sony FX30'),
            cameraManufacturerId: sony.id
        }
    })

    const canonR50 = await prisma.camera.create({
        data: {
            name: 'EOS R50',
            slug: createSlug('Canon EOS R50'),
            cameraManufacturerId: canon.id
        }
    })

    const canonR6MarkII = await prisma.camera.create({
        data: {
            name: 'EOS R6 Mark II',
            slug: createSlug('r6-mark-ii'),
            cameraManufacturerId: canon.id
        }
    })

    const canonR5 = await prisma.camera.create({
        data: {
            name: 'EOS R5',
            slug: createSlug('Canon EOS R5'),
            cameraManufacturerId: canon.id
        }
    })

    const nikonZ8 = await prisma.camera.create({
        data: {
            name: 'Z8',
            slug: createSlug('Nikon Z8'),
            cameraManufacturerId: nikon.id
        }
    })

    const nikonZ5II = await prisma.camera.create({
        data: {
            name: 'Z5 II',
            slug: createSlug('Nikon Z5 II'),
            cameraManufacturerId: nikon.id
        }
    })

    const omOM5II = await prisma.camera.create({
        data: {
            name: 'OM-5 II',
            slug: createSlug('om5-ii'),
            cameraManufacturerId: omSystem.id
        }
    })

    // Create housings based on scraped data from Nauticam


    await prisma.housing.create({
        data: {
            model: 'NA-OM5II',
            name: 'NA-OM5II Housing for OM SYSTEM OM-5II Camera',
            slug: createSlug('na-om-5-ii'),
            description: 'Professional underwater housing for the OM SYSTEM OM-5II camera',
            priceAmount: 1800,
            priceCurrency: 'USD',
            depthRating: '100m/330ft',
            material: 'Aluminum',
            housingManufacturerId: nauticam.id,
            cameraId: omOM5II.id,

        }
    })



    await prisma.housing.create({
        data: {
            model: 'SF-R6-MarkII',
            name: 'Sea Frogs 40m/130ft Underwater Camera Housing for Canon EOS R6 Mark II',
            slug: createSlug('r6-mark-ii'),
            description: 'Professional underwater housing for Canon EOS R6 Mark II camera',
            priceAmount: 980,
            priceCurrency: 'USD',
            depthRating: '40m/130ft',
            material: 'Aluminum',
            housingManufacturerId: seafrogs.id,
            cameraId: canonR6MarkII.id
        }
    })



    console.log('✅ Database seeded successfully!')
    console.log('📊 Created:')
    console.log('  - 2 housing manufacturers (Nauticam, Sea Frogs)')
    console.log('  - 4 camera manufacturers (Sony, Canon, Nikon, OM System)')
    console.log('  - 9 camera models')
    console.log('  - 8 housing products')
}

main()
    .catch((e) => {
        console.error('❌ Error seeding database:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })