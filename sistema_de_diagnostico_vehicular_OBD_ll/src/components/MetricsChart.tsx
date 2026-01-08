import { useEffect, useState } from 'react';
import { LiveMetrics } from '../types/obd';

interface MetricsChartProps {
  metrics: LiveMetrics;
}

interface DataPoint {
  timestamp: number;
  speed: number;
  rpm: number;
  coolant_temp: number;
}

export default function MetricsChart({ metrics }: MetricsChartProps) {
  const [dataHistory, setDataHistory] = useState<DataPoint[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<'speed' | 'rpm' | 'coolant_temp'>('speed');

  useEffect(() => {
    const newPoint: DataPoint = {
      timestamp: Date.now(),
      speed: metrics.speed,
      rpm: metrics.rpm / 10,
      coolant_temp: metrics.coolant_temp
    };

    setDataHistory(prev => {
      const updated = [...prev, newPoint];
      return updated.slice(-60);
    });
  }, [metrics]);

  const chartWidth = 800;
  const chartHeight = 300;
  const padding = 40;

  const getMetricValue = (point: DataPoint) => {
    return point[selectedMetric];
  };

  const getMaxValue = () => {
    if (selectedMetric === 'speed') return 200;
    if (selectedMetric === 'rpm') return 800;
    return 120;
  };

  const getMetricLabel = () => {
    if (selectedMetric === 'speed') return 'Speed (km/h)';
    if (selectedMetric === 'rpm') return 'RPM (x10)';
    return 'Coolant Temperature (°C)';
  };

  const getMetricColor = () => {
    if (selectedMetric === 'speed') return '#3b82f6';
    if (selectedMetric === 'rpm') return '#10b981';
    return '#f59e0b';
  };

  if (dataHistory.length < 2) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-100">Real-Time Data Chart</h3>
        </div>
        <div className="flex items-center justify-center h-64 text-slate-400">
          Collecting data...
        </div>
      </div>
    );
  }

  const maxValue = getMaxValue();
  const points = dataHistory.map((point, index) => {
    const x = padding + (index / (dataHistory.length - 1)) * (chartWidth - padding * 2);
    const y = chartHeight - padding - (getMetricValue(point) / maxValue) * (chartHeight - padding * 2);
    return { x, y };
  });

  const pathData = points.map((point, index) => {
    return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
  }).join(' ');

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-100">Real-Time Data Chart</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedMetric('speed')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              selectedMetric === 'speed'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Speed
          </button>
          <button
            onClick={() => setSelectedMetric('rpm')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              selectedMetric === 'rpm'
                ? 'bg-green-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            RPM
          </button>
          <button
            onClick={() => setSelectedMetric('coolant_temp')}
            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              selectedMetric === 'coolant_temp'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            Coolant
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full"
          style={{ minHeight: '300px' }}
        >
          <defs>
            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={getMetricColor()} stopOpacity="0.3" />
              <stop offset="100%" stopColor={getMetricColor()} stopOpacity="0" />
            </linearGradient>
          </defs>

          <line
            x1={padding}
            y1={chartHeight - padding}
            x2={chartWidth - padding}
            y2={chartHeight - padding}
            stroke="#475569"
            strokeWidth="2"
          />
          <line
            x1={padding}
            y1={padding}
            x2={padding}
            y2={chartHeight - padding}
            stroke="#475569"
            strokeWidth="2"
          />

          {[0, 25, 50, 75, 100].map((percent) => {
            const y = chartHeight - padding - (percent / 100) * (chartHeight - padding * 2);
            const value = Math.round((maxValue * percent) / 100);
            return (
              <g key={percent}>
                <line
                  x1={padding}
                  x2={chartWidth - padding}
                  y1={y}
                  y2={y}
                  stroke="#334155"
                  strokeWidth="1"
                  strokeDasharray="5,5"
                />
                <text
                  x={padding - 10}
                  y={y + 5}
                  fill="#94a3b8"
                  fontSize="12"
                  textAnchor="end"
                >
                  {value}
                </text>
              </g>
            );
          })}

          <path
            d={`${pathData} L ${points[points.length - 1].x} ${chartHeight - padding} L ${padding} ${chartHeight - padding} Z`}
            fill="url(#chartGradient)"
          />

          <path
            d={pathData}
            fill="none"
            stroke={getMetricColor()}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="3"
              fill={getMetricColor()}
            />
          ))}

          <text
            x={chartWidth / 2}
            y={chartHeight - 5}
            fill="#94a3b8"
            fontSize="14"
            textAnchor="middle"
            fontWeight="500"
          >
            Time (last 30 seconds)
          </text>

          <text
            x={20}
            y={chartHeight / 2}
            fill="#94a3b8"
            fontSize="14"
            textAnchor="middle"
            transform={`rotate(-90, 20, ${chartHeight / 2})`}
            fontWeight="500"
          >
            {getMetricLabel()}
          </text>
        </svg>
      </div>
    </div>
  );
}
