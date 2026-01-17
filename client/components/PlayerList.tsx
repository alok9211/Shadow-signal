export default function PlayerList({ players }: { players: any[] }) {
  return (
    <div className="space-y-2">
      {players.map(p => (
        <div key={p.id} className="bg-white/10 p-2 rounded">
          {p.name}
        </div>
      ))}
    </div>
  );
}

