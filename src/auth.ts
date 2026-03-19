import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const { handlers, signIn, signOut, auth } = NextAuth({
    providers: [
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

                if (!user) return null

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
        jwt({ token, user }) {
            if (user) {
                const u = user as { isSuperuser?: boolean; isUser?: boolean }
                token['isSuperuser'] = u.isSuperuser
                token['isUser'] = u.isUser
            }
            return token
        },
        session({ session, token }) {
            if (session.user) {
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
