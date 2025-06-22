export default function Home() {
  return (
    <>
       <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-sm">
        <h1 className="text-xl font-bold mb-4">Login</h1>
        <input
          type="text"
          placeholder="Username"
          className="w-full border px-3 py-2 mb-3 rounded"
          required
          // onChange={(e) => setUsername(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full border px-3 py-2 mb-4 rounded"
          required
          // onChange={(e) => setPassword(e.target.value)}
        />
        <button
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
          // onClick={handleLogin}
        >
          Login
        </button>
        <p className="mt-4 text-sm text-center">
          No account? <a href="/register" className="text-blue-600">Register</a>
        </p>
      </div>
    </div>
    </>
  )
}