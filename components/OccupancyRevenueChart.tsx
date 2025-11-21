import React from 'react';

interface ChartData {
  month: string;
  occupancy: number;
  revenue: number;
}

interface OccupancyRevenueChartProps {
  data: ChartData[];
}

const OccupancyRevenueChart: React.FC<OccupancyRevenueChartProps> = ({ data }) => {
  const width = 800;
  const height = 350;
  const margin = { top: 20, right: 60, bottom: 50, left: 60 };
  const innerWidth = width - margin.left - margin.right;
  const innerHeight = height - margin.top - margin.bottom;

  const maxOccupancy = Math.max(...data.map(d => d.occupancy), 0) || 1;
  const maxRevenue = Math.max(...data.map(d => d.revenue), 0) || 100;

  const xScale = (index: number) => margin.left + (index / (data.length - 1)) * innerWidth;
  const yOccupancyScale = (value: number) => margin.top + innerHeight - (value / maxOccupancy) * innerHeight;
  const yRevenueScale = (value: number) => margin.top + innerHeight - (value / maxRevenue) * innerHeight;

  const occupancyPath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yOccupancyScale(d.occupancy)}`).join(' ');
  const revenuePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${xScale(i)},${yRevenueScale(d.revenue)}`).join(' ');

  const yOccupancyTicks = Array.from({ length: 5 }, (_, i) => Math.round((maxOccupancy / 4) * i));
  const yRevenueTicks = Array.from({ length: 5 }, (_, i) => Math.round((maxRevenue / 4) * i));


  return (
    <div className="relative">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`}>
        {/* Y Axis for Occupancy */}
        <g className="text-xs text-slate-500">
          {yOccupancyTicks.map(tickValue => (
            <g key={`y-occ-${tickValue}`} transform={`translate(0, ${yOccupancyScale(tickValue)})`}>
              <line x1={margin.left} x2={width - margin.right} stroke="#e2e8f0" strokeWidth="1" />
              <text x={margin.left - 8} dy="0.32em" textAnchor="end" fill="#0ea5e9">
                {tickValue}
              </text>
            </g>
          ))}
          <text transform={`translate(${margin.left-40}, ${height/2}) rotate(-90)`} textAnchor="middle" fill="#0ea5e9" className="font-semibold">
            Boxes occupés
          </text>
        </g>
        
        {/* Y Axis for Revenue */}
         <g className="text-xs text-slate-500">
          {yRevenueTicks.map(tickValue => (
            <g key={`y-rev-${tickValue}`} transform={`translate(0, ${yRevenueScale(tickValue)})`}>
               <text x={width - margin.right + 8} dy="0.32em" textAnchor="start" fill="#10b981">
                {tickValue}€
              </text>
            </g>
          ))}
          <text transform={`translate(${width - margin.right + 45}, ${height/2}) rotate(-90)`} textAnchor="middle" fill="#10b981" className="font-semibold">
            Revenu (€)
          </text>
        </g>

        {/* X Axis */}
        <g className="text-xs text-slate-500" transform={`translate(0, ${height - margin.bottom})`}>
             <line x1={margin.left} x2={width - margin.right} y1="0" y2="0" stroke="#94a3b8" strokeWidth="1" />
            {data.map((d, i) => (
              <text key={d.month} x={xScale(i)} y="20" textAnchor="middle" transform={`rotate(30, ${xScale(i)}, 25)`}>
                {d.month}
              </text>
            ))}
        </g>

        {/* Lines */}
        <path d={occupancyPath} fill="none" stroke="#0ea5e9" strokeWidth="2.5" />
        <path d={revenuePath} fill="none" stroke="#10b981" strokeWidth="2.5" />
        
        {/* Points */}
        {data.map((d, i) => (
            <g key={`points-${i}`}>
                 <circle cx={xScale(i)} cy={yOccupancyScale(d.occupancy)} r="4" fill="#0ea5e9" className="cursor-pointer" />
                 <circle cx={xScale(i)} cy={yRevenueScale(d.revenue)} r="4" fill="#10b981" className="cursor-pointer" />
            </g>
        ))}
      </svg>
      <div className="flex justify-center items-center space-x-6 mt-4 text-sm">
        <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-[#0ea5e9] mr-2"></div>
            <span>Occupation</span>
        </div>
        <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-[#10b981] mr-2"></div>
            <span>Revenu</span>
        </div>
      </div>
    </div>
  );
};

export default OccupancyRevenueChart;
