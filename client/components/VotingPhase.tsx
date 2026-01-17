'use client';

import { useState } from 'react';

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

interface VotingPhaseProps {
  room: Room;
  socket: any; // Socket.io instance
  myPlayerId: string;
}

export default function VotingPhase({ room, socket, myPlayerId }: VotingPhaseProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter alive players, excluding the current player
  const alivePlayers = room.players.filter(
    (player) => player.isAlive && player.id !== myPlayerId
  );

  const handleVote = () => {
    if (!selectedPlayer || isSubmitting) return;

    setIsSubmitting(true);
    socket?.emit(
      'submit-vote',
      { code: room.code, votedForId: selectedPlayer },
      (response: any) => {
        setIsSubmitting(false);
        if (!response.success) {
          console.error('Vote submission failed:', response.error);
          // Optionally show an error toast or alert
        } else {
          console.log('Vote submitted successfully');
          // Reset selection after successful vote
          setSelectedPlayer(null);
        }
      }
    );
  };

  return (
    <div className="mt-6 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/20">
      <h3 className="text-2xl font-bold text-white mb-4 text-center">
        Vote to Eliminate
      </h3>
      <p className="text-white/70 text-center mb-6">
        Choose who you think is the {room.mode === 'infiltrator' ? 'Infiltrator' : 'Spy'}.
      </p>

      {/* Player Selection Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {alivePlayers.map((player) => (
          <button
            key={player.id}
            onClick={() => setSelectedPlayer(player.id)}
            className={`p-4 rounded-xl font-semibold transition-all duration-200 ${
              selectedPlayer === player.id
                ? 'bg-red-500 text-white ring-4 ring-red-400/50'
                : 'bg-white/20 text-white hover:bg-white/30 hover:scale-105'
            }`}
            disabled={isSubmitting}
          >
            {player.name}
          </button>
        ))}
      </div>

      {/* Submit Button */}
      <button
        onClick={handleVote}
        disabled={!selectedPlayer || isSubmitting}
        className="w-full bg-gradient-to-r from-red-500 to-pink-500 text-white font-bold py-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:from-red-600 hover:to-pink-600 transition-all duration-200"
      >
        {isSubmitting ? 'Submitting Vote...' : 'Submit Vote'}
      </button>

      {/* Optional: Show selected player */}
      {selectedPlayer && (
        <p className="text-yellow-300 text-center mt-4">
          Selected: {alivePlayers.find((p) => p.id === selectedPlayer)?.name}
        </p>
      )}
    </div>
  );
}