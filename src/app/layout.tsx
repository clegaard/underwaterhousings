import './globals.css'
import type { Metadata } from 'next'
import NavigationWrapper from '@/components/NavigationWrapper'
import AuthProvider from '@/components/AuthProvider'

export const metadata: Metadata = {
    title: 'Underwater Camera Housings',
    description: 'Comprehensive catalog of underwater camera housings from leading manufacturers',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className="antialiased">
                <AuthProvider>
                    <NavigationWrapper />
                    {children}
                </AuthProvider>
            </body>
        </html>
    )
}