<<<<<<< Updated upstream
'use client';

import { useState, useEffect } from 'react';

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
      console.log(data.user);
      setError('');
    } else {
      setError(data.error || 'Login failed');
    }
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
  };

=======
export default function Home() {
>>>>>>> Stashed changes
  return (
    <>
      <div className="min-h-screen bg-pink-500 flex justify-center items-center">
        <img src="/Ellipse 2.png" alt="" />
      </div>
    </>
  )
}