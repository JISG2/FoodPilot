export default function BarRow({
  label,
  value,
  total,
  color,
  format,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  format?: (n: number) => string;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  const fmt = format || ((n: number) => `$${n.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`);
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="text-gray-300">
          {fmt(value)} ({pct.toFixed(0)}%)
        </span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
