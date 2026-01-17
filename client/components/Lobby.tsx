"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { socket } from "@/lib/socket";  // Use global socket
import PlayerList from "./PlayerList";

export default function Lobby({ roomCode }: { roomCode: string }) {
  // ... (rest of the code remains the same, but remove `const socket = useSocket();` and use the imported `socket`)

  const router = useRouter();
  const [room, setRoom] = useState<any>(null);

  useEffect(() => {
    if (!socket) return;

    socket.on("player-joined", setRoom);
    socket.on("game-started", () => router.push(`/game/${roomCode}`));

    return () => {
      socket.off("player-joined");
      socket.off("game-started");
    };
  }, [socket]);

  const startGame = (mode: string) => {
    socket?.emit("start-game", { code: roomCode, mode });
  };

  if (!room) return <div className="text-black p-10">Waiting for players...</div>;

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-3xl mb-4">Room {roomCode}</h1>
      <PlayerList players={room.players} />

      <div className="flex gap-4 mt-6">
        <button onClick={() => startGame("infiltrator")} className="bg-green-600 p-3">
          Start Infiltrator
        </button>
        <button onClick={() => startGame("spy")} className="bg-purple-600 p-3">
          Start Spy
        </button>
      </div>
    </div>
  );
}
