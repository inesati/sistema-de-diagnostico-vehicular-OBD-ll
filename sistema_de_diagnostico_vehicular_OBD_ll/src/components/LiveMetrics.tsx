import { Gauge, Thermometer, Zap, Fuel, Wind, Activity, TrendingUp, Droplets } from 'lucide-react';
import MetricCard from './MetricCard';
import { LiveMetrics as LiveMetricsType } from '../types/obd';

interface LiveMetricsProps {
  metrics: LiveMetricsType;
}

export default function LiveMetrics({ metrics }: LiveMetricsProps) {
  const getCoolantStatus = (temp: number) => {
    if (temp > 105) return 'critical';
    if (temp > 100) return 'warning';
    return 'normal';
  };

  const getRPMStatus = (rpm: number) => {
    if (rpm > 6500) return 'critical';
    if (rpm > 6000) return 'warning';
    return 'normal';
  };

  const getFuelStatus = (fuel: number) => {
    if (fuel < 10) return 'critical';
    if (fuel < 25) return 'warning';
    return 'normal';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        title="Speed"
        value={metrics.speed}
        unit="km/h"
        icon={Gauge}
        status="normal"
      />
      <MetricCard
        title="Engine RPM"
        value={metrics.rpm}
        unit="RPM"
        icon={Activity}
        status={getRPMStatus(metrics.rpm)}
      />
      <MetricCard
        title="Coolant Temp"
        value={metrics.coolant_temp}
        unit="°C"
        icon={Thermometer}
        status={getCoolantStatus(metrics.coolant_temp)}
      />
      <MetricCard
        title="Fuel Level"
        value={metrics.fuel_level.toFixed(1)}
        unit="%"
        icon={Fuel}
        status={getFuelStatus(metrics.fuel_level)}
      />
      <MetricCard
        title="Engine Load"
        value={metrics.engine_load.toFixed(1)}
        unit="%"
        icon={Zap}
        status="normal"
      />
      <MetricCard
        title="Throttle Position"
        value={metrics.throttle_position.toFixed(1)}
        unit="%"
        icon={TrendingUp}
        status="normal"
      />
      <MetricCard
        title="Intake Temp"
        value={metrics.intake_temp}
        unit="°C"
        icon={Wind}
        status="normal"
      />
      <MetricCard
        title="MAF Rate"
        value={metrics.maf_rate.toFixed(2)}
        unit="g/s"
        icon={Droplets}
        status="normal"
      />
    </div>
  );
}
