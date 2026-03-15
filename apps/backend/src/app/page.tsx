export default function Home() {
  return (
    <main className="min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-4">Welcome to Backend API</h1>
      <p className="text-gray-600">
        This is a Next.js 15 backend with Supabase and OpenAI integration.
      </p>
      <div className="mt-8 space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h2 className="text-xl font-semibold mb-2">Available Endpoints</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>
              <code className="bg-gray-200 px-2 py-1 rounded">GET /api/items</code> - Fetch items
              from Supabase
            </li>
            <li>
              <code className="bg-gray-200 px-2 py-1 rounded">POST /api/items</code> - Create a new
              item
            </li>
            <li>
              <code className="bg-gray-200 px-2 py-1 rounded">POST /api/chat</code> - Chat with
              OpenAI
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
