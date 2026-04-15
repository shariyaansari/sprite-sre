import React, { useState, useEffect } from 'react';
import './App.css'; // Just to clear it out, logic is in index.css

function App() {
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);

  // Initial Fetch
  useEffect(() => {
    fetchIncidents();
    // In production we'd use Server-Sent Events (SSE) or WebSockets
    const poll = setInterval(fetchIncidents, 3000); 
    return () => clearInterval(poll);
  }, []);

  const fetchIncidents = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/incidents');
      const data = await res.json();
      if (data.success) {
        setIncidents(data.data);
      }
    } catch (err) {
      console.error("API Unreachable", err);
    }
  };

  const clearIncidents = async () => {
    try {
      await fetch('http://localhost:5000/api/incidents', { method: 'DELETE' });
      fetchIncidents(); // Refresh UI instantly
    } catch (e) {
      console.error(e);
    }
  };

  const simulateFailure = async () => {
    setLoading(true);
    try {
      await fetch('http://localhost:5000/api/incidents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceName: 'logistics-worker',
          rawLog: 'ERROR: FATAL Memory Heap out of bounds. Kernel OOM kill initiated.'
        })
      });
      // The polling will automatically pick up the new record
    } catch (error) {
      alert("Failed to reach backend.");
    }
    setLoading(false);
  };

  return (
    <div className="app-container fade-in">
      {/* Control Plane Header */}
      <header className="layout-header">
        <div className="logo">
          <div className="logo-dot"></div>
          SpriteSRE
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <span className="text-muted text-sm">System Status: Monitoring</span>
          
          <button 
            className="btn"
            style={{ backgroundColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
            onClick={clearIncidents}
          >
            🧹 Clear Data
          </button>

          <button 
            className="btn btn-danger" 
            onClick={simulateFailure}
            disabled={loading}
          >
            {loading ? 'Simulating...' : '🚨 Simulate Microservice Failure'}
          </button>
        </div>
      </header>

      {/* Main Dashboard Panel */}
      <main className="main-content">
        <div style={{ marginBottom: '32px' }}>
          <h1>Active Incidents</h1>
          <p className="text-muted" style={{ marginTop: '8px' }}>
            {/* Autonomous agent is monitoring production clusters. */}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {incidents.length === 0 ? (
            <div className="panel" style={{ textAlign: 'center', padding: '60px' }}>
              <h2 className="text-muted">No Active Incidents</h2>
              <p className="text-muted" style={{ marginTop: '12px' }}>Waiting for anomalies...</p>
            </div>
          ) : (
            incidents.map((incident) => (
              <IncidentCard key={incident._id} incident={incident} />
            ))
          )}
        </div>
      </main>
    </div>
  );
}

function IncidentCard({ incident }) {
  const [localStatus, setLocalStatus] = useState(incident.status);

  // Sync with polling
  useEffect(() => {
    setLocalStatus(incident.status);
  }, [incident.status]);

  const isResolved = localStatus === 'RESOLVED';
  const isFixSuggested = localStatus === 'FIX_SUGGESTED';
  const isTesting = localStatus === 'TESTING';

  const handleApplyPatch = async () => {
    try {
      // Optimistic UI Update: Instant feedback
      setLocalStatus('TESTING');
      await fetch(`http://localhost:5000/api/incidents/${incident._id}/patch`, { method: 'POST' });
    } catch (e) {
      console.error(e);
      setLocalStatus(incident.status); // Revert on failure
    }
  };
  
  const getBadgeClass = (status) => {
    if (status === 'DETECTED' || status === 'FAILED') return 'badge-critical';
    if (status === 'DIAGNOSING' || status === 'FIX_SUGGESTED') return 'badge-warn';
    if (status === 'TESTING') return 'badge-neutral';
    return 'badge-success';
  };

  return (
    <div className="panel fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>
            {incident.serviceName}
          </h2>
          <span className={`badge ${getBadgeClass(localStatus)}`}>
            STATE: {localStatus}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="text-muted text-sm">
            Detected: {new Date(incident.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <p className="text-sm text-muted" style={{ marginBottom: '8px' }}>RAW LOG INGESTION</p>
        <pre>{incident.rawLog}</pre>
      </div>

      {incident.aiAnalysis?.rootCauseSummary && (
        <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.05)', border: '1px solid var(--accent-blue-dim)', padding: '20px', borderRadius: '8px', marginBottom: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '15px', color: 'var(--accent-blue)' }}>✨ AI Root Cause Diagnosis</h3>
            <span className="badge badge-success">Confidence: {incident.aiAnalysis.confidenceScore}%</span>
          </div>
          <p style={{ lineHeight: '1.6' }}>{incident.aiAnalysis.rootCauseSummary}</p>
        </div>
      )}

      {incident.aiAnalysis?.suggestedPatch && (
         <div style={{ marginBottom: '20px' }}>
         <p className="text-sm text-muted" style={{ marginBottom: '8px' }}>AUTONOMOUS PATCH GENERATED</p>
         <pre style={{ border: '1px solid rgba(16, 185, 129, 0.3)' }}>{incident.aiAnalysis.suggestedPatch}</pre>
       </div>
      )}

      {/* Impact Section */}
      <div style={{ display: 'flex', gap: '24px', borderTop: '1px solid var(--border-subtle)', paddingTop: '20px', marginTop: '20px' }}>
        <div>
          <p className="text-sm text-muted">AFFECTED SHIPMENTS</p>
          <p style={{ fontSize: '24px', fontWeight: 'bold' }}>{incident.supplyChainImpact?.affectedShipments || 0}</p>
        </div>
        <div>
          <p className="text-sm text-muted">ESTIMATED DELAY</p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--status-warn)' }}>{incident.supplyChainImpact?.delayMinutes || 0} min</p>
        </div>
        <div>
          <p className="text-sm text-muted">FINANCIAL LOSS</p>
          <p style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--status-critical)' }}>${(incident.supplyChainImpact?.financialLossEstimate || 0).toLocaleString()}</p>
        </div>
        
        {isFixSuggested && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
            <button className="btn" onClick={handleApplyPatch}>🚀 Apply Patch & Verify</button>
          </div>
        )}
        {isTesting && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
            <button className="btn" disabled style={{ opacity: 0.7 }}>⚙️ Sandbox Testing...</button>
          </div>
        )}
        {isResolved && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
            <button className="btn" disabled style={{ backgroundColor: 'var(--status-success)' }}>✅ Deployed</button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
