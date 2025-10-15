export default function About() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-blue-100">
            {/* Page Header */}
            <div className="bg-white shadow-sm">
                <div className="max-w-4xl mx-auto px-4 py-6">
                    <h1 className="text-4xl font-bold text-blue-900 mb-2">About UW Housings</h1>
                    <p className="text-xl text-gray-700">
                        Your comprehensive guide to underwater camera housings
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-8">
                <div className="bg-white rounded-lg shadow-sm p-8">
                    <div className="prose prose-lg max-w-none">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
                        <p className="text-gray-700 mb-6">
                            UW Housings is dedicated to helping underwater photographers and videographers find the perfect camera housing for their needs.
                            We provide comprehensive information about housings from leading manufacturers, making it easy to compare features,
                            prices, and specifications.
                        </p>

                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Featured Manufacturers</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            <div className="border rounded-lg p-4">
                                <h3 className="text-lg font-semibold text-blue-900 mb-2">Nauticam</h3>
                                <p className="text-gray-600">
                                    Premium underwater housings known for their exceptional build quality and innovative design features.
                                </p>
                            </div>
                            <div className="border rounded-lg p-4">
                                <h3 className="text-lg font-semibold text-blue-900 mb-2">Sea Frogs</h3>
                                <p className="text-gray-600">
                                    Affordable and reliable underwater housings that offer great value for both beginners and professionals.
                                </p>
                            </div>
                        </div>

                        <h2 className="text-2xl font-bold text-gray-900 mb-4">How to Use This Site</h2>
                        <ul className="list-disc list-inside text-gray-700 space-y-2 mb-6">
                            <li>Use the Housings dropdown in the navigation to browse by manufacturer</li>
                            <li>Filter housings on the main page by camera compatibility, depth rating, price, and material</li>
                            <li>Click on any housing card to view detailed specifications and pricing</li>
                            <li>Compare different options to find the perfect housing for your underwater adventures</li>
                        </ul>

                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact</h2>
                        <p className="text-gray-700">
                            Have questions or suggestions? We'd love to hear from you! This platform is continuously updated
                            to provide the most accurate and comprehensive information about underwater camera housings.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}