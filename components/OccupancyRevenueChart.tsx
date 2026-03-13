import React, { useState } from 'react';

interface ChartData {
  month: string;
  occupancy: number;
  revenue: number;
  honoraires?: number; // honoraires agence (optionnel)
}

interface OccupancyRevenueChartProps {
  data: ChartData[];
}

const OccupancyRevenueChart: React.FC<OccupancyRevenueChartProps> = ({ data }) => {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; d: ChartData } | null>(null);

  if (data.length === 0) return null;

  const width = 900;
  const height = 380;
  const margin = { top: 30, right: 80, bottom: 50, left: 65 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const hasHonoraires = data.some(d => (d.honoraires ?? 0) > 0);

  const maxOccupancy = Math.max(...data.map(d => d.occupancy), 1);
  const maxRevenue = Math.max(...data.map(d => Math.max(d.revenue, d.honoraires ?? 0)), 100);

  const xScale = (i: number) => margin.left + (i / Math.max(data.length - 1, 1)) * innerWidth;
  const yOcc = (v: number) => margin.top + innerHeight - (v / maxOccupancy) * innerHeight;
  const yRev = (v: number) => margin.top + innerHeight - (v / maxRevenue) * innerHeight;

  const occPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yOcc(d.occupancy)}`).join(' ');
  const revPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yRev(d.revenue)}`).join(' ');
  const honPath = hasHonoraires
    ? data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yRev(d.honoraires ?? 0)}`).join(' ')
    : null;

  const occArea = `${occPath} L${xScale(data.length - 1)},${margin.top + innerHeight} L${xScale(0)},${margin.top + innerHeight} Z`;
  const revArea = `${revPath} L${xScale(data.length - 1)},${margin.top + innerHeight} L${xScale(0)},${margin.top + innerHeight} Z`;

  const shouldShowLabel = (d: ChartData, i: number) =>
    d.month.toLowerCase().includes('janv') || i === data.length - 1;

  const yOccTicks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(maxOccupancy * f));
  const yRevTicks = [0, 0.25, 0.5, 0.75, 1].map(f => Math.round(maxRevenue * f));

  return (
    <div className="relative select-none">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} onMouseLeave={() => setTooltip(null)}>
        <defs>
          <linearGradient id="occGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {yOccTicks.map(v => (
          <line key={`grid-${v}`} x1={margin.left} x2={width - margin.right}
            y1={yOcc(v)} y2={yOcc(v)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="4,3" />
        ))}

        {/* Y gauche — occupation */}
        {yOccTicks.map(v => (
          <text key={`yocc-${v}`} x={margin.left - 10} y={yOcc(v)} dy="0.35em"
            textAnchor="end" fontSize="11" fill="#0ea5e9" fontWeight="500">{v}</text>
        ))}
        <text transform={`translate(18, ${height / 2}) rotate(-90)`}
          textAnchor="middle" fontSize="11" fill="#0ea5e9" fontWeight="600">Boxes occupés</text>

        {/* Y droite — revenus */}
        {yRevTicks.map(v => (
          <text key={`yrev-${v}`} x={width - margin.right + 10} y={yRev(v)} dy="0.35em"
            textAnchor="start" fontSize="11" fill="#10b981" fontWeight="500">
            {v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k€` : `${v}€`}
          </text>
        ))}
        <text transform={`translate(${width - 16}, ${height / 2}) rotate(90)`}
          textAnchor="middle" fontSize="11" fill="#10b981" fontWeight="600">Revenu (€)</text>

        {/* Aires */}
        <path d={occArea} fill="url(#occGrad)" />
        <path d={revArea} fill="url(#revGrad)" />

        {/* Courbes */}
        <path d={occPath} fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        <path d={revPath} fill="none" stroke="#10b981" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {honPath && (
          <path d={honPath} fill="none" stroke="#f97316" strokeWidth="2" strokeLinejoin="round"
            strokeLinecap="round" strokeDasharray="6,3" />
        )}

        {/* Axe X */}
        <line x1={margin.left} x2={width - margin.right}
          y1={margin.top + innerHeight} y2={margin.top + innerHeight} stroke="#cbd5e1" strokeWidth="1" />
        {data.map((d, i) => {
          const x = xScale(i);
          const showLabel = shouldShowLabel(d, i);
          return (
            <g key={`x-${i}`}>
              <line x1={x} x2={x} y1={margin.top + innerHeight}
                y2={margin.top + innerHeight + (showLabel ? 8 : 4)}
                stroke={showLabel ? '#64748b' : '#cbd5e1'} strokeWidth="1" />
              {showLabel && (
                <text x={x} y={margin.top + innerHeight + 20}
                  textAnchor="middle" fontSize="12" fill="#475569" fontWeight="600">
                  {d.month.toLowerCase().includes('janv') && !d.month.includes(new Date().getFullYear().toString().slice(-2))
                    ? d.month.replace('janv.', '').trim().replace(/^(\d+)$/, "20$1")
                    : d.month}
                </text>
              )}
            </g>
          );
        })}

        {/* Zone hover tooltip */}
        {data.map((d, i) => (
          <rect key={`hover-${i}`}
            x={xScale(i) - (innerWidth / data.length) / 2} y={margin.top}
            width={innerWidth / data.length} height={innerHeight}
            fill="transparent"
            onMouseEnter={() => setTooltip({ x: xScale(i), y: Math.min(yOcc(d.occupancy), yRev(d.revenue)) - 10, d })}
          />
        ))}

        {/* Points sur les labels */}
        {data.map((d, i) => shouldShowLabel(d, i) && (
          <g key={`pt-${i}`}>
            <circle cx={xScale(i)} cy={yOcc(d.occupancy)} r="3.5" fill="#0ea5e9" stroke="white" strokeWidth="1.5" />
            <circle cx={xScale(i)} cy={yRev(d.revenue)} r="3.5" fill="#10b981" stroke="white" strokeWidth="1.5" />
            {honPath && <circle cx={xScale(i)} cy={yRev(d.honoraires ?? 0)} r="3.5" fill="#f97316" stroke="white" strokeWidth="1.5" />}
          </g>
        ))}

        {/* Tooltip */}
        {tooltip && (() => {
          const tx = Math.min(Math.max(tooltip.x, 90), width - 150);
          const ty = Math.max(tooltip.y - 70, margin.top);
          const boxH = hasHonoraires ? 80 : 65;
          return (
            <g>
              <rect x={tx - 70} y={ty} width="150" height={boxH} rx="6" fill="#1e293b" opacity="0.92" />
              <text x={tx + 5} y={ty + 16} textAnchor="middle" fontSize="11" fill="white" fontWeight="600">{tooltip.d.month}</text>
              <text x={tx + 5} y={ty + 32} textAnchor="middle" fontSize="11" fill="#7dd3fc">
                {tooltip.d.occupancy} box{tooltip.d.occupancy > 1 ? 'es' : ''} occupé{tooltip.d.occupancy > 1 ? 'es' : ''}
              </text>
              <text x={tx + 5} y={ty + 48} textAnchor="middle" fontSize="11" fill="#6ee7b7">
                {tooltip.d.revenue.toFixed(0)} € loyers
              </text>
              {hasHonoraires && (
                <text x={tx + 5} y={ty + 64} textAnchor="middle" fontSize="11" fill="#fdba74">
                  {(tooltip.d.honoraires ?? 0).toFixed(0)} € honoraires cumulés
                </text>
              )}
            </g>
          );
        })()}
      </svg>

      <div className="flex justify-center items-center gap-8 mt-2 text-sm text-slate-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-sky-500 rounded" />
          <span>Boxes occupés</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-emerald-500 rounded" />
          <span>Revenu mensuel (€)</span>
        </div>
        {hasHonoraires && (
          <div className="flex items-center gap-2">
            <div className="w-4 h-px bg-orange-500 rounded" style={{ borderTop: '2px dashed #f97316' }} />
            <span>Honoraires agence cumulés (€)</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default OccupancyRevenueChart;
