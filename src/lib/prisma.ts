import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    prisma: any | undefined
}

function toNum(val: unknown): number | null {
    return val != null ? Number(val) : null
}

// Recursively converts Decimal instances to numbers and produces plain objects
// (string-keyed only), stripping symbol-keyed properties from pg row objects so
// results are safe to pass across the React 19 Server→Client Component boundary.
function sanitize(val: unknown): unknown {
    if (val == null) return val
    if (val instanceof Date) return val
    if (typeof val === 'object') {
        // Decimal instances expose a toNumber() method
        if (typeof (val as { toNumber?: unknown }).toNumber === 'function') {
            return (val as { toNumber: () => number }).toNumber()
        }
        if (Array.isArray(val)) return val.map(sanitize)
        const out: Record<string, unknown> = {}
        for (const key of Object.keys(val)) {
            out[key] = sanitize((val as Record<string, unknown>)[key])
        }
        return out
    }
    return val
}

function makePrismaClient() {
    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
    return new PrismaClient({ adapter, log: process.env.NODE_ENV === 'development' ? ['query'] : [] })
        .$extends({
            result: {
                camera: { priceAmount: { needs: { priceAmount: true }, compute: (d) => toNum(d.priceAmount) } },
                housing: { priceAmount: { needs: { priceAmount: true }, compute: (d) => toNum(d.priceAmount) } },
                port: { priceAmount: { needs: { priceAmount: true }, compute: (d) => toNum(d.priceAmount) } },
                lens: { priceAmount: { needs: { priceAmount: true }, compute: (d) => toNum(d.priceAmount) } },
                extensionRing: { priceAmount: { needs: { priceAmount: true }, compute: (d) => toNum(d.priceAmount) } },
                portAdapter: { priceAmount: { needs: { priceAmount: true }, compute: (d) => toNum(d.priceAmount) } },
                gear: { priceAmount: { needs: { priceAmount: true }, compute: (d) => toNum(d.priceAmount) } },
            },
        })
        .$extends({
            query: {
                $allModels: {
                    // Strip pg row symbols (nodejs.util.inspect.custom etc.) so plain objects
                    // can safely cross the Server→Client Component boundary in React 19.
                    async $allOperations({ args, query }) {
                        const result = await query(args)
                        if (result == null) return result
                        return sanitize(result)
                    },
                },
            },
        })
}

export const prisma: ReturnType<typeof makePrismaClient> =
    globalForPrisma.prisma ?? makePrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma