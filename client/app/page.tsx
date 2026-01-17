'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { socket } from '@/lib/socket';  // Use global socket

export default function HomePage() {
  // ... (rest of the code remains the same, but replace all `socket` references with the imported `socket`)
  // Example: socket.emit('create-room', ...) now uses the global `socket`


  const router = useRouter();

  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateRoom = () => {
    if (loading) return;

    if (!socket) {
      setError('Socket not connected. Please refresh.');
      return;
    }

    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    setLoading(true);
    setError('');

    socket.emit('create-room', (response: any) => {
      if (!response?.success) {
        setLoading(false);
        setError(response?.error || 'Failed to create room');
        return;
      }

      const room = response.room;

      // Immediately join as host
      socket.emit(
        'join-room',
        { code: room.code, name: name.trim() },
        (joinResponse: any) => {
          setLoading(false);

          if (joinResponse?.success) {
            router.push(`/lobby/${room.code}`);
          } else {
            setError(joinResponse?.error || 'Failed to join room');
          }
        }
      );
    });
  };

  const handleJoinRoom = () => {
    if (loading) return;

    if (!socket) {
      setError('Socket not connected. Please refresh.');
      return;
    }

    if (!name.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!roomCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    const code = roomCode.trim().toUpperCase();

    setLoading(true);
    setError('');

    socket.emit(
      'join-room',
      { code, name: name.trim() },
      (response: any) => {
        setLoading(false);

        if (response?.success) {
          router.push(`/lobby/${code}`);
        } else {
          setError(response?.error || 'Failed to join room');
        }
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-2xl">
        <h1 className="text-4xl font-bold text-white text-center mb-2">
          Shadow Signal
        </h1>
        <p className="text-white/70 text-center mb-8">
          A social deduction game of words and deception
        </p>

        {/* Name Input */}
        <div className="mb-4">
          <label className="text-white/80 text-sm mb-1 block">Your Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name"
            className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>

        {/* Create Room */}
        <button
          onClick={handleCreateRoom}
          disabled={loading}
          className="w-full mb-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-bold py-4 rounded-xl hover:from-green-600 hover:to-emerald-600 transition disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create New Room'}
        </button>

        {/* Divider */}
        <div className="flex items-center my-6">
          <div className="flex-1 h-px bg-white/20" />
          <span className="px-4 text-white/60 text-sm">OR</span>
          <div className="flex-1 h-px bg-white/20" />
        </div>

        {/* Join Room */}
        <div className="mb-4">
          <label className="text-white/80 text-sm mb-1 block">Room Code</label>
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            placeholder="Enter room code"
            className="w-full px-4 py-3 rounded-xl bg-white/20 text-white placeholder-white/40 border border-white/20 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>

        <button
          onClick={handleJoinRoom}
          disabled={loading}
          className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 text-white font-bold py-4 rounded-xl hover:from-yellow-600 hover:to-orange-600 transition disabled:opacity-50"
        >
          {loading ? 'Joining...' : 'Join Room'}
        </button>

        {/* Error */}
        {error && (
          <div className="mt-4 text-center text-red-300 font-semibold">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
