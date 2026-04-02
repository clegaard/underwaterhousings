import './globals.css'
import type { Metadata } from 'next'
import NavigationWrapper from '@/components/NavigationWrapper'
import AuthProvider from '@/components/AuthProvider'
import { auth } from '@/auth'

export const metadata: Metadata = {
    title: 'Underwater Camera Housings',
    description: 'Comprehensive catalog of underwater camera housings from leading manufacturers',
}

export default async function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const session = await auth()
    return (
        <html lang="en">
            <body className="antialiased">
                <AuthProvider session={session}>
                    <NavigationWrapper />
                    {children}
                </AuthProvider>
            </body>
        </html>
    )
}