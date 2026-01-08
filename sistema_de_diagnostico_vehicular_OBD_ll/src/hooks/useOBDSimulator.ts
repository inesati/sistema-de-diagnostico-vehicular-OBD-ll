import { useState, useEffect, useCallback } from 'react';
import { LiveMetrics } from '../types/obd';

export function useOBDSimulator(isConnected: boolean) {
  const [metrics, setMetrics] = useState<LiveMetrics>({
    speed: 0,
    rpm: 800,
    coolant_temp: 90,
    engine_load: 15,
    throttle_position: 0,
    fuel_level: 75,
    intake_temp: 25,
    maf_rate: 2.5
  });

  const [isDriving, setIsDriving] = useState(false);

  const generateRealisticData = useCallback(() => {
    setMetrics(prev => {
      let newSpeed = prev.speed;
      let newRpm = prev.rpm;
      let newThrottle = prev.throttle_position;
      let newEngineLoad = prev.engine_load;

      if (isDriving) {
        const acceleration = Math.random() > 0.5 ? 1 : -1;
        newSpeed = Math.max(0, Math.min(180, prev.speed + (acceleration * Math.random() * 5)));

        if (newSpeed > 0) {
          newRpm = Math.max(1000, Math.min(7000, 800 + (newSpeed * 35) + (Math.random() * 200 - 100)));
          newThrottle = Math.max(0, Math.min(100, (newSpeed / 180) * 60 + (Math.random() * 20)));
          newEngineLoad = Math.max(20, Math.min(95, (newSpeed / 180) * 70 + (Math.random() * 15)));
        } else {
          newRpm = 800 + (Math.random() * 100 - 50);
          newThrottle = 0;
          newEngineLoad = 15 + (Math.random() * 5);
        }
      } else {
        newSpeed = Math.max(0, prev.speed - 2);
        newRpm = newSpeed > 0 ? prev.rpm : 800 + (Math.random() * 50 - 25);
        newThrottle = 0;
        newEngineLoad = 15 + (Math.random() * 5);
      }

      const coolantTempTarget = isDriving ? 95 : 90;
      const coolantTempChange = (coolantTempTarget - prev.coolant_temp) * 0.01;

      const fuelConsumption = isDriving ? 0.002 : 0.0005;

      return {
        speed: Math.round(newSpeed),
        rpm: Math.round(newRpm),
        coolant_temp: Math.round(prev.coolant_temp + coolantTempChange + (Math.random() * 0.4 - 0.2)),
        engine_load: Math.round(newEngineLoad * 10) / 10,
        throttle_position: Math.round(newThrottle * 10) / 10,
        fuel_level: Math.max(0, Math.round((prev.fuel_level - fuelConsumption) * 100) / 100),
        intake_temp: Math.round(25 + (newSpeed * 0.15) + (Math.random() * 2 - 1)),
        maf_rate: Math.round((2.5 + (newRpm / 1000) * 1.2 + (Math.random() * 0.5 - 0.25)) * 100) / 100
      };
    });
  }, [isDriving]);

  useEffect(() => {
    if (!isConnected) {
      return;
    }

    const interval = setInterval(generateRealisticData, 500);
    return () => clearInterval(interval);
  }, [isConnected, generateRealisticData]);

  const toggleDriving = () => {
    setIsDriving(prev => !prev);
  };

  const resetSimulation = () => {
    setMetrics({
      speed: 0,
      rpm: 800,
      coolant_temp: 90,
      engine_load: 15,
      throttle_position: 0,
      fuel_level: 75,
      intake_temp: 25,
      maf_rate: 2.5
    });
    setIsDriving(false);
  };

  return {
    metrics,
    isDriving,
    toggleDriving,
    resetSimulation
  };
}
