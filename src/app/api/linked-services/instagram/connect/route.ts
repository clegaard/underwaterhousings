import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'
import { getInstagramLinkedServiceCredentials } from '@/lib/instagramLinkedService'

const INSTAGRAM_AUTH_URL = 'https://www.instagram.com/oauth/authorize'
const SCOPE = 'instagram_business_basic'

// GET /api/linked-services/instagram/connect
// Initiates the Instagram OAuth flow. Redirects the user to Instagram's
// authorization page. A CSRF state token is stored in an httpOnly cookie.
export async function GET() {
    const session = await auth()
    const appBase = (process.env.APP_PUBLIC_URL ?? process.env.NEXTAUTH_URL)!

    if (!session?.user?.id) {
        return NextResponse.redirect(new URL('/auth/login', appBase))
    }

    const { clientId } = getInstagramLinkedServiceCredentials()
    if (!clientId) {
        return NextResponse.json(
            { error: 'Instagram integration is not configured. Set INSTAGRAM_PLATFORM_CLIENT_ID/SECRET or reuse INSTAGRAM_CLIENT_ID/SECRET.' },
            { status: 503 }
        )
    }

    // Generate a random CSRF state token
    const state = randomBytes(32).toString('hex')

    // APP_PUBLIC_URL allows using a public address (e.g. ngrok) while NEXTAUTH_URL stays on localhost
    const redirectUri = `${appBase}/api/linked-services/instagram/callback`

    const authUrl = new URL(INSTAGRAM_AUTH_URL)
    authUrl.searchParams.set('client_id', clientId)
    authUrl.searchParams.set('redirect_uri', redirectUri)
    authUrl.searchParams.set('scope', SCOPE)
    authUrl.searchParams.set('response_type', 'code')
    authUrl.searchParams.set('state', state)

    const cookieStore = await cookies()
    cookieStore.set('ig_oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 600, // 10 minutes
        path: '/',
    })

    return NextResponse.redirect(authUrl.toString())
}
