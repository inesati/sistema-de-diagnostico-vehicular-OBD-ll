import { supabase } from '../lib/supabase';
import { DiagnosticSession, OBDReading, DTCCode, Vehicle } from '../types/obd';

export const diagnosticService = {
  async createSession(vehicleId: string): Promise<DiagnosticSession | null> {
    const { data, error } = await supabase
      .from('diagnostic_sessions')
      .insert({
        vehicle_id: vehicleId,
        session_type: 'simulation',
        started_at: new Date().toISOString()
      })
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error creating session:', error);
      return null;
    }

    return data;
  },

  async endSession(sessionId: string): Promise<void> {
    const { error } = await supabase
      .from('diagnostic_sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (error) {
      console.error('Error ending session:', error);
    }
  },

  async saveReading(sessionId: string, reading: Omit<OBDReading, 'id' | 'session_id' | 'timestamp'>): Promise<void> {
    const { error } = await supabase
      .from('obd_readings')
      .insert({
        session_id: sessionId,
        timestamp: new Date().toISOString(),
        ...reading
      });

    if (error) {
      console.error('Error saving reading:', error);
    }
  },

  async getSessionReadings(sessionId: string, limit = 100): Promise<OBDReading[]> {
    const { data, error } = await supabase
      .from('obd_readings')
      .select('*')
      .eq('session_id', sessionId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching readings:', error);
      return [];
    }

    return data || [];
  },

  async saveDTCCode(sessionId: string, code: string, description: string, severity: 'critical' | 'warning' | 'info'): Promise<void> {
    const { error } = await supabase
      .from('dtc_codes')
      .insert({
        session_id: sessionId,
        code,
        description,
        severity,
        detected_at: new Date().toISOString(),
        status: 'active'
      });

    if (error) {
      console.error('Error saving DTC code:', error);
    }
  },

  async getSessionDTCCodes(sessionId: string): Promise<DTCCode[]> {
    const { data, error } = await supabase
      .from('dtc_codes')
      .select('*')
      .eq('session_id', sessionId)
      .order('detected_at', { ascending: false });

    if (error) {
      console.error('Error fetching DTC codes:', error);
      return [];
    }

    return data || [];
  },

  async getAllSessions(limit = 10): Promise<DiagnosticSession[]> {
    const { data, error } = await supabase
      .from('diagnostic_sessions')
      .select(`
        *,
        vehicle:vehicles(*)
      `)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching sessions:', error);
      return [];
    }

    return data || [];
  },

  async getVehicles(): Promise<Vehicle[]> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching vehicles:', error);
      return [];
    }

    return data || [];
  },

  async getDTCDefinition(code: string) {
    const { data, error } = await supabase
      .from('dtc_definitions')
      .select('*')
      .eq('code', code)
      .maybeSingle();

    if (error) {
      console.error('Error fetching DTC definition:', error);
      return null;
    }

    return data;
  }
};
