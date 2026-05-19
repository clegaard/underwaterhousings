'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

const NAV_ITEMS = [
    {
        group: 'Account',
        items: [
            {
                label: 'Profile',
                href: '/settings/profile',
                icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                    </svg>
                ),
            },
        ],
    },
    {
        group: 'Content',
        items: [
            {
                label: 'Gallery',
                href: '/settings/gallery',
                icon: (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                    </svg>
                ),
            },
        ],
    },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const { data: session, status } = useSession()
    const router = useRouter()

    useEffect(() => {
        if (status === 'unauthenticated') {
            router.replace('/auth/login')
        }
    }, [status, router])

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
        )
    }

    if (!session) return null

    return (
        <div className="max-w-5xl mx-auto px-4 py-10">
            <h1 className="text-2xl font-semibold text-gray-900 mb-8">Settings</h1>
            <div className="flex gap-8">
                {/* Sidebar */}
                <aside className="w-56 shrink-0">
                    <nav className="space-y-6">
                        {NAV_ITEMS.map(({ group, items }) => (
                            <div key={group}>
                                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1 px-3">
                                    {group}
                                </p>
                                <ul className="space-y-0.5">
                                    {items.map(({ label, href, icon }) => {
                                        const active = pathname === href
                                        return (
                                            <li key={href}>
                                                <Link
                                                    href={href}
                                                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${active
                                                        ? 'bg-blue-50 text-blue-700'
                                                        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                                                        }`}
                                                >
                                                    <span className={active ? 'text-blue-500' : 'text-gray-400'}>{icon}</span>
                                                    {label}
                                                </Link>
                                            </li>
                                        )
                                    })}
                                </ul>
                            </div>
                        ))}
                    </nav>
                </aside>

                {/* Page content */}
                <main className="flex-1 min-w-0">
                    {children}
                </main>
            </div>
        </div>
    )
}
