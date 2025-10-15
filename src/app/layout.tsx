import './globals.css'
import type { Metadata } from 'next'
import NavigationWrapper from '@/components/NavigationWrapper'

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
                <NavigationWrapper />
                {children}
            </body>
        </html>
    )
}