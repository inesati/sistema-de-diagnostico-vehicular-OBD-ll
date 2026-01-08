import { useState, useEffect } from 'react';
import { Power, Play, Pause, RotateCcw, Car, AlertTriangle, Activity, Database, Bluetooth, Wifi, Cpu } from 'lucide-react';
import LiveMetrics from './components/LiveMetrics';
import MetricsChart from './components/MetricsChart';
import DTCViewer from './components/DTCViewer';
import DiagnosticHistory from './components/DiagnosticHistory';
import { useOBDConnection } from './hooks/useOBDConnection';
import { diagnosticService } from './services/diagnosticService';
import { DTCCode, DTCDefinition, Vehicle } from './types/obd';
import { ConnectionType } from './services/obdService';

function App() {
  const [isConnected, setIsConnected] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [dtcCodes, setDtcCodes] = useState<DTCCode[]>([]);
  const [dtcDefinitions, setDtcDefinitions] = useState<Map<string, DTCDefinition>>(new Map());
  const [saveInterval, setSaveInterval] = useState<NodeJS.Timeout | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'dtc' | 'history'>('dashboard');
  const [connectionType, setConnectionType] = useState<ConnectionType>('simulation');
  const [wifiUrl, setWifiUrl] = useState('http://192.168.0.10');
  const [showConnectionModal, setShowConnectionModal] = useState(false);

  const {
    metrics,
    isDriving,
    isReading,
    error: connectionError,
    connectToVehicle,
    disconnect,
    toggleDriving,
    resetSimulation,
    readDTCs: readRealDTCs,
  } = useOBDConnection({
    connectionType,
    wifiUrl,
    isConnected,
  });

  useEffect(() => {
    loadVehicles();
    loadDTCDefinitions();
  }, []);

  useEffect(() => {
    if (isConnected && sessionId) {
      const interval = setInterval(() => {
        diagnosticService.saveReading(sessionId, metrics);
      }, 5000);
      setSaveInterval(interval);

      return () => {
        if (interval) clearInterval(interval);
      };
    } else if (saveInterval) {
      clearInterval(saveInterval);
      setSaveInterval(null);
    }
  }, [isConnected, sessionId, metrics]);

  const loadVehicles = async () => {
    const data = await diagnosticService.getVehicles();
    setVehicles(data);
    if (data.length > 0) {
      setSelectedVehicle(data[0]);
    }
  };

  const loadDTCDefinitions = async () => {
    const codes = ['P0420', 'P0171', 'P0301', 'P0128', 'P0442', 'P0300', 'C0035', 'B0001', 'U0100'];
    const definitions = new Map<string, DTCDefinition>();

    for (const code of codes) {
      const def = await diagnosticService.getDTCDefinition(code);
      if (def) {
        definitions.set(code, def);
      }
    }

    setDtcDefinitions(definitions);
  };

  const handleConnect = async () => {
    if (!isConnected) {
      if (!selectedVehicle) {
        alert('Please select a vehicle first');
        return;
      }

      try {
        await connectToVehicle();

        const session = await diagnosticService.createSession(selectedVehicle.id);
        if (session) {
          setSessionId(session.id);
          setIsConnected(true);
          setDtcCodes([]);

          if (connectionType === 'simulation') {
            setTimeout(() => simulateDTC(session.id), 10000);
          } else {
            setTimeout(() => readAndSaveDTCs(session.id), 5000);
          }
        }
      } catch (error) {
        console.error('Connection error:', error);
        alert(`Failed to connect: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      if (sessionId) {
        await diagnosticService.endSession(sessionId);
      }
      await disconnect();
      setIsConnected(false);
      setSessionId(null);
    }
  };

  const readAndSaveDTCs = async (sessionId: string) => {
    try {
      const codes = await readRealDTCs();

      for (const code of codes) {
        const definition = await diagnosticService.getDTCDefinition(code);
        if (definition) {
          await diagnosticService.saveDTCCode(
            sessionId,
            code,
            definition.description,
            definition.severity
          );
        }
      }

      const savedCodes = await diagnosticService.getSessionDTCCodes(sessionId);
      setDtcCodes(savedCodes);
    } catch (error) {
      console.error('Error reading DTCs:', error);
    }
  };

  const simulateDTC = async (sessionId: string) => {
    const randomCodes = ['P0420', 'P0171', 'P0301'];
    const randomCode = randomCodes[Math.floor(Math.random() * randomCodes.length)];
    const definition = await diagnosticService.getDTCDefinition(randomCode);

    if (definition) {
      await diagnosticService.saveDTCCode(sessionId, randomCode, definition.description, definition.severity);
      const codes = await diagnosticService.getSessionDTCCodes(sessionId);
      setDtcCodes(codes);
    }
  };

  const getConnectionIcon = () => {
    switch (connectionType) {
      case 'bluetooth':
        return <Bluetooth size={20} />;
      case 'wifi':
        return <Wifi size={20} />;
      default:
        return <Cpu size={20} />;
    }
  };

  const getConnectionLabel = () => {
    switch (connectionType) {
      case 'bluetooth':
        return 'Bluetooth ELM327';
      case 'wifi':
        return 'WiFi ELM327';
      default:
        return 'Simulation Mode';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-600 rounded-lg">
                <Activity size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold">OBD-II Diagnostic System</h1>
                <p className="text-slate-400 text-sm">Professional Vehicle Diagnostics Platform</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-slate-400">Connection</p>
                <div className="flex items-center gap-2">
                  {getConnectionIcon()}
                  <span className="text-sm font-medium">{getConnectionLabel()}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-400">Status</p>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                  <span className="text-sm font-medium">
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <nav className="bg-slate-900 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
                activeTab === 'dashboard'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <Activity size={18} />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('dtc')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
                activeTab === 'dtc'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <AlertTriangle size={18} />
              DTC Codes
              {dtcCodes.length > 0 && (
                <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {dtcCodes.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors ${
                activeTab === 'history'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-slate-400 hover:text-slate-300'
              }`}
            >
              <Database size={18} />
              History
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {connectionError && (
          <div className="mb-6 bg-red-900/30 border border-red-700 rounded-lg p-4">
            <p className="text-red-300 font-medium">Connection Error: {connectionError}</p>
          </div>
        )}

        <div className="mb-6 bg-slate-800 border border-slate-700 rounded-lg p-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <Car size={24} className="text-slate-400" />
              <div>
                <label className="text-sm text-slate-400 mb-1 block">Select Vehicle</label>
                <select
                  value={selectedVehicle?.id || ''}
                  onChange={(e) => {
                    const vehicle = vehicles.find(v => v.id === e.target.value);
                    setSelectedVehicle(vehicle || null);
                  }}
                  disabled={isConnected}
                  className="bg-slate-700 text-slate-100 border border-slate-600 rounded px-3 py-2 disabled:opacity-50"
                >
                  {vehicles.map(vehicle => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.year} {vehicle.make} {vehicle.model} ({vehicle.vin})
                    </option>
                  ))}
                </select>
              </div>

              {!isConnected && (
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">Connection Type</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConnectionType('simulation')}
                      className={`flex items-center gap-2 px-3 py-2 rounded ${
                        connectionType === 'simulation'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      <Cpu size={16} />
                      Simulation
                    </button>
                    <button
                      onClick={() => {
                        setConnectionType('bluetooth');
                        setShowConnectionModal(true);
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded ${
                        connectionType === 'bluetooth'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      <Bluetooth size={16} />
                      Bluetooth
                    </button>
                    <button
                      onClick={() => {
                        setConnectionType('wifi');
                        setShowConnectionModal(true);
                      }}
                      className={`flex items-center gap-2 px-3 py-2 rounded ${
                        connectionType === 'wifi'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      <Wifi size={16} />
                      WiFi
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              {isConnected && connectionType === 'simulation' && (
                <>
                  <button
                    onClick={toggleDriving}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      isDriving
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : 'bg-green-600 hover:bg-green-700 text-white'
                    }`}
                  >
                    {isDriving ? <Pause size={18} /> : <Play size={18} />}
                    {isDriving ? 'Stop Driving' : 'Start Driving'}
                  </button>

                  <button
                    onClick={resetSimulation}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg font-medium transition-colors"
                  >
                    <RotateCcw size={18} />
                    Reset
                  </button>
                </>
              )}

              <button
                onClick={handleConnect}
                disabled={isReading}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
                  isConnected
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                } disabled:opacity-50`}
              >
                <Power size={18} />
                {isConnected ? 'Disconnect' : 'Connect to OBD-II'}
              </button>
            </div>
          </div>
        </div>

        {!isConnected ? (
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-12 text-center">
            <Activity size={64} className="mx-auto mb-4 text-slate-600" />
            <h3 className="text-xl font-semibold mb-2">Not Connected</h3>
            <p className="text-slate-400 mb-6">
              {connectionType === 'simulation'
                ? 'Connect to start simulation mode'
                : `Connect your ${connectionType === 'bluetooth' ? 'Bluetooth' : 'WiFi'} ELM327 adapter`}
            </p>
            <div className="bg-slate-900 border border-slate-700 rounded-lg p-6 max-w-2xl mx-auto text-left">
              <h4 className="font-semibold mb-3">
                {connectionType === 'simulation' ? 'System Features:' : 'Connection Requirements:'}
              </h4>
              {connectionType === 'simulation' ? (
                <ul className="space-y-2 text-sm text-slate-300">
                  <li>• Real-time monitoring of vehicle parameters</li>
                  <li>• Automatic DTC (Diagnostic Trouble Code) detection</li>
                  <li>• Interactive data visualization and charts</li>
                  <li>• Diagnostic session history tracking</li>
                  <li>• Comprehensive DTC database with recommended actions</li>
                  <li>• Simulation mode for testing and demonstration</li>
                </ul>
              ) : connectionType === 'bluetooth' ? (
                <ul className="space-y-2 text-sm text-slate-300">
                  <li>• ELM327 Bluetooth adapter (v1.5 or higher recommended)</li>
                  <li>• Chrome or Edge browser (Web Bluetooth API support)</li>
                  <li>• Adapter must be paired with your device</li>
                  <li>• Vehicle ignition must be ON</li>
                  <li>• Works with most vehicles (1996+ in US, 2001+ in EU)</li>
                </ul>
              ) : (
                <ul className="space-y-2 text-sm text-slate-300">
                  <li>• ELM327 WiFi adapter</li>
                  <li>• Connected to adapter's WiFi network</li>
                  <li>• Adapter IP: {wifiUrl}</li>
                  <li>• Vehicle ignition must be ON</li>
                  <li>• Check adapter documentation for correct IP</li>
                </ul>
              )}
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <div className="space-y-6">
                {isReading && (
                  <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3 text-center">
                    <p className="text-blue-300 text-sm">Reading data from vehicle...</p>
                  </div>
                )}
                <LiveMetrics metrics={metrics} />
                <MetricsChart metrics={metrics} />
              </div>
            )}

            {activeTab === 'dtc' && (
              <DTCViewer dtcCodes={dtcCodes} dtcDefinitions={dtcDefinitions} />
            )}

            {activeTab === 'history' && (
              <DiagnosticHistory />
            )}
          </>
        )}
      </main>

      {showConnectionModal && connectionType === 'wifi' && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">WiFi Adapter Configuration</h3>
            <div className="mb-4">
              <label className="text-sm text-slate-400 mb-2 block">Adapter URL</label>
              <input
                type="text"
                value={wifiUrl}
                onChange={(e) => setWifiUrl(e.target.value)}
                placeholder="http://192.168.0.10"
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-slate-100"
              />
              <p className="text-xs text-slate-500 mt-1">
                Default: http://192.168.0.10 (check your adapter manual)
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConnectionModal(false)}
                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowConnectionModal(false)}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="bg-slate-900 border-t border-slate-800 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-slate-400 text-sm">
            <p>OBD-II Professional Diagnostic System - Real Vehicle Support</p>
            <p className="mt-1">Supports ELM327 Bluetooth/WiFi adapters and Simulation Mode</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
