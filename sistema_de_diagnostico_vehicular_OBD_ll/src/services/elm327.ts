export interface ELM327Response {
  success: boolean;
  data?: string;
  error?: string;
}

export interface OBDCommand {
  command: string;
  description: string;
  expectedBytes?: number;
}

export const OBD_COMMANDS = {
  RESET: { command: 'ATZ', description: 'Reset adapter' },
  ECHO_OFF: { command: 'ATE0', description: 'Echo off' },
  LINEFEED_OFF: { command: 'ATL0', description: 'Linefeed off' },
  HEADERS_OFF: { command: 'ATH0', description: 'Headers off' },
  SPACES_OFF: { command: 'ATS0', description: 'Spaces off' },
  AUTO_PROTOCOL: { command: 'ATSP0', description: 'Auto select protocol' },
  GET_PROTOCOL: { command: 'ATDPN', description: 'Get current protocol' },

  SPEED: { command: '010D', description: 'Vehicle speed', expectedBytes: 1 },
  RPM: { command: '010C', description: 'Engine RPM', expectedBytes: 2 },
  COOLANT_TEMP: { command: '0105', description: 'Coolant temperature', expectedBytes: 1 },
  ENGINE_LOAD: { command: '0104', description: 'Engine load', expectedBytes: 1 },
  THROTTLE: { command: '0111', description: 'Throttle position', expectedBytes: 1 },
  FUEL_LEVEL: { command: '012F', description: 'Fuel level', expectedBytes: 1 },
  INTAKE_TEMP: { command: '010F', description: 'Intake air temperature', expectedBytes: 1 },
  MAF_RATE: { command: '0110', description: 'MAF air flow rate', expectedBytes: 2 },

  GET_DTC: { command: '03', description: 'Get diagnostic trouble codes' },
  CLEAR_DTC: { command: '04', description: 'Clear DTCs' },
  GET_VIN: { command: '0902', description: 'Get VIN' },
};

export const PROTOCOLS = {
  '0': 'Auto',
  '1': 'SAE J1850 PWM',
  '2': 'SAE J1850 VPW',
  '3': 'ISO 9141-2',
  '4': 'ISO 14230-4 KWP (5 baud init)',
  '5': 'ISO 14230-4 KWP (fast init)',
  '6': 'ISO 15765-4 CAN (11 bit ID, 500 kbaud)',
  '7': 'ISO 15765-4 CAN (29 bit ID, 500 kbaud)',
  '8': 'ISO 15765-4 CAN (11 bit ID, 250 kbaud)',
  '9': 'ISO 15765-4 CAN (29 bit ID, 250 kbaud)',
  'A': 'SAE J1939 CAN',
};

export class ELM327 {
  private device: BluetoothDevice | null = null;
  private characteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private buffer: string = '';
  private pendingResolve: ((value: string) => void) | null = null;
  private isInitialized = false;

  async connect(): Promise<boolean> {
    try {
      if (!navigator.bluetooth) {
        throw new Error('Web Bluetooth API not supported. Use Chrome/Edge browser.');
      }

      this.device = await navigator.bluetooth.requestDevice({
        filters: [
          { namePrefix: 'OBD' },
          { namePrefix: 'ELM' },
          { namePrefix: 'OBDII' },
          { namePrefix: 'Vgate' },
          { namePrefix: 'CHX' },
        ],
        optionalServices: ['0000fff0-0000-1000-8000-00805f9b34fb']
      });

      if (!this.device.gatt) {
        throw new Error('GATT not available');
      }

      const server = await this.device.gatt.connect();
      const service = await server.getPrimaryService('0000fff0-0000-1000-8000-00805f9b34fb');
      this.characteristic = await service.getCharacteristic('0000fff1-0000-1000-8000-00805f9b34fb');

      await this.characteristic.startNotifications();
      this.characteristic.addEventListener('characteristicvaluechanged', this.handleNotification.bind(this));

      await this.initialize();

      return true;
    } catch (error) {
      console.error('ELM327 connection error:', error);
      throw error;
    }
  }

