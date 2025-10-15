import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
            description: 'Premium underwater housings for professional photography'
        }
    })

    const seafrogs = await prisma.housingManufacturer.create({
        data: {
            name: 'Sea Frogs',
            description: 'Affordable underwater housings for mirrorless and compact cameras'
        }
    })

    // Create camera manufacturers
    const sony = await prisma.cameraManufacturer.create({
        data: {
            name: 'Sony',
            isActive: true
        }
    })

    const canon = await prisma.cameraManufacturer.create({
        data: {
            name: 'Canon',
            isActive: true
        }
    })

    const nikon = await prisma.cameraManufacturer.create({
        data: {
            name: 'Nikon',
            isActive: true
        }
    })

    const omSystem = await prisma.cameraManufacturer.create({
        data: {
            name: 'OM System',
            isActive: true
        }
    })

    // Create camera models based on scraped data
    const sonyZVE1 = await prisma.camera.create({
        data: {
            name: 'ZV-E1',
            cameraManufacturerId: sony.id
        }
    })

    const sonyFX3 = await prisma.camera.create({
        data: {
            name: 'FX3',
            cameraManufacturerId: sony.id
        }
    })

    const sonyFX30 = await prisma.camera.create({
        data: {
            name: 'FX30',
            cameraManufacturerId: sony.id
        }
    })

    const canonR50 = await prisma.camera.create({
        data: {
            name: 'EOS R50',
            cameraManufacturerId: canon.id
        }
    })

    const canonR6MarkII = await prisma.camera.create({
        data: {
            name: 'EOS R6 Mark II',
            cameraManufacturerId: canon.id
        }
    })

    const canonR5 = await prisma.camera.create({
        data: {
            name: 'EOS R5',
            cameraManufacturerId: canon.id
        }
    })

    const nikonZ8 = await prisma.camera.create({
        data: {
            name: 'Z8',
            cameraManufacturerId: nikon.id
        }
    })

    const nikonZ5II = await prisma.camera.create({
        data: {
            name: 'Z5 II',
            cameraManufacturerId: nikon.id
        }
    })

    const omOM5II = await prisma.camera.create({
        data: {
            name: 'OM-5 II',
            cameraManufacturerId: omSystem.id
        }
    })

    // Create housings based on scraped data from Nauticam
    await prisma.housing.create({
        data: {
            model: 'NA-Z8',
            name: 'NA-Z8 Housing for Nikon Z8 Camera',
            description: 'Professional underwater housing for the Nikon Z8 camera',
            priceAmount: 5500,
            priceCurrency: 'USD',
            depthRating: '100m/330ft',
            material: 'Aluminum',
            housingManufacturerId: nauticam.id,
            cameraId: nikonZ8.id
        }
    })

    await prisma.housing.create({
        data: {
            model: 'NA-Z5II',
            name: 'NA-Z5II Housing for Nikon Z5II Camera',
            description: 'Professional underwater housing for the Nikon Z5II camera',
            priceAmount: 3400,
            priceCurrency: 'USD',
            depthRating: '100m/330ft',
            material: 'Aluminum',
            housingManufacturerId: nauticam.id,
            cameraId: nikonZ5II.id
        }
    })

    await prisma.housing.create({
        data: {
            model: 'NA-OM5II',
            name: 'NA-OM5II Housing for OM SYSTEM OM-5II Camera',
            description: 'Professional underwater housing for the OM SYSTEM OM-5II camera',
            priceAmount: 1800,
            priceCurrency: 'USD',
            depthRating: '100m/330ft',
            material: 'Aluminum',
            housingManufacturerId: nauticam.id,
            cameraId: omOM5II.id
        }
    })

    // Create housings based on scraped data from Sea Frogs
    await prisma.housing.create({
        data: {
            model: 'SF-ZV-E1',
            name: 'Sony ZV-E1 40M/130FT Underwater Camera Housing',
            description: 'Affordable underwater housing for Sony ZV-E1 camera',
            priceAmount: 455,
            priceCurrency: 'USD',
            depthRating: '40m/130ft',
            material: 'Aluminum',
            housingManufacturerId: seafrogs.id,
            cameraId: sonyZVE1.id
        }
    })

    await prisma.housing.create({
        data: {
            model: 'SF-FX3-FX30',
            name: 'Sea Frogs Salted Line Underwater Camera Housing for Sony FX3/FX30',
            description: 'Professional underwater housing for Sony FX3/FX30 with HDMI 2.0 support',
            priceAmount: 636,
            priceCurrency: 'USD',
            depthRating: '40m/130ft',
            material: 'Aluminum',
            housingManufacturerId: seafrogs.id,
            cameraId: sonyFX3.id
        }
    })

    await prisma.housing.create({
        data: {
            model: 'SF-R50',
            name: 'Sea Frogs Canon EOS R50 40m/130ft Underwater Camera Housing',
            description: 'Affordable underwater housing for Canon EOS R50 camera',
            priceAmount: 424,
            priceCurrency: 'USD',
            depthRating: '40m/130ft',
            material: 'Aluminum',
            housingManufacturerId: seafrogs.id,
            cameraId: canonR50.id
        }
    })

    await prisma.housing.create({
        data: {
            model: 'SF-R6-MarkII',
            name: 'Sea Frogs 40m/130ft Underwater Camera Housing for Canon EOS R6 Mark II',
            description: 'Professional underwater housing for Canon EOS R6 Mark II camera',
            priceAmount: 980,
            priceCurrency: 'USD',
            depthRating: '40m/130ft',
            material: 'Aluminum',
            housingManufacturerId: seafrogs.id,
            cameraId: canonR6MarkII.id
        }
    })

    await prisma.housing.create({
        data: {
            model: 'SF-R5',
            name: 'SeaFrogs 40m/130ft Underwater Camera Housing for Canon EOS R5',
            description: 'Professional underwater housing for Canon EOS R5 camera',
            priceAmount: 980,
            priceCurrency: 'USD',
            depthRating: '40m/130ft',
            material: 'Aluminum',
            housingManufacturerId: seafrogs.id,
            cameraId: canonR5.id
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