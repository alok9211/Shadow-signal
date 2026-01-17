'use client';

import VotingPhase from "./VotingPhase";

import { useEffect, useState } from 'react';
import { socket } from "@/lib/socket";

interface Player {
  id: string;
  name: string;
  role: string;
  word: string;
  isAlive: boolean;
  hasSpoken: boolean;
}

interface Room {
  code: string;
  mode: string;
  status: string;
  players: Player[];
  currentSpeaker: number;
  speakerTimeLeft: number;
  winner?: string;
}

export default function GameBoard({ roomCode }: { roomCode: string }) {
  
  const [room, setRoom] = useState<Room | null>(null);
  const [myPlayer, setMyPlayer] = useState<Player | null>(null);

  useEffect(() => {
    if (!socket) return;

    socket.on('game-started', (updatedRoom: Room) => {
      setRoom(updatedRoom);
      const me = updatedRoom.players.find(p => p.id === socket.id);
      setMyPlayer(me || null);
    });

    socket.on('speaker-changed', (updatedRoom: Room) => {
      setRoom(updatedRoom);
    });

    socket.on('timer-tick', (timeLeft: number) => {
      setRoom(prev => prev ? { ...prev, speakerTimeLeft: timeLeft } : null);
    });

    socket.on('vote-submitted', (updatedRoom: Room) => {
      setRoom(updatedRoom);
    });

    return () => {
      socket.off('game-started');
      socket.off('speaker-changed');
      socket.off('timer-tick');
      socket.off('vote-submitted');
    };
  }, [socket]);

  if (!room || !myPlayer) return <div>Loading...</div>;

  const currentSpeakerPlayer = room.players[room.currentSpeaker];

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Your Role & Word */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/20">
          <div className="text-center">
            <p className="text-white/70 text-sm mb-2">Your Role</p>
            <h2 className="text-3xl font-bold text-white mb-4">
              {myPlayer.role.toUpperCase()}
            </h2>
            <div className="bg-yellow-400/20 rounded-xl p-4 border-2 border-yellow-400/50">
              <p className="text-yellow-200 text-sm mb-1">Your Secret Word</p>
              <p className="text-2xl font-bold text-yellow-100">
                {myPlayer.word || '??? (You are the ' + myPlayer.role + ')'}
              </p>
            </div>
          </div>
        </div>

        {/* Speaking Phase */}
        {room.status === 'speaking' && (
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/20">
            <div className="text-center">
              <p className="text-white/70 text-sm mb-2">Now Speaking</p>
              <h3 className="text-2xl font-bold text-white mb-4">
                {currentSpeakerPlayer.name}
              </h3>
              <div className="text-5xl font-bold text-yellow-400 mb-2">
                {room.speakerTimeLeft}s
              </div>
              {currentSpeakerPlayer.id === socket?.id && (
                <p className="text-green-300">It's your turn to describe your word!</p>
              )}
            </div>
          </div>
        )}

        {/* Players List */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {room.players.map((player) => (
            <div
              key={player.id}
              className={`bg-white/10 backdrop-blur-md rounded-xl p-4 border ${
                player.isAlive ? 'border-white/20' : 'border-red-500/50 opacity-50'
              } ${
                room.currentSpeaker === room.players.indexOf(player) && room.status === 'speaking'
                  ? 'ring-4 ring-yellow-400'
                  : ''
              }`}
            >
              <p className="text-white font-semibold truncate">{player.name}</p>
              <p className="text-white/60 text-sm">
                {player.isAlive ? (player.hasSpoken ? '✓ Spoke' : 'Waiting') : '💀 Eliminated'}
              </p>
            </div>
          ))}
        </div>

        {/* Voting Phase */}
        {room.status === 'voting' && myPlayer.isAlive && (
          <VotingSection room={room} socket={socket} myPlayerId={myPlayer.id} />
        )}

        {/* Game End */}
        {room.status === 'ended' && (
          <div className="mt-6 bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 text-center">
            <h2 className="text-4xl font-bold text-yellow-400 mb-4">Game Over!</h2>
            <p className="text-2xl text-white">Winner: {room.winner}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function VotingSection({ room, socket, myPlayerId }: any) {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const handleVote = () => {
    if (!selectedPlayer) return;
    socket?.emit('submit-vote', { code: room.code, votedForId: selectedPlayer }, (response: any) => {
      if (response.success) {
        console.log('Vote submitted');
      }
    });
  };

  return (
    <div className="mt-6 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
      <h3 className="text-2xl font-bold text-white mb-4 text-center">Vote to Eliminate</h3>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {room.players
          .filter((p: Player) => p.isAlive && p.id !== myPlayerId)
          .map((player: Player) => (
            <button
              key={player.id}
              onClick={() => setSelectedPlayer(player.id)}
              className={`p-4 rounded-xl font-semibold transition ${
                selectedPlayer === player.id
                  ? 'bg-red-500 text-white'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              {player.name}
            </button>
          ))}
      </div>
      <button
        onClick={handleVote}
        disabled={!selectedPlayer}
        className="w-full bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:from-red-600 hover:to-pink-600 transition"
      >
        Submit Vote
      </button>
    </div>
  );
}