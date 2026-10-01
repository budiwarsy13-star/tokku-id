"use client";

// Chart garis simpel pake SVG murni — sengaja gak pake library (recharts dkk)
// biar gak nambah dependency baru cuma buat 1 grafik garis. Cukup buat
// nampilin tren, gak perlu interaktif/tooltip buat versi pertama ini.
export default function LineChartSVG({ data, color = "#D85A30", height = 220, formatValue }) {
  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-[220px] text-sm text-[#8B8D85]">Belum ada data.</div>;
  }

  const width = 600; // viewBox virtual, otomatis scale responsive lewat SVG
  const padding = { top: 16, right: 8, bottom: 24, left: 8 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const nilaiMax = Math.max(...data.map((d) => d.value), 1);
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0;

  const titikXY = data.map((d, i) => ({
    x: padding.left + i * stepX,
    y: padding.top + innerH - (d.value / nilaiMax) * innerH,
  }));

  const pathGaris = titikXY.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const pathArea = `${pathGaris} L ${titikXY[titikXY.length - 1].x} ${padding.top + innerH} L ${titikXY[0].x} ${padding.top + innerH} Z`;

  // Cuma tampilin sebagian label x-axis biar gak numpuk kalau datanya banyak (misal 30/90 hari)
  const lompatLabel = Math.ceil(data.length / 7);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Garis bantu horizontal */}
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={padding.left} x2={width - padding.right}
          y1={padding.top + innerH * (1 - f)} y2={padding.top + innerH * (1 - f)}
          stroke="#F1EFE8" strokeWidth="1" />
      ))}

      <path d={pathArea} fill="url(#areaGradient)" />
      <path d={pathGaris} fill="none" stroke={color} strokeWidth="2" />
      {titikXY.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color} />
      ))}

      {data.map((d, i) => (
        i % lompatLabel === 0 && (
          <text key={i} x={titikXY[i].x} y={height - 4} fontSize="9" fill="#8B8D85" textAnchor="middle">
            {d.label}
          </text>
        )
      ))}
    </svg>
  );
}
