import Link from 'next/link'
import SearchBar from '@/components/SearchBar'

export default function Home() {
    return (
        <main className="min-h-screen bg-gradient-to-b from-blue-50 via-blue-50 to-white">

            {/* ── Hero ────────────────────────────────────────────────── */}
            <section className="mx-auto max-w-3xl px-4 pt-20 pb-16 text-center">
                <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-1.5 text-xs font-medium text-blue-600 shadow-sm">
                    <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500" />
                    </span>
                    Underwater camera rig builder
                </div>

                <h1 className="mb-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
                    Find your perfect
                    <br />
                    <span className="text-blue-600">underwater setup</span>
                </h1>
                <p className="mb-10 text-lg text-gray-500">
                    Search cameras, lenses, housings, ports and accessories — then build a compatible rig with optical analysis and depth ratings.
                </p>

                {/* Search bar */}
                <div className="relative mx-auto max-w-2xl">
                    <SearchBar placeholder="Try &ldquo;Sony A7R V&rdquo;, &ldquo;24-70mm&rdquo;, &ldquo;Nauticam&rdquo;…" />
                </div>

                <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
                    <Link
                        href="/builder"
                        className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow hover:bg-blue-700 active:bg-blue-800 transition-colors"
                    >
                        Build a rig
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </Link>
                    <Link
                        href="/gallery"
                        className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
                    >
                        Browse gallery
                    </Link>
                </div>
            </section>

            {/* ── Feature highlights ───────────────────────────────────── */}
            <section className="mx-auto max-w-4xl px-4 pb-20">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-xl">🌊</div>
                        <h3 className="mb-1 font-semibold text-gray-900">Depth ratings</h3>
                        <p className="text-sm text-gray-500">See the limiting depth for your housing and port combination at a glance.</p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-xl">🔭</div>
                        <h3 className="mb-1 font-semibold text-gray-900">Optical analysis</h3>
                        <p className="text-sm text-gray-500">Field of view charts, flat-port refraction, dome extension calculations and more.</p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-xl">✅</div>
                        <h3 className="mb-1 font-semibold text-gray-900">Compatibility</h3>
                        <p className="text-sm text-gray-500">Only compatible housings, ports and lenses are shown for your chosen camera.</p>
                    </div>
                </div>
            </section>

        </main>
    )
}
