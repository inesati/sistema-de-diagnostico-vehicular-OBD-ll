import { useEffect, useState } from 'react';
import { Clock, Car, Calendar } from 'lucide-react';
import { DiagnosticSession } from '../types/obd';
import { diagnosticService } from '../services/diagnosticService';

export default function DiagnosticHistory() {
  const [sessions, setSessions] = useState<DiagnosticSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    const data = await diagnosticService.getAllSessions(20);
    setSessions(data);
    setLoading(false);
  };

  const formatDuration = (start: string, end?: string) => {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const duration = Math.floor((endTime - startTime) / 1000 / 60);
    return `${duration} min`;
  };

  if (loading) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Diagnostic History</h3>
        <div className="text-center py-8 text-slate-400">Loading...</div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Diagnostic History</h3>
        <div className="text-center py-8 text-slate-400">
          <Clock size={48} className="mx-auto mb-3 opacity-50" />
          <p>No diagnostic sessions yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-100">Diagnostic History</h3>
        <button
          onClick={loadSessions}
          className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded text-sm transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="bg-slate-900 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <div className="p-2 bg-slate-800 rounded-lg">
                  <Car size={20} className="text-slate-400" />
                </div>
                <div className="flex-1 min-w-0">
                  {session.vehicle ? (
                    <div>
                      <p className="text-slate-100 font-semibold">
                        {session.vehicle.year} {session.vehicle.make} {session.vehicle.model}
                      </p>
                      <p className="text-slate-400 text-sm">VIN: {session.vehicle.vin}</p>
                    </div>
                  ) : (
                    <p className="text-slate-100 font-semibold">Unknown Vehicle</p>
                  )}

                  <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      <span>{new Date(session.started_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      <span>{formatDuration(session.started_at, session.ended_at)}</span>
                    </div>
                  </div>

                  {session.notes && (
                    <p className="text-slate-400 text-sm mt-2">{session.notes}</p>
                  )}
                </div>
              </div>

              <span className={`px-2 py-1 rounded text-xs font-medium ${
                session.session_type === 'real'
                  ? 'bg-green-600/30 text-green-300'
                  : 'bg-blue-600/30 text-blue-300'
              }`}>
                {session.session_type === 'real' ? 'Real' : 'Simulation'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
