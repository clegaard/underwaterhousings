/** @type {import('next').NextConfig} */
const nextConfig = {
    allowedDevOrigins: ['macbook-pro-3.local', process.env.APP_PUBLIC_BASE],
    images: {

        formats: ['image/avif', 'image/webp'],
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
            {
                // Google OAuth avatars
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com',
            },
            {
                // Facebook/Meta OAuth avatars
                protocol: 'https',
                hostname: '*.fbcdn.net',
            },
            {
                protocol: 'https',
                hostname: 'platform-lookaside.fbsbx.com',
            },
            {
                // Instagram OAuth avatars
                protocol: 'https',
                hostname: '*.cdninstagram.com',
            },
        ],
    },
}

module.exports = nextConfig


