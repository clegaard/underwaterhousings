export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center px-4">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">
          Underwater Housings
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Welcome to underwaterhousings.xyz
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="#"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Get Started
          </a>
          <a
            href="#"
            className="px-6 py-3 bg-white text-blue-600 rounded-lg border border-blue-600 hover:bg-blue-50 transition-colors"
          >
            Learn More
          </a>
        </div>
      </div>
    </main>
  );
}
