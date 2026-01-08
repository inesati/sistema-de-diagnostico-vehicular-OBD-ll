import { useState, useEffect, useCallback, useRef } from 'react';
import { LiveMetrics } from '../types/obd';
import { OBDService, ConnectionType, obdServiceFactory } from '../services/obdService';

interface UseOBDConnectionProps {
  connectionType: ConnectionType;
  wifiUrl?: string;
  isConnected: boolean;
}

export function useOBDConnection({ connectionType, wifiUrl, isConnected }: UseOBDConnectionProps) {
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
  const [isReading, setIsReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const obdServiceRef = useRef<OBDService | null>(null);
  const readIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const generateSimulatedData = useCallback((prevMetrics: LiveMetrics): LiveMetrics => {
    if (!isDriving) {
      return {
        ...prevMetrics,
        speed: Math.max(0, prevMetrics.speed - 2),
        rpm: prevMetrics.speed > 0 ? prevMetrics.rpm : 800 + (Math.random() * 50 - 25),
        throttle_position: 0,
        engine_load: 15 + (Math.random() * 5),
      };
    }

    const acceleration = Math.random() > 0.5 ? 1 : -1;
    const newSpeed = Math.max(0, Math.min(180, prevMetrics.speed + (acceleration * Math.random() * 5)));

    let newRpm: number;
    let newThrottle: number;
    let newEngineLoad: number;

    if (newSpeed > 0) {
      newRpm = Math.max(1000, Math.min(7000, 800 + (newSpeed * 35) + (Math.random() * 200 - 100)));
      newThrottle = Math.max(0, Math.min(100, (newSpeed / 180) * 60 + (Math.random() * 20)));
      newEngineLoad = Math.max(20, Math.min(95, (newSpeed / 180) * 70 + (Math.random() * 15)));
    } else {
      newRpm = 800 + (Math.random() * 100 - 50);
      newThrottle = 0;
      newEngineLoad = 15 + (Math.random() * 5);
    }

    const coolantTempTarget = isDriving ? 95 : 90;
    const coolantTempChange = (coolantTempTarget - prevMetrics.coolant_temp) * 0.01;
    const fuelConsumption = isDriving ? 0.002 : 0.0005;

    return {
      speed: Math.round(newSpeed),
      rpm: Math.round(newRpm),
      coolant_temp: Math.round(prevMetrics.coolant_temp + coolantTempChange + (Math.random() * 0.4 - 0.2)),
      engine_load: Math.round(newEngineLoad * 10) / 10,
      throttle_position: Math.round(newThrottle * 10) / 10,
      fuel_level: Math.max(0, Math.round((prevMetrics.fuel_level - fuelConsumption) * 100) / 100),
      intake_temp: Math.round(25 + (newSpeed * 0.15) + (Math.random() * 2 - 1)),
      maf_rate: Math.round((2.5 + (newRpm / 1000) * 1.2 + (Math.random() * 0.5 - 0.25)) * 100) / 100
    };
  }, [isDriving]);

  const readRealData = useCallback(async () => {
    if (!obdServiceRef.current || !isConnected) return;

    try {
      setIsReading(true);
      const realMetrics = await obdServiceRef.current.readMetrics();

      setMetrics(prev => ({
        ...prev,
        ...realMetrics,
      }));

      setError(null);
    } catch (err) {
      console.error('Error reading real OBD data:', err);
      setError('Error reading vehicle data');
    } finally {
      setIsReading(false);
    }
  }, [isConnected]);

  useEffect(() => {
    if (!isConnected) {
      if (readIntervalRef.current) {
        clearInterval(readIntervalRef.current);
        readIntervalRef.current = null;
      }
      return;
    }

    if (connectionType === 'simulation') {
      const interval = setInterval(() => {
        setMetrics(prev => generateSimulatedData(prev));
      }, 500);
      readIntervalRef.current = interval;
    } else {
      const interval = setInterval(() => {
        readRealData();
      }, 1000);
      readIntervalRef.current = interval;
    }

    return () => {
      if (readIntervalRef.current) {
        clearInterval(readIntervalRef.current);
      }
    };
  }, [isConnected, connectionType, generateSimulatedData, readRealData]);

  const connectToVehicle = useCallback(async () => {
    try {
      let service: OBDService;

      if (connectionType === 'bluetooth') {
        service = obdServiceFactory.createBluetoothService();
      } else if (connectionType === 'wifi') {
        if (!wifiUrl) throw new Error('WiFi URL required');
        service = obdServiceFactory.createWiFiService(wifiUrl);
      } else {
        service = obdServiceFactory.createSimulationService();
      }

      await service.connect();
      obdServiceRef.current = service;
      setError(null);
      return true;
    } catch (err) {
      console.error('Connection error:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
      throw err;
    }
  }, [connectionType, wifiUrl]);

  const disconnect = useCallback(async () => {
    if (obdServiceRef.current) {
      await obdServiceRef.current.disconnect();
      obdServiceRef.current = null;
    }
    if (readIntervalRef.current) {
      clearInterval(readIntervalRef.current);
      readIntervalRef.current = null;
    }
    setIsDriving(false);
  }, []);

  const toggleDriving = useCallback(() => {
    if (connectionType === 'simulation') {
      setIsDriving(prev => !prev);
    }
  }, [connectionType]);

  const resetSimulation = useCallback(() => {
    if (connectionType === 'simulation') {
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
    }
  }, [connectionType]);

  const readDTCs = useCallback(async (): Promise<string[]> => {
    if (!obdServiceRef.current) return [];
    try {
      return await obdServiceRef.current.readDTCs();
    } catch (err) {
      console.error('Error reading DTCs:', err);
      return [];
    }
  }, []);

  const clearDTCs = useCallback(async (): Promise<boolean> => {
    if (!obdServiceRef.current) return false;
    try {
      return await obdServiceRef.current.clearDTCs();
    } catch (err) {
      console.error('Error clearing DTCs:', err);
      return false;
    }
  }, []);

  return {
    metrics,
    isDriving,
    isReading,
    error,
    connectToVehicle,
    disconnect,
    toggleDriving,
    resetSimulation,
    readDTCs,
    clearDTCs,
  };
}
