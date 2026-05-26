export function getInstagramLinkedServiceCredentials() {
    const clientId = process.env.INSTAGRAM_PLATFORM_CLIENT_ID ?? process.env.INSTAGRAM_CLIENT_ID
    const clientSecret = process.env.INSTAGRAM_PLATFORM_CLIENT_SECRET ?? process.env.INSTAGRAM_CLIENT_SECRET

    return {
        clientId,
        clientSecret,
        isFallback: !process.env.INSTAGRAM_PLATFORM_CLIENT_ID || !process.env.INSTAGRAM_PLATFORM_CLIENT_SECRET,
    }
}