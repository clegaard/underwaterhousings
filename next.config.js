/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        formats: ['image/webp'],
        remotePatterns: [
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