  private async initialize(): Promise<void> {
    console.log('Initializing ELM327...');

    await this.sendCommand(OBD_COMMANDS.RESET.command);
    await this.delay(2000);

    await this.sendCommand(OBD_COMMANDS.ECHO_OFF.command);
    await this.delay(100);

    await this.sendCommand(OBD_COMMANDS.LINEFEED_OFF.command);
    await this.delay(100);

    await this.sendCommand(OBD_COMMANDS.HEADERS_OFF.command);
    await this.delay(100);

    await this.sendCommand(OBD_COMMANDS.SPACES_OFF.command);
    await this.delay(100);

    await this.sendCommand(OBD_COMMANDS.AUTO_PROTOCOL.command);
    await this.delay(100);

    const protocol = await this.sendCommand(OBD_COMMANDS.GET_PROTOCOL.command);
    const protocolNum = protocol.trim();
    console.log(`Protocol detected: ${PROTOCOLS[protocolNum as keyof typeof PROTOCOLS] || 'Unknown'} (${protocolNum})`);

    this.isInitialized = true;
  }

  private handleNotification(event: Event): void {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    if (!value) return;

    const decoder = new TextDecoder();
    const text = decoder.decode(value);
    this.buffer += text;

    if (this.buffer.includes('>') || this.buffer.includes('?')) {
      const response = this.buffer.replace('>', '').replace('?', '').trim();
      this.buffer = '';

      if (this.pendingResolve) {
        this.pendingResolve(response);
        this.pendingResolve = null;
      }
    }
  }

  async sendCommand(command: string, timeout = 3000): Promise<string> {
    if (!this.characteristic) {
      throw new Error('Not connected to device');
    }

    const encoder = new TextEncoder();
    const data = encoder.encode(command + '\r');

    await this.characteristic.writeValue(data);

    return new Promise((resolve, reject) => {
      this.pendingResolve = resolve;

      setTimeout(() => {
        if (this.pendingResolve) {
          this.pendingResolve = null;
          reject(new Error(`Command timeout: ${command}`));
        }
      }, timeout);
    });
  }

  async readPID(command: string): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('ELM327 not initialized');
    }

    const response = await this.sendCommand(command);
    return this.cleanResponse(response);
  }

  private cleanResponse(response: string): string {
    return response
      .replace(/\r/g, '')
      .replace(/\n/g, '')
      .replace(/\s/g, '')
      .replace(/>/g, '')
      .toUpperCase();
  }

  parseSpeed(response: string): number {
    const hex = response.substring(4, 6);
    return parseInt(hex, 16);
  }

  parseRPM(response: string): number {
    const a = parseInt(response.substring(4, 6), 16);
    const b = parseInt(response.substring(6, 8), 16);
    return ((a * 256) + b) / 4;
  }

  parseTemperature(response: string): number {
    const hex = response.substring(4, 6);
    return parseInt(hex, 16) - 40;
  }

  parsePercentage(response: string): number {
    const hex = response.substring(4, 6);
    return (parseInt(hex, 16) * 100) / 255;
  }

  parseMAF(response: string): number {
    const a = parseInt(response.substring(4, 6), 16);
    const b = parseInt(response.substring(6, 8), 16);
    return ((a * 256) + b) / 100;
  }

  async readDTCs(): Promise<string[]> {
    try {
      const response = await this.sendCommand(OBD_COMMANDS.GET_DTC.command);
      return this.parseDTCs(response);
    } catch (error) {
      console.error('Error reading DTCs:', error);
      return [];
    }
  }

  private parseDTCs(response: string): string[] {
    const codes: string[] = [];
    const clean = this.cleanResponse(response);

    if (clean.includes('NODATA') || clean.length < 4) {
      return codes;
    }

    const data = clean.substring(2);

    for (let i = 0; i < data.length; i += 4) {
      const byte1 = parseInt(data.substring(i, i + 2), 16);
      const byte2 = parseInt(data.substring(i + 2, i + 4), 16);

      if (byte1 === 0 && byte2 === 0) continue;

      const prefixMap: { [key: number]: string } = {
        0: 'P0', 1: 'P1', 2: 'P2', 3: 'P3',
        4: 'C0', 5: 'C1', 6: 'C2', 7: 'C3',
        8: 'B0', 9: 'B1', 10: 'B2', 11: 'B3',
        12: 'U0', 13: 'U1', 14: 'U2', 15: 'U3',
      };

      const prefix = prefixMap[(byte1 >> 6) & 0x03];
      const code = prefix + ((byte1 & 0x3F) * 256 + byte2).toString(16).toUpperCase().padStart(3, '0');
      codes.push(code);
    }

    return codes;
  }

  async clearDTCs(): Promise<boolean> {
    try {
      await this.sendCommand(OBD_COMMANDS.CLEAR_DTC.command);
      return true;
    } catch (error) {
      console.error('Error clearing DTCs:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.device = null;
    this.characteristic = null;
    this.isInitialized = false;
  }

  isConnected(): boolean {
    return this.device?.gatt?.connected || false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
