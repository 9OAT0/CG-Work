'use client';

import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar'

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState('');

  // ตรวจสอบ session ทันทีที่โหลดหน้า
  useEffect(() => {
    fetch('/api/me', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data.user) setUser(data.user);
      });
  }, []);

  const handleLogin = async () => {
    const res = await fetch('/api/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    const data = await res.json();
    if (res.ok) {
      setUser(data.user);
      setError('');
    } else {
      setError(data.error || 'Login failed');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
  };

  return (
    <>
    <Navbar />
        <div className="min-h-screen flex flex-col justify-center items-center gap-10">
        <h1 className="text-xl font-bold mb-4">Login</h1>
        {!user ? (
            <div className="flex flex-col gap-10">
            <input
                type="text"
                placeholder="Enter username"
                className="border px-2 py-1 rounded"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
            />
            <button
                onClick={handleLogin}
                className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
            >
                Login
            </button>
            {error && <p className="text-red-500">{error}</p>}
            </div>
        ) : (
            <div className="flex flex-col gap-10">
            <p className="text-green-700">✅ Logged in as: <strong>{user.username}</strong> ({user.role})</p>
            <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
            >
                Logout
            </button>
            </div>
        )}
        </div>
    </>
  );
}
