/*
  # Vehicle Diagnostics System - Complete Database Schema

  ## Overview
  Complete OBD-II vehicle diagnostics system database for automotive workshops and fleet management.

  ## Tables Created

  ### 1. vehicles
  Stores vehicle information for diagnostics tracking
  - `id` (uuid, primary key)
  - `vin` (text) - Vehicle Identification Number
  - `make` (text) - Manufacturer (e.g., BMW, Mercedes)
  - `model` (text)
  - `year` (integer)
  - `created_at` (timestamp)

  ### 2. diagnostic_sessions
  Each connection to a vehicle creates a diagnostic session
  - `id` (uuid, primary key)
  - `vehicle_id` (uuid, foreign key)
  - `started_at` (timestamp)
  - `ended_at` (timestamp)
  - `session_type` (text) - 'real' or 'simulation'
  - `notes` (text)

  ### 3. obd_readings
  Real-time OBD-II data readings (speed, RPM, temperature, etc.)
  - `id` (uuid, primary key)
  - `session_id` (uuid, foreign key)
  - `timestamp` (timestamp)
  - `speed` (integer) - km/h
  - `rpm` (integer)
  - `coolant_temp` (integer) - Celsius
  - `engine_load` (decimal)
  - `throttle_position` (decimal)
  - `fuel_level` (decimal)
  - `intake_temp` (integer)
  - `maf_rate` (decimal) - Mass Air Flow

  ### 4. dtc_codes
  Diagnostic Trouble Codes detected
  - `id` (uuid, primary key)
  - `session_id` (uuid, foreign key)
  - `code` (text) - e.g., P0420, P0171
  - `description` (text)
  - `severity` (text) - 'critical', 'warning', 'info'
  - `detected_at` (timestamp)
  - `status` (text) - 'active', 'pending', 'cleared'

  ### 5. dtc_definitions
  Master table of all possible DTC codes and their meanings
  - `code` (text, primary key)
  - `description` (text)
  - `severity` (text)
  - `category` (text) - 'powertrain', 'chassis', 'body', 'network'
  - `possible_causes` (text)
  - `recommended_actions` (text)

  ## Security
  - RLS enabled on all tables
  - Public read access for demo purposes
  - Insert/Update/Delete require authentication
*/

-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vin text UNIQUE,
  make text NOT NULL,
  model text NOT NULL,
  year integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create diagnostic_sessions table
CREATE TABLE IF NOT EXISTS diagnostic_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz,
  session_type text DEFAULT 'simulation' CHECK (session_type IN ('real', 'simulation')),
  notes text
);

-- Create obd_readings table
CREATE TABLE IF NOT EXISTS obd_readings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES diagnostic_sessions(id) ON DELETE CASCADE,
  timestamp timestamptz DEFAULT now(),
  speed integer DEFAULT 0,
  rpm integer DEFAULT 0,
  coolant_temp integer DEFAULT 0,
  engine_load decimal(5,2) DEFAULT 0,
  throttle_position decimal(5,2) DEFAULT 0,
  fuel_level decimal(5,2) DEFAULT 0,
  intake_temp integer DEFAULT 0,
  maf_rate decimal(6,2) DEFAULT 0
);

-- Create dtc_codes table
CREATE TABLE IF NOT EXISTS dtc_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES diagnostic_sessions(id) ON DELETE CASCADE,
  code text NOT NULL,
  description text NOT NULL,
  severity text DEFAULT 'warning' CHECK (severity IN ('critical', 'warning', 'info')),
  detected_at timestamptz DEFAULT now(),
  status text DEFAULT 'active' CHECK (status IN ('active', 'pending', 'cleared'))
);

-- Create dtc_definitions table
CREATE TABLE IF NOT EXISTS dtc_definitions (
  code text PRIMARY KEY,
  description text NOT NULL,
  severity text DEFAULT 'warning' CHECK (severity IN ('critical', 'warning', 'info')),
  category text DEFAULT 'powertrain' CHECK (category IN ('powertrain', 'chassis', 'body', 'network')),
  possible_causes text,
  recommended_actions text
);

