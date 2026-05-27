export function getInstagramLinkedServiceCredentials() {
    const clientId = process.env.INSTAGRAM_CLIENT_ID
    const clientSecret = process.env.INSTAGRAM_CLIENT_SECRET

    return { clientId, clientSecret }
}