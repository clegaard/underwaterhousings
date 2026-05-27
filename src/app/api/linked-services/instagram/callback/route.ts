import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { getInstagramLinkedServiceCredentials } from '@/lib/instagramLinkedService'

const TOKEN_URL = 'https://api.instagram.com/oauth/access_token'
const LONG_LIVED_URL = 'https://graph.instagram.com/access_token'
const PROFILE_URL = 'https://graph.instagram.com/me'

const SETTINGS_BASE = '/settings/linked-services/instagram'

// GET /api/linked-services/instagram/callback
// Handles the redirect back from Instagram after the user authorizes the app.
// Exchanges the code for a long-lived access token and stores it.
export async function GET(req: NextRequest) {
    const session = await auth()
    const appBase = process.env.APP_PUBLIC_URL

    if (!session?.user?.id) {
        return NextResponse.redirect(new URL('/auth/login', appBase))
    }
    const userId = parseInt(session.user.id, 10)

    const { searchParams } = req.nextUrl
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const errorParam = searchParams.get('error')

    // User denied access
    if (errorParam) {
        const url = new URL(SETTINGS_BASE, appBase)
        url.searchParams.set('error', 'access_denied')
        return NextResponse.redirect(url.toString())
    }

    if (!code || !state) {
        const url = new URL(SETTINGS_BASE, appBase)
        url.searchParams.set('error', 'invalid_callback')
        return NextResponse.redirect(url.toString())
    }

    // Verify CSRF state
    const cookieStore = await cookies()
    const savedState = cookieStore.get('ig_oauth_state')?.value
    cookieStore.delete('ig_oauth_state')

    if (!savedState || savedState !== state) {
        const url = new URL(SETTINGS_BASE, appBase)
        url.searchParams.set('error', 'state_mismatch')
        return NextResponse.redirect(url.toString())
    }

    const { clientId, clientSecret } = getInstagramLinkedServiceCredentials()
    if (!clientId || !clientSecret) {
        const url = new URL(SETTINGS_BASE, appBase)
        url.searchParams.set('error', 'not_configured')
        return NextResponse.redirect(url.toString())
    }
    // Must match the redirect_uri used in the connect step exactly
    const publicBase = appBase
    const redirectUri = `${publicBase}/api/linked-services/instagram/callback`

    try {
        // 1. Exchange authorization code for a short-lived access token
        const tokenRes = await fetch(TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri,
                code,
            }),
        })

        if (!tokenRes.ok) {
            throw new Error(`Token exchange failed: ${tokenRes.status}`)
        }

        const tokenData = await tokenRes.json() as {
            access_token: string
            token_type: string
            expires_in?: number
            user_id: string
        }

        // 2. Exchange short-lived token for a long-lived token (valid ~60 days)
        const longLivedRes = await fetch(
            `${LONG_LIVED_URL}?grant_type=ig_exchange_token&client_secret=${clientSecret}&access_token=${tokenData.access_token}`
        )

        if (!longLivedRes.ok) {
            throw new Error(`Long-lived token exchange failed: ${longLivedRes.status}`)
        }

        const longLivedData = await longLivedRes.json() as {
            access_token: string
            token_type: string
            expires_in: number
        }

        const accessToken = longLivedData.access_token
        const expiresInSeconds = longLivedData.expires_in
        const tokenExpiry = new Date(Date.now() + expiresInSeconds * 1000)

        // 3. Fetch the user's Instagram profile (username)
        const profileRes = await fetch(
            `${PROFILE_URL}?fields=id,username&access_token=${accessToken}`
        )

        let serviceUserId: string | null = tokenData.user_id ?? null
        let serviceUsername: string | null = null

        if (profileRes.ok) {
            const profile = await profileRes.json() as { id?: string; username?: string }
            serviceUserId = profile.id ?? serviceUserId
            serviceUsername = profile.username ?? null
        }

        // 4. Upsert the LinkedService record
        await prisma.linkedService.upsert({
            where: { userId_service: { userId, service: 'instagram' } },
            create: {
                userId,
                service: 'instagram',
                accessToken,
                tokenExpiry,
                serviceUserId,
                serviceUsername,
                scopes: 'instagram_business_basic',
            },
            update: {
                accessToken,
                tokenExpiry,
                serviceUserId,
                serviceUsername,
                scopes: 'instagram_business_basic',
            },
        })

        const successUrl = new URL(SETTINGS_BASE, appBase)
        successUrl.searchParams.set('connected', '1')
        return NextResponse.redirect(successUrl.toString())
    } catch (err) {
        console.error('[Instagram callback]', err)
        const url = new URL(SETTINGS_BASE, appBase)
        url.searchParams.set('error', 'token_exchange_failed')
        return NextResponse.redirect(url.toString())
    }
}