-- Enable Row Level Security
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE obd_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE dtc_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dtc_definitions ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Public read for demo, authenticated write
CREATE POLICY "Public can view vehicles"
  ON vehicles FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert vehicles"
  ON vehicles FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Public can view diagnostic sessions"
  ON diagnostic_sessions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage sessions"
  ON diagnostic_sessions FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can view OBD readings"
  ON obd_readings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert readings"
  ON obd_readings FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Public can view DTC codes"
  ON dtc_codes FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Authenticated users can manage DTC codes"
  ON dtc_codes FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Public can view DTC definitions"
  ON dtc_definitions FOR SELECT
  TO anon, authenticated
  USING (true);

-- Insert sample DTC definitions
INSERT INTO dtc_definitions (code, description, severity, category, possible_causes, recommended_actions)
VALUES
  ('P0420', 'Catalyst System Efficiency Below Threshold (Bank 1)', 'warning', 'powertrain', 
   'Faulty catalytic converter, oxygen sensor malfunction, exhaust leak, engine misfire',
   'Check oxygen sensors, inspect catalytic converter, check for exhaust leaks'),
  
  ('P0171', 'System Too Lean (Bank 1)', 'warning', 'powertrain',
   'Vacuum leak, faulty MAF sensor, fuel pump issues, clogged fuel filter, faulty fuel injectors',
   'Check for vacuum leaks, test MAF sensor, inspect fuel system pressure'),
  
  ('P0301', 'Cylinder 1 Misfire Detected', 'critical', 'powertrain',
   'Faulty spark plug, ignition coil failure, fuel injector problem, low compression',
   'Replace spark plugs, test ignition coil, check fuel injector, perform compression test'),
  
  ('P0128', 'Coolant Thermostat (Coolant Temperature Below Thermostat Regulating Temperature)', 'info', 'powertrain',
   'Faulty thermostat, low coolant level, faulty coolant temperature sensor',
   'Replace thermostat, check coolant level, test temperature sensor'),
  
  ('P0442', 'Evaporative Emission Control System Leak Detected (Small Leak)', 'info', 'powertrain',
   'Loose or damaged gas cap, cracked EVAP hose, faulty purge valve',
   'Check gas cap, inspect EVAP system hoses, test purge valve'),
  
  ('P0300', 'Random/Multiple Cylinder Misfire Detected', 'critical', 'powertrain',
   'Faulty spark plugs/wires, fuel delivery issues, vacuum leak, low compression',
   'Replace spark plugs, check fuel pressure, inspect for vacuum leaks'),
  
  ('C0035', 'Left Front Wheel Speed Circuit Malfunction', 'warning', 'chassis',
   'Faulty wheel speed sensor, damaged sensor wiring, dirty/damaged tone ring',
   'Inspect wheel speed sensor, check sensor wiring, clean tone ring'),
  
  ('B0001', 'Driver Airbag Circuit Short to Ground', 'critical', 'body',
   'Short circuit in airbag wiring, faulty airbag module, damaged clock spring',
   'Inspect airbag wiring, test airbag module, check clock spring'),
  
  ('U0100', 'Lost Communication With ECM/PCM', 'critical', 'network',
   'Faulty ECM/PCM, damaged CAN bus wiring, poor electrical connection',
   'Check CAN bus wiring, inspect electrical connections, test ECM/PCM')
ON CONFLICT (code) DO NOTHING;

-- Insert sample vehicle
INSERT INTO vehicles (vin, make, model, year)
VALUES
  ('WBADT43452G123456', 'BMW', '330i', 2020),
  ('WDD2050071F123456', 'Mercedes-Benz', 'C-Class', 2019),
  ('5YJ3E1EA1JF123456', 'Tesla', 'Model 3', 2021)
ON CONFLICT (vin) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_obd_readings_session ON obd_readings(session_id);
CREATE INDEX IF NOT EXISTS idx_obd_readings_timestamp ON obd_readings(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_dtc_codes_session ON dtc_codes(session_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_sessions_vehicle ON diagnostic_sessions(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_diagnostic_sessions_started ON diagnostic_sessions(started_at DESC);