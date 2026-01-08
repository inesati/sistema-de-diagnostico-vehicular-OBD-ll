import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit: string;
  icon: LucideIcon;
  status?: 'normal' | 'warning' | 'critical';
}

export default function MetricCard({ title, value, unit, icon: Icon, status = 'normal' }: MetricCardProps) {
  const statusColors = {
    normal: 'bg-slate-800 border-slate-700',
    warning: 'bg-amber-900/30 border-amber-700',
    critical: 'bg-red-900/30 border-red-700'
  };

  const textColors = {
    normal: 'text-slate-100',
    warning: 'text-amber-300',
    critical: 'text-red-300'
  };

  return (
    <div className={`${statusColors[status]} border rounded-lg p-4 transition-all hover:border-opacity-80`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
          <div className="flex items-baseline gap-2">
            <span className={`${textColors[status]} text-3xl font-bold`}>
              {value}
            </span>
            <span className="text-slate-500 text-lg font-medium">{unit}</span>
          </div>
        </div>
        <div className={`${textColors[status]} p-2 rounded-lg bg-slate-900/50`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}
