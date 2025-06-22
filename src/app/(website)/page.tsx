'use client'
import { useState } from 'react'

export default function Home() {
  const [username, setUsername] = useState('')
  const [message, setMessage] = useState('')

  const handleLogin = async () => {
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })

      const data = await res.json()

      if (!res.ok) {
        setMessage(data.error || 'Something went wrong')
        return
      }

      setMessage(data.message)
    } catch (err) {
      setMessage('Error connecting to server')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-full max-w-sm">
        <h1 className="text-xl font-bold mb-4">Login</h1>
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full border px-3 py-2 mb-4 rounded"
          required
        />
        <button
          className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
          onClick={handleLogin}
        >
          Login
        </button>
        {message && <p className="mt-4 text-center text-sm text-red-500">{message}</p>}
        <p className="mt-4 text-sm text-center">
          No account? <a href="/register" className="text-blue-600">Register</a>
        </p>
      </div>
    </div>
  )
}
