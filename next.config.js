/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        formats: ['image/webp'],
        remotePatterns: [
            {
                // MinIO local dev
                protocol: 'http',
                hostname: 'localhost',
                port: '9000',
            },
            {
                // MinIO accessed via Docker service name
                protocol: 'http',
                hostname: 'minio',
                port: '9000',
            },
            {
                protocol: 'https',
                hostname: 'www.nauticam.com',
            },
            {
                protocol: 'https',
                hostname: 'www.aquatica.ca',
            },
            {
                protocol: 'https',
                hostname: 'www.isotecnic.it',
            },
            {
                protocol: 'https',
                hostname: 'www.divevolkdiving.com',
            },
            {
                protocol: 'https',
                hostname: 'www.aoi-uw.com',
            },
            {
                protocol: 'https',
                hostname: 'www.seafrogs.com.hk',
            },
        ],
    },
}

module.exports = nextConfig