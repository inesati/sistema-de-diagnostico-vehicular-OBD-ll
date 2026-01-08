import { AlertTriangle, AlertCircle, Info, CheckCircle } from 'lucide-react';
import { DTCCode, DTCDefinition } from '../types/obd';
import { useState } from 'react';

interface DTCViewerProps {
  dtcCodes: DTCCode[];
  dtcDefinitions: Map<string, DTCDefinition>;
}

export default function DTCViewer({ dtcCodes, dtcDefinitions }: DTCViewerProps) {
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="text-red-400" size={20} />;
      case 'warning':
        return <AlertCircle className="text-amber-400" size={20} />;
      case 'info':
        return <Info className="text-blue-400" size={20} />;
      default:
        return <CheckCircle className="text-green-400" size={20} />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'border-red-700 bg-red-900/20';
      case 'warning':
        return 'border-amber-700 bg-amber-900/20';
      case 'info':
        return 'border-blue-700 bg-blue-900/20';
      default:
        return 'border-slate-700 bg-slate-800';
    }
  };

  const selectedDefinition = selectedCode ? dtcDefinitions.get(selectedCode) : null;

  if (dtcCodes.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Diagnostic Trouble Codes (DTC)</h3>
        <div className="flex flex-col items-center justify-center py-8 text-slate-400">
          <CheckCircle size={48} className="mb-3 text-green-500" />
          <p className="text-lg font-medium">No trouble codes detected</p>
          <p className="text-sm">All systems operating normally</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-slate-100 mb-4">
        Diagnostic Trouble Codes ({dtcCodes.length})
      </h3>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          {dtcCodes.map((dtc) => (
            <button
              key={dtc.id}
              onClick={() => setSelectedCode(dtc.code)}
              className={`w-full text-left border rounded-lg p-4 transition-all hover:border-opacity-80 ${
                getSeverityColor(dtc.severity)
              } ${selectedCode === dtc.code ? 'ring-2 ring-blue-500' : ''}`}
            >
              <div className="flex items-start gap-3">
                {getSeverityIcon(dtc.severity)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-slate-100 font-bold">{dtc.code}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      dtc.status === 'active' ? 'bg-red-600/30 text-red-300' :
                      dtc.status === 'pending' ? 'bg-amber-600/30 text-amber-300' :
                      'bg-slate-600/30 text-slate-300'
                    }`}>
                      {dtc.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-slate-300 text-sm">{dtc.description}</p>
                  <p className="text-slate-500 text-xs mt-2">
                    {new Date(dtc.detected_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
          {selectedDefinition ? (
            <div className="space-y-4">
              <div>
                <h4 className="text-slate-100 font-bold text-xl mb-2">{selectedCode}</h4>
                <p className="text-slate-300">{selectedDefinition.description}</p>
              </div>

              <div>
                <h5 className="text-slate-100 font-semibold mb-2">Category</h5>
                <span className="inline-block px-3 py-1 bg-slate-700 text-slate-200 rounded text-sm capitalize">
                  {selectedDefinition.category}
                </span>
              </div>

              <div>
                <h5 className="text-slate-100 font-semibold mb-2">Possible Causes</h5>
                <p className="text-slate-300 text-sm leading-relaxed">
                  {selectedDefinition.possible_causes}
                </p>
              </div>

              <div>
                <h5 className="text-slate-100 font-semibold mb-2">Recommended Actions</h5>
                <p className="text-slate-300 text-sm leading-relaxed">
                  {selectedDefinition.recommended_actions}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              Select a DTC code to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
