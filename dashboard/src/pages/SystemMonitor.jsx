import { useState, useEffect } from 'react';
import axios from 'axios';
import './dashboard.css';

const Card = ({ children, style = {} }) => (
  <div className="card" style={{
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '12px',
    ...style,
  }}>
    {children}
  </div>
);

const CardHeader = ({ title, dot }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '16px 24px',
    borderBottom: '1px solid #21262d',
  }}>
    <div style={{
      width: '8px', height: '8px', borderRadius: '50%',
      background: dot, boxShadow: `0 0 8px ${dot}`,
    }} />
    <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#e6edf3' }}>{title}</h2>
  </div>
);

const DetailRow = ({ label, value, valueColor }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '11px 0',
    borderBottom: '1px solid #21262d',
  }}>
    <span style={{ color: '#8b949e', fontSize: '13px' }}>{label}</span>
    <span style={{ color: valueColor || '#e6edf3', fontSize: '13px', fontWeight: '500', fontFamily: 'ui-monospace, Consolas, monospace' }}>
      {value}
    </span>
  </div>
);

const SystemMonitor = () => {
  const [portInfo, setPortInfo] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStatus = async () => {
    try {
      const { data } = await axios.get('http://localhost:8080/api/serial/status');
      setPortInfo(data);
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      setPortInfo(null);
      console.error('Serial status fetch failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const isOpen = portInfo?.isOpen === true;

  return (
    <div style={{ padding: '32px', minHeight: '100vh', background: '#0d1117' }}>

      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#e6edf3', letterSpacing: '-0.02em' }}>
          System Monitor
        </h1>
        <p style={{ color: '#8b949e', fontSize: '13px', marginTop: '5px' }}>
          Serial hardware status · refreshes every 3 s
          {lastChecked && (
            <span style={{ marginLeft: '12px', color: '#484f58' }}>Last checked: {lastChecked}</span>
          )}
        </p>
      </div>

      {loading ? (
        <div style={{ color: '#656d76', fontSize: '13px', padding: '40px 0' }}>Connecting to backend…</div>
      ) : portInfo === null ? (
        <Card style={{ padding: '32px', textAlign: 'center' }}>
          <p style={{ color: '#f85149', fontSize: '14px', fontWeight: '600' }}>⚠️ Could not reach backend</p>
          <p style={{ color: '#8b949e', fontSize: '13px', marginTop: '8px' }}>Make sure the Spring Boot server is running on port 8080.</p>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Connection Status Banner */}
          <Card style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
            <div style={{
              width: '56px', height: '56px', borderRadius: '14px', flexShrink: 0,
              background: isOpen ? 'rgba(63,185,80,0.12)' : 'rgba(248,81,73,0.12)',
              border: `1px solid ${isOpen ? 'rgba(63,185,80,0.3)' : 'rgba(248,81,73,0.3)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px',
            }}>
              {isOpen ? '🔌' : '⚡'}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '16px', fontWeight: '700', color: isOpen ? '#3fb950' : '#f85149', marginBottom: '4px' }}>
                {isOpen ? 'Port Open' : 'Port Closed'}
              </div>
              <div style={{ fontSize: '13px', color: '#8b949e' }}>
                {isOpen
                  ? `FTDI bridge active on ${portInfo.portName} — ready to transmit`
                  : portInfo.error || `${portInfo.portName} could not be opened — check cable and driver`
                }
              </div>
            </div>
            <span style={{
              padding: '5px 14px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: '700',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: isOpen ? '#3fb950' : '#f85149',
              background: isOpen ? 'rgba(63,185,80,0.1)' : 'rgba(248,81,73,0.1)',
              border: `1px solid ${isOpen ? 'rgba(63,185,80,0.3)' : 'rgba(248,81,73,0.3)'}`,
            }}>
              {isOpen ? 'Connected' : 'Disconnected'}
            </span>
          </Card>

          {/* Port Configuration */}
          <Card>
            <CardHeader title="Port Configuration" dot="#58a6ff" />
            <div style={{ padding: '0 24px' }}>
              <DetailRow label="Port"      value={portInfo.portName} />
              <DetailRow label="Baud Rate" value={`${portInfo.baudRate} bps`} />
              <DetailRow label="Data Bits" value={`${portInfo.dataBits}-bit`} />
              <DetailRow label="Stop Bits" value={`${portInfo.stopBits}`} />
              <DetailRow label="Parity"    value={portInfo.parity} />
              <DetailRow
                label="Status"
                value={isOpen ? 'OPEN' : 'CLOSED'}
                valueColor={isOpen ? '#3fb950' : '#f85149'}
              />
            </div>
          </Card>

          {/* UART Protocol Reference */}
          <Card>
            <CardHeader title="UART Signal Map" dot="#a371f7" />
            <div style={{ padding: '0 24px' }}>
              {[
                { byte: '0xAA', direction: 'RX ← FPGA', meaning: 'Alert Accepted — Responder In-Route', color: '#58a6ff' },
                { byte: '0xBB', direction: 'RX ← FPGA', meaning: 'Responder Busy — Alert Rejected',     color: '#e3b341' },
                { byte: '0xCC', direction: 'RX ← FPGA', meaning: 'Responder Off-Duty — Rejected',       color: '#8b949e' },
                { byte: '0xDD', direction: 'RX ← FPGA', meaning: 'Idle — Incident Resolved',            color: '#3fb950' },
                { byte: '0x0A–0x2B', direction: 'TX → FPGA', meaning: 'Encoded incident type + priority', color: '#a371f7' },
              ].map(row => (
                <div key={row.byte} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '11px 0',
                  borderBottom: '1px solid #21262d',
                }}>
                  <code style={{
                    padding: '3px 8px',
                    borderRadius: '5px',
                    background: '#0d1117',
                    border: '1px solid #30363d',
                    color: row.color,
                    fontSize: '12px',
                    fontFamily: 'ui-monospace, Consolas, monospace',
                    letterSpacing: '0.06em',
                    flexShrink: 0,
                    minWidth: '80px',
                    textAlign: 'center',
                  }}>
                    {row.byte}
                  </code>
                  <span style={{ color: '#656d76', fontSize: '11px', flexShrink: 0, width: '90px' }}>{row.direction}</span>
                  <span style={{ color: '#8b949e', fontSize: '13px' }}>{row.meaning}</span>
                </div>
              ))}
            </div>
          </Card>

        </div>
      )}
    </div>
  );
};

export default SystemMonitor;
