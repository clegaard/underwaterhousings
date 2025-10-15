import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding database...')

    // Create manufacturers
    const nauticam = await prisma.manufacturer.upsert({
        where: { name: 'Nauticam' },
        update: {},
        create: {
            name: 'Nauticam',
            slug: 'nauticam',
            website: 'https://www.nauticam.com',
            description: 'Premium underwater housings for professional photography',
            country: 'Hong Kong',
            founded: 2009,
            isActive: true
        }
    })

    const aquatica = await prisma.manufacturer.upsert({
        where: { name: 'Aquatica' },
        update: {},
        create: {
            name: 'Aquatica',
            slug: 'aquatica',
            website: 'https://www.aquatica.ca',
            description: 'High-quality housings for Canon and Nikon cameras',
            country: 'Canada',
            founded: 1982,
            isActive: true
        }
    })

    const isotta = await prisma.manufacturer.upsert({
        where: { name: 'Isotta' },
        update: {},
        create: {
            name: 'Isotta',
            slug: 'isotta',
            website: 'https://www.isotecnic.it',
            description: 'Italian-made underwater housings with precision engineering',
            country: 'Italy',
            founded: 1980,
            isActive: true
        }
    })

    const aoi = await prisma.manufacturer.upsert({
        where: { name: 'AOI' },
        update: {},
        create: {
            name: 'AOI',
            slug: 'aoi',
            website: 'https://www.aoi-uw.com',
            description: 'Underwater housings and accessories from Taiwan',
            country: 'Taiwan',
            isActive: true
        }
    })

    const seafrogs = await prisma.manufacturer.upsert({
        where: { name: 'Sea Frogs' },
        update: {},
        create: {
            name: 'Sea Frogs',
            slug: 'seafrogs',
            website: 'https://www.seafrogs.com.hk',
            description: 'Affordable underwater housings for mirrorless and compact cameras',
            country: 'Hong Kong',
            isActive: true
        }
    })

    const divevolk = await prisma.manufacturer.upsert({
        where: { name: 'DiveVolk' },
        update: {},
        create: {
            name: 'DiveVolk',
            slug: 'divevolk',
            website: 'https://www.divevolkdiving.com',
            description: 'Innovative underwater smartphone housings with touchscreen technology',
            country: 'China',
            isActive: true
        }
    })

    // Create camera brands
    const canon = await prisma.cameraBrand.upsert({
        where: { name: 'Canon' },
        update: {},
        create: {
            name: 'Canon',
            slug: 'canon',
            website: 'https://www.canon.com',
            isActive: true
        }
    })

    const nikon = await prisma.cameraBrand.upsert({
        where: { name: 'Nikon' },
        update: {},
        create: {
            name: 'Nikon',
            slug: 'nikon',
            website: 'https://www.nikon.com',
            isActive: true
        }
    })

    const sony = await prisma.cameraBrand.upsert({
        where: { name: 'Sony' },
        update: {},
        create: {
            name: 'Sony',
            slug: 'sony',
            website: 'https://www.sony.com',
            isActive: true
        }
    })

    const omSystem = await prisma.cameraBrand.upsert({
        where: { name: 'OM System' },
        update: {},
        create: {
            name: 'OM System',
            slug: 'om-system',
            website: 'https://www.olympus-imaging.com',
            isActive: true
        }
    })

    // Create camera models
    const nikonZ8 = await prisma.cameraModel.upsert({
        where: { slug: 'nikon-z8' },
        update: {},
        create: {
            name: 'Z8',
            fullName: 'Nikon Z8',
            slug: 'nikon-z8',
            type: 'MIRRORLESS',
            releaseYear: 2023,
            brandId: nikon.id,
            specifications: {
                sensor: 'Full Frame',
                megapixels: 45.7,
                videoCapabilities: '8K, 4K'
            }
        }
    })

    const sonyA7RV = await prisma.cameraModel.upsert({
        where: { slug: 'sony-a7r-v' },
        update: {},
        create: {
            name: 'A7R V',
            fullName: 'Sony A7R V',
            slug: 'sony-a7r-v',
            type: 'MIRRORLESS',
            releaseYear: 2022,
            brandId: sony.id,
            specifications: {
                sensor: 'Full Frame',
                megapixels: 61,
                videoCapabilities: '8K, 4K'
            }
        }
    })

    const canonR5II = await prisma.cameraModel.upsert({
        where: { slug: 'canon-eos-r5-mark-ii' },
        update: {},
        create: {
            name: 'EOS R5 Mark II',
            fullName: 'Canon EOS R5 Mark II',
            slug: 'canon-eos-r5-mark-ii',
            type: 'MIRRORLESS',
            releaseYear: 2024,
            brandId: canon.id,
            specifications: {
                sensor: 'Full Frame',
                megapixels: 45,
                videoCapabilities: '8K, 4K'
            }
        }
    })

    // Create sample housings
    const nauticamZ8 = await prisma.housing.upsert({
        where: { slug: 'nauticam-na-z8' },
        update: {},
        create: {
            model: 'NA-Z8',
            name: 'NA-Z8 Housing for Nikon Z8 Camera',
            slug: 'nauticam-na-z8',
            sku: '17229',
            category: 'CAMERA_HOUSING',
            description: 'Professional underwater housing for the Nikon Z8 camera',
            keyFeatures: [
                'Depth rated to 100m/330ft',
                'Full camera control access',
                'Nauticam N100 port system',
                'Precision CNC machined aluminum'
            ],
            priceAmount: 5500,
            priceCurrency: 'USD',
            depthRating: '100m/330ft',
            material: 'Aluminum',
            portSystem: 'N100',
            isActive: true,
            inStock: true,
            manufacturerId: nauticam.id,
            productUrl: 'https://www.nauticam.com/collections/housings/products/na-z8-underwater-housing-for-the-nikon-z8-camera'
        }
    })

    // Create housing compatibility
    await prisma.housingCompatibility.upsert({
        where: {
            housingId_cameraModelId: {
                housingId: nauticamZ8.id,
                cameraModelId: nikonZ8.id
            }
        },
        update: {},
        create: {
            housingId: nauticamZ8.id,
            cameraModelId: nikonZ8.id,
            isRecommended: true,
            notes: 'Perfect fit with full functionality'
        }
    })

    // Create accessory categories
    const portCategory = await prisma.accessoryCategory.upsert({
        where: { name: 'Ports' },
        update: {},
        create: {
            name: 'Ports',
            slug: 'ports',
            description: 'Lens ports for underwater housings'
        }
    })

    const armCategory = await prisma.accessoryCategory.upsert({
        where: { name: 'Arms & Clamps' },
        update: {},
        create: {
            name: 'Arms & Clamps',
            slug: 'arms-clamps',
            description: 'Strobe arms and mounting clamps'
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