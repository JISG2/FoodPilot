export default function Skeleton({ lines = 1 }: { lines?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="h-4 bg-gray-800 rounded-full" style={{ width: `${60 + Math.random() * 40}%` }} />
      ))}
    </div>
  );
}
