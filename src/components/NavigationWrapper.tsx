// Server component — data is fetched at render time on the server, so the
// navigation bar arrives fully populated in the initial HTML with no loading
// state and no client-side API round-trips.
import Navigation from './Navigation'
import { prisma } from '@/lib/prisma'

export default async function NavigationWrapper() {
    const [
        housingManufacturers,
        cameraManufacturers,
        lensManufacturers,
        portManufacturers,
    ] = await Promise.all([
        prisma.manufacturer.findMany({
            where: { housings: { some: {} } },
            select: { id: true, name: true, slug: true },
            orderBy: { name: 'asc' },
        }),
        prisma.manufacturer.findMany({
            where: { cameras: { some: {} } },
            select: { id: true, name: true, slug: true },
            orderBy: { name: 'asc' },
        }),
        prisma.manufacturer.findMany({
            where: { lenses: { some: {} } },
            select: { id: true, name: true, slug: true },
            orderBy: { name: 'asc' },
        }),
        prisma.manufacturer.findMany({
            where: { ports: { some: {} } },
            select: { id: true, name: true, slug: true },
            orderBy: { name: 'asc' },
        }),
    ])

    return (
        <Navigation
            manufacturers={housingManufacturers}
            cameraManufacturers={cameraManufacturers}
            lensManufacturers={lensManufacturers}
            portManufacturers={portManufacturers}
        />
    )
}