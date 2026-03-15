import { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div className="min-w-[300px] p-4">
      <h1 className="text-2xl font-bold mb-4 text-blue-600">Welcome to My Extension</h1>
      <div className="bg-gray-100 p-4 rounded-lg">
        <p className="text-gray-700 mb-2">Count: {count}</p>
        <button
          onClick={() => setCount((c) => c + 1)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded transition-colors"
        >
          Increment
        </button>
      </div>
    </div>
  );
}

export default App;
