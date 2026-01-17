'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { socket } from '@/lib/socket';  // Use global socket

export default function JoinPage() {
  // ... (rest of the code remains the same)

  const router = useRouter();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const join = () => {
    socket?.emit('join-room', { code, name }, (res: any) => {
      if (res.success) router.push(`/lobby/${code}`);
      else setError(res.error);
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="p-6 bg-white/10 rounded">
        <input placeholder="Name" onChange={(e) => setName(e.target.value)} className="p-2 mb-2" />
        <input placeholder="Room Code" onChange={(e) => setCode(e.target.value.toUpperCase())} className="p-2 mb-2" />
        <button onClick={join} className="bg-green-500 p-2 w-full">Join</button>
        {error && <p className="text-red-400">{error}</p>}
      </div>
    </div>
  );
}
