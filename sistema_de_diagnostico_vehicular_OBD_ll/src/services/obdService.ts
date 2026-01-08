import { ELM327, OBD_COMMANDS } from './elm327';
import { LiveMetrics } from '../types/obd';

export type ConnectionType = 'bluetooth' | 'wifi' | 'simulation';

export interface OBDServiceConfig {
  connectionType: ConnectionType;
  wifiUrl?: string;
}

export class OBDService {
  private elm327: ELM327 | null = null;
  private connectionType: ConnectionType;
  private wifiUrl?: string;

  constructor(config: OBDServiceConfig) {
    this.connectionType = config.connectionType;
    this.wifiUrl = config.wifiUrl;
  }

  async connect(): Promise<boolean> {
    try {
      if (this.connectionType === 'bluetooth') {
        this.elm327 = new ELM327();
        await this.elm327.connect();
        return true;
      } else if (this.connectionType === 'wifi') {
        if (!this.wifiUrl) {
          throw new Error('WiFi URL not provided');
        }
        const response = await fetch(`${this.wifiUrl}/test`);
        return response.ok;
      } else if (this.connectionType === 'simulation') {
        return true;
      }
      return false;
    } catch (error) {
      console.error('OBD connection error:', error);
      throw error;
    }
  }

  async readMetrics(): Promise<Partial<LiveMetrics>> {
    if (this.connectionType === 'simulation') {
      return {};
    }

    const metrics: Partial<LiveMetrics> = {};

    try {
      if (this.connectionType === 'bluetooth' && this.elm327) {
        metrics.speed = await this.readSpeed();
        metrics.rpm = await this.readRPM();
        metrics.coolant_temp = await this.readCoolantTemp();
        metrics.engine_load = await this.readEngineLoad();
        metrics.throttle_position = await this.readThrottle();
        metrics.fuel_level = await this.readFuelLevel();
        metrics.intake_temp = await this.readIntakeTemp();
        metrics.maf_rate = await this.readMAF();
      } else if (this.connectionType === 'wifi') {
        const response = await fetch(`${this.wifiUrl}/metrics`);
        const data = await response.json();
        return data;
      }
    } catch (error) {
      console.error('Error reading metrics:', error);
    }

    return metrics;
  }

  private async readSpeed(): Promise<number> {
    if (!this.elm327) return 0;
    try {
      const response = await this.elm327.readPID(OBD_COMMANDS.SPEED.command);
      if (response.includes('NODATA') || response.includes('ERROR')) return 0;
      return this.elm327.parseSpeed(response);
    } catch (error) {
      console.error('Error reading speed:', error);
      return 0;
    }
  }

  private async readRPM(): Promise<number> {
    if (!this.elm327) return 800;
    try {
      const response = await this.elm327.readPID(OBD_COMMANDS.RPM.command);
      if (response.includes('NODATA') || response.includes('ERROR')) return 800;
      return Math.round(this.elm327.parseRPM(response));
    } catch (error) {
      console.error('Error reading RPM:', error);
      return 800;
    }
  }

  private async readCoolantTemp(): Promise<number> {
    if (!this.elm327) return 90;
    try {
      const response = await this.elm327.readPID(OBD_COMMANDS.COOLANT_TEMP.command);
      if (response.includes('NODATA') || response.includes('ERROR')) return 90;
      return this.elm327.parseTemperature(response);
    } catch (error) {
      console.error('Error reading coolant temp:', error);
      return 90;
    }
  }

  private async readEngineLoad(): Promise<number> {
    if (!this.elm327) return 15;
    try {
      const response = await this.elm327.readPID(OBD_COMMANDS.ENGINE_LOAD.command);
      if (response.includes('NODATA') || response.includes('ERROR')) return 15;
      return Math.round(this.elm327.parsePercentage(response) * 10) / 10;
    } catch (error) {
      console.error('Error reading engine load:', error);
      return 15;
    }
  }

  private async readThrottle(): Promise<number> {
    if (!this.elm327) return 0;
    try {
      const response = await this.elm327.readPID(OBD_COMMANDS.THROTTLE.command);
      if (response.includes('NODATA') || response.includes('ERROR')) return 0;
      return Math.round(this.elm327.parsePercentage(response) * 10) / 10;
    } catch (error) {
      console.error('Error reading throttle:', error);
      return 0;
    }
  }

  private async readFuelLevel(): Promise<number> {
    if (!this.elm327) return 75;
    try {
      const response = await this.elm327.readPID(OBD_COMMANDS.FUEL_LEVEL.command);
      if (response.includes('NODATA') || response.includes('ERROR')) return 75;
      return Math.round(this.elm327.parsePercentage(response) * 10) / 10;
    } catch (error) {
      console.error('Error reading fuel level:', error);
      return 75;
    }
  }

  private async readIntakeTemp(): Promise<number> {
    if (!this.elm327) return 25;
    try {
      const response = await this.elm327.readPID(OBD_COMMANDS.INTAKE_TEMP.command);
      if (response.includes('NODATA') || response.includes('ERROR')) return 25;
      return this.elm327.parseTemperature(response);
    } catch (error) {
      console.error('Error reading intake temp:', error);
      return 25;
    }
  }

  private async readMAF(): Promise<number> {
    if (!this.elm327) return 2.5;
    try {
      const response = await this.elm327.readPID(OBD_COMMANDS.MAF_RATE.command);
      if (response.includes('NODATA') || response.includes('ERROR')) return 2.5;
      return Math.round(this.elm327.parseMAF(response) * 100) / 100;
    } catch (error) {
      console.error('Error reading MAF:', error);
      return 2.5;
    }
  }

  async readDTCs(): Promise<string[]> {
    if (this.connectionType === 'simulation') {
      return [];
    }

    try {
      if (this.connectionType === 'bluetooth' && this.elm327) {
        return await this.elm327.readDTCs();
      } else if (this.connectionType === 'wifi') {
        const response = await fetch(`${this.wifiUrl}/dtc`);
        const data = await response.json();
        return data.codes || [];
      }
    } catch (error) {
      console.error('Error reading DTCs:', error);
    }

    return [];
  }

  async clearDTCs(): Promise<boolean> {
    if (this.connectionType === 'simulation') {
      return true;
    }

    try {
      if (this.connectionType === 'bluetooth' && this.elm327) {
        return await this.elm327.clearDTCs();
      } else if (this.connectionType === 'wifi') {
        const response = await fetch(`${this.wifiUrl}/clear-dtc`, { method: 'POST' });
        return response.ok;
      }
    } catch (error) {
      console.error('Error clearing DTCs:', error);
    }

    return false;
  }

  async disconnect(): Promise<void> {
    if (this.elm327) {
      await this.elm327.disconnect();
      this.elm327 = null;
    }
  }

  isConnected(): boolean {
    if (this.connectionType === 'simulation') {
      return true;
    }
    return this.elm327?.isConnected() || false;
  }

  getConnectionType(): ConnectionType {
    return this.connectionType;
  }
}

export const obdServiceFactory = {
  createBluetoothService(): OBDService {
    return new OBDService({ connectionType: 'bluetooth' });
  },

  createWiFiService(url: string): OBDService {
    return new OBDService({ connectionType: 'wifi', wifiUrl: url });
  },

  createSimulationService(): OBDService {
    return new OBDService({ connectionType: 'simulation' });
  },
};
