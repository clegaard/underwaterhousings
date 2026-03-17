import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()


async function main() {
    console.log('🌱 Seeding database...')

    // Clear existing data
    await prisma.port.deleteMany()
    await prisma.housingMount.deleteMany()
    await prisma.housing.deleteMany()
    await prisma.camera.deleteMany()
    await prisma.lens.deleteMany()
    await prisma.cameraMount.deleteMany()
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

    // Create lenses
    const lensFE90MacroGOSS = await prisma.lens.create({
        data: {
            name: 'Sony FE 90mm f/2.8 Macro G OSS',
            slug: 'sel90m28g',
            cameraMountId: sonyE.id
        }
    })

    const lensFE2470GMII = await prisma.lens.create({
        data: {
            name: 'Sony FE 24-70mm f/2.8 GM II',
            slug: 'sel2470gmii',
            cameraMountId: sonyE.id
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
            slug: 'sony-fe-24-105mm-f4-g-oss',
            cameraMountId: sonyE.id
        }
    })

    const lensFE2870OSS = await prisma.lens.create({
        data: {
            name: 'Sony FE 28-70mm f/3.5-5.6 OSS',
            slug: 'sony-fe-28-70mm-f35-56-oss',
            cameraMountId: sonyE.id
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
            slug: 'sony-e-pz-18-105mm-f4-g-oss',
            cameraMountId: sonyE.id
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
            cameraMountId: sonyE.id
        }
    })

    const sonyA6700 = await prisma.camera.create({
        data: {
            name: 'A6700',
            slug: 'a6700',
            cameraManufacturerId: sony.id,
            cameraMountId: sonyE.id
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
            cameraMountId: canonRF.id
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
            cameraManufacturerId: apple.id
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
            slug: 'seafrogs-polycarbonate',
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
            housingMountId: mountTypeNauticamN120.id

        }
    })

    // DiveVolk housings
    await prisma.housing.create({
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
            housingMountId: mountTypeSeaFrogsPolycarbonate.id
        }
    })

    await prisma.housing.create({
        data: {
            name: 'Sony ZV-E1',
            slug: 'sony-zv-e1',
            description: 'Professional underwater housing for Sony ZV-E1 camera with full control access',
            priceAmount: 455,
            priceCurrency: 'USD',
            depthRating: 40,
            material: 'ABS Plastic',
            housingManufacturerId: seafrogs.id,
            cameraId: sonyZVE1.id,
            housingMountId: mountTypeSeaFrogsPolycarbonate.id
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
            housingMountId: mountTypeSeaFrogsPolycarbonate.id
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
            housingMountId: mountTypeSeaFrogsPolycarbonate.id
        }
    })

    // Create SeaFrogs ports for A7R V housing with lens compatibility
    // FL100 port combinations
    await prisma.port.create({
        data: {
            name: 'FL100',
            housingManufacturerId: seafrogs.id,
            housingMountId: mountTypeSeaFrogsPolycarbonate.id,
            housingId: housingA7RV.id,
            lens: { connect: [{ id: lensFE90MacroGOSS.id }, { id: lensFE2470GMII.id }, { id: lensFE24105F4GOSS.id }] },
            slug: 'fl100',
        }
    })

    // WA000S-A port combinations
    await prisma.port.create({
        data: {
            name: 'WA000S-A',
            housingManufacturerId: seafrogs.id,
            housingMountId: mountTypeSeaFrogsPolycarbonate.id,
            housingId: housingA7RV.id,
            lens: { connect: [{ id: lensFE24105F4GOSS.id }] },
            slug: 'wa000s-a'
        }
    })

    // FL1655 port combinations
    await prisma.port.create({
        data: {
            name: 'FL1655',
            housingManufacturerId: seafrogs.id,
            housingMountId: mountTypeSeaFrogsPolycarbonate.id,
            housingId: housingA7RV.id,
            lens: { connect: [{ id: lensFE2470F4ZAOSS.id }] },
            slug: 'fl1655'
        }
    })

    // FL1545 port combinations
    await prisma.port.create({
        data: {
            name: 'FL1545',
            housingManufacturerId: seafrogs.id,
            housingMountId: mountTypeSeaFrogsPolycarbonate.id,
            housingId: housingA7RV.id,
            lens: { connect: [{ id: lensFE1635F4.id }, { id: lensFE2870OSS.id }] },
            slug: 'fl1545'
        }
    })

    // WA005-B port combinations
    await prisma.port.create({
        data: {
            name: 'WA005-B',
            housingManufacturerId: seafrogs.id,
            housingMountId: mountTypeSeaFrogsPolycarbonate.id,
            housingId: housingA7RV.id,
            lens: { connect: [{ id: lensFE1635GM.id }] },
            slug: 'wa005-b'
        }
    })

    // WA005-F port combinations
    await prisma.port.create({
        data: {
            name: 'WA005-F',
            housingManufacturerId: seafrogs.id,
            housingMountId: mountTypeSeaFrogsPolycarbonate.id,
            housingId: housingA7RV.id,
            lens: { connect: [{ id: lensFE1224F4G.id }, { id: lensFEPZ1635F4G.id }] },
            slug: 'wa005-f'
        }
    })

    // FL2870 port combinations
    await prisma.port.create({
        data: {
            name: 'FL2870',
            housingManufacturerId: seafrogs.id,
            housingMountId: mountTypeSeaFrogsPolycarbonate.id,
            housingId: housingA7RV.id,
            lens: { connect: [{ id: lensEPZ18105F4GOSS.id }] },
            slug: 'fl2870'
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
            housingMountId: mountTypeSeaFrogsPolycarbonate.id
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
            housingMountId: mountTypeSeaFrogsPolycarbonate.id
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
            housingMountId: mountTypeSeaFrogsPolycarbonate.id
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