import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import Google from 'next-auth/providers/google'
import Facebook from 'next-auth/providers/facebook'
import Apple from 'next-auth/providers/apple'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
        }),
        Facebook({
            clientId: process.env.FACEBOOK_CLIENT_ID!,
            clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
        }),
        Apple({
            clientId: process.env.APPLE_ID!,
            clientSecret: process.env.APPLE_SECRET!,
        }),
        Credentials({
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null

                const user = await prisma.user.findUnique({
                    where: { email: String(credentials.email) },
                })

                if (!user || !user.password) return null

                const valid = await bcrypt.compare(String(credentials.password), user.password)
                if (!valid) return null

                return {
                    id: String(user.id),
                    email: user.email,
                    name: user.name ?? undefined,
                    isSuperuser: user.isSuperuser,
                    isUser: user.isUser,
                }
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account }) {
            // Credentials sign-in is handled by authorize() above
            if (!account || account.provider === 'credentials') return true

            const email = user.email
            if (!email) return false

            // Find or create the user record for this OAuth identity
            const existing = await prisma.user.findUnique({ where: { email } })
            if (!existing) {
                await prisma.user.create({
                    data: {
                        email,
                        name: user.name ?? null,
                        oauthAvatarUrl: user.image ?? null,
                    },
                })
            } else if (user.image) {
                // Refresh provider avatar on every sign-in (it may change)
                await prisma.user.update({
                    where: { id: existing.id },
                    data: { oauthAvatarUrl: user.image },
                })
            }
            return true
        },
        async jwt({ token, user, account }) {
            if (user && account) {
                if (account.provider === 'credentials') {
                    token['id'] = user.id
                    const u = user as { isSuperuser?: boolean; isUser?: boolean }
                    token['isSuperuser'] = u.isSuperuser
                    token['isUser'] = u.isUser
                } else {
                    // OAuth: look up our DB record to get id + roles
                    const email = user.email
                    if (email) {
                        const dbUser = await prisma.user.findUnique({
                            where: { email },
                            select: { id: true, isSuperuser: true, isUser: true },
                        })
                        if (dbUser) {
                            token['id'] = String(dbUser.id)
                            token['isSuperuser'] = dbUser.isSuperuser
                            token['isUser'] = dbUser.isUser
                        }
                    }
                }
            }
            return token
        },
        session({ session, token }) {
            if (session.user) {
                session.user.id = token['id'] as string
                const s = session.user as { isSuperuser?: boolean; isUser?: boolean }
                s.isSuperuser = token['isSuperuser'] as boolean | undefined
                s.isUser = token['isUser'] as boolean | undefined
            }
            return session
        },
    },
    pages: {
        signIn: '/auth/login',
    },
})
