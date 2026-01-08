export interface Vehicle {
  id: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  created_at: string;
}

export interface DiagnosticSession {
  id: string;
  vehicle_id: string;
  started_at: string;
  ended_at?: string;
  session_type: 'real' | 'simulation';
  notes?: string;
  vehicle?: Vehicle;
}

export interface OBDReading {
  id: string;
  session_id: string;
  timestamp: string;
  speed: number;
  rpm: number;
  coolant_temp: number;
  engine_load: number;
  throttle_position: number;
  fuel_level: number;
  intake_temp: number;
  maf_rate: number;
}

export interface DTCCode {
  id: string;
  session_id: string;
  code: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  detected_at: string;
  status: 'active' | 'pending' | 'cleared';
}

export interface DTCDefinition {
  code: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'powertrain' | 'chassis' | 'body' | 'network';
  possible_causes: string;
  recommended_actions: string;
}

export interface LiveMetrics {
  speed: number;
  rpm: number;
  coolant_temp: number;
  engine_load: number;
  throttle_position: number;
  fuel_level: number;
  intake_temp: number;
  maf_rate: number;
}
