import { useState, useEffect } from 'react';
import axios from 'axios';
import './dashboard.css';
import { collection, onSnapshot, query, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

const INCIDENT_META = {
  Fire:           { icon: '🔥', color: '#f85149' },
  Medical:        { icon: '🏥', color: '#3fb950' },
  Police:         { icon: '🚔', color: '#58a6ff' },
  Infrastructure: { icon: '⚙️', color: '#e3b341' },
};

const STATUS_CONFIG = {
  IDLE:        { color: '#3fb950', bg: 'rgba(63,185,80,0.08)',   border: 'rgba(63,185,80,0.25)',   label: 'Idle' },
  IN_PROGRESS: { color: '#58a6ff', bg: 'rgba(88,166,255,0.08)', border: 'rgba(88,166,255,0.25)', label: 'In Progress' },
  BUSY:        { color: '#e3b341', bg: 'rgba(227,179,65,0.08)', border: 'rgba(227,179,65,0.25)', label: 'Busy' },
  OFF_DUTY:    { color: '#8b949e', bg: 'rgba(139,148,158,0.08)', border: 'rgba(139,148,158,0.25)', label: 'Off Duty' },
};

const PRIORITY_CONFIG = {
  '1': { label: 'low', color: '#f85149', bg: 'rgba(248,81,73,0.1)',   border: 'rgba(248,81,73,0.3)' },
  '2': { label: 'Medium',   color: '#3fb950', bg: 'rgba(63,185,80,0.1)',  border: 'rgba(63,185,80,0.3)' },
  '3': { label: 'High',     color: '#e3b341', bg: 'rgba(227,179,65,0.1)', border: 'rgba(227,179,65,0.3)' },
};

const ALERT_STATUS_CONFIG = {
  SENT:        { color: '#a371f7', bg: 'rgba(163,113,247,0.1)', border: 'rgba(163,113,247,0.3)', label: 'Sent' },
  IN_PROGRESS: { color: '#58a6ff', bg: 'rgba(88,166,255,0.1)',  border: 'rgba(88,166,255,0.3)', label: 'In Progress' },
  BUSY:        { color: '#e3b341', bg: 'rgba(227,179,65,0.1)',  border: 'rgba(227,179,65,0.3)', label: 'Busy' },
  OFF_DUTY:    { color: '#8b949e', bg: 'rgba(139,148,158,0.1)', border: 'rgba(139,148,158,0.3)', label: 'Off Duty' },
  COMPLETED:   { color: '#3fb950', bg: 'rgba(63,185,80,0.1)',   border: 'rgba(63,185,80,0.3)',  label: 'Resolved' },
};

// ── Reusable sub-components ───────────────────────────────────────────────────

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

const SectionLabel = ({ children }) => (
  <div style={{
    color: '#8b949e',
    fontSize: '11px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.07em',
    marginBottom: '8px',
  }}>
    {children}
  </div>
);

const StatusBadge = ({ status }) => {
  const cfg = ALERT_STATUS_CONFIG[status] || ALERT_STATUS_CONFIG.SENT;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      padding: '3px 10px',
      borderRadius: '12px',
      fontSize: '11px',
      fontWeight: '600',
      letterSpacing: '0.04em',
      color: cfg.color,
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
    }}>
      {cfg.label.toUpperCase()}
    </span>
  );
};

// ── Main Dashboard ────────────────────────────────────────────────────────────

const Dashboard = () => {
  const [incidentType, setIncidentType] = useState('Fire');
  const [customType, setCustomType] = useState('');
  const [useCustomType, setUseCustomType] = useState(false);
  const [priority, setPriority] = useState('1');
  const [location, setLocation] = useState('');
  const [lastAlert, setLastAlert] = useState(null);
  const [history, setHistory] = useState([]);
  const [currentStatus, setCurrentStatus] = useState('IDLE');

  /*
   * ══════════════════════════════════════════════════════════════
   * HARDWARE MODE — FPGA STATUS POLLING
   * Uncomment this entire useEffect when the DE10-Lite FPGA is
   * connected via UART on COM4 and the Spring Boot backend is
   * running with jSerialComm 2.10.4 + Java 21 LTS.
   *
   * This polls the /api/alerts/status endpoint every 2 seconds
   * and maps the FPGA heartbeat bytes to dashboard status:
   *   0xAA → IN_PROGRESS (responder accepted via KEY[0])
   *   0xBB → BUSY        (responder busy via SW[1:0])
   *   0xCC → OFF_DUTY    (responder off duty via SW[1:0])
   *   0xDD → IDLE        (responder idle, back to standby)
   *
   * The Firestore listener below handles status when no FPGA
   * is connected — remove it or let both run when FPGA is live.
   * ══════════════════════════════════════════════════════════════
   *
   * useEffect(() => {
   *   const interval = setInterval(async () => {
   *     try {
   *       const { data: statusFromServer } = await axios.get(
   *         'https://medilink-production-f576.up.railway.app/api/alerts/status'
   *       );
   *       setCurrentStatus(statusFromServer);
   *
   *       if (statusFromServer === 'IN_PROGRESS') {
   *         setLastAlert(prev => prev ? { ...prev, status: 'IN_PROGRESS' } : prev);
   *         setHistory(prev => prev.map((item, i) =>
   *           i === 0 ? { ...item, status: 'IN_PROGRESS' } : item));
   *       } else if (statusFromServer === 'BUSY') {
   *         setLastAlert(prev => prev ? { ...prev, status: 'BUSY' } : prev);
   *         setHistory(prev => prev.map((item, i) =>
   *           i === 0 ? { ...item, status: 'BUSY' } : item));
   *       } else if (statusFromServer === 'OFF_DUTY') {
   *         setLastAlert(prev => prev ? { ...prev, status: 'OFF_DUTY' } : prev);
   *         setHistory(prev => prev.map((item, i) =>
   *           i === 0 ? { ...item, status: 'OFF_DUTY' } : item));
   *       } else if (statusFromServer === 'IDLE') {
   *         setLastAlert(prev =>
   *           prev && prev.status === 'IN_PROGRESS'
   *             ? { ...prev, status: 'COMPLETED' }
   *             : prev
   *         );
   *         setHistory(prev => prev.map((item, i) =>
   *           i === 0 && item.status === 'IN_PROGRESS'
   *             ? { ...item, status: 'COMPLETED' }
   *             : item
   *         ));
   *       }
   *     } catch (err) {
   *       console.error('FPGA status poll failed:', err);
   *     }
   *   }, 2000);
   *   return () => clearInterval(interval);
   * }, []);
   */

  // Listen to Firestore alerts in real time
  useEffect(() => {
    const q = query(collection(db, 'alerts'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const data = change.doc.data();
          const status = data.status;

          if (status === 'accepted') {
            setCurrentStatus('IN_PROGRESS');
            setLastAlert(prev => prev ? { ...prev, status: 'IN_PROGRESS' } : prev);
            setHistory(prev => prev.map((item, i) => i === 0 ? { ...item, status: 'IN_PROGRESS' } : item));
          }
          if (status === 'declined') {
            setCurrentStatus('BUSY');
            setLastAlert(prev => prev ? { ...prev, status: 'BUSY' } : prev);
            setHistory(prev => prev.map((item, i) => i === 0 ? { ...item, status: 'BUSY' } : item));
            setTimeout(() => {
              setCurrentStatus('IDLE');
            }, 3000);
          }
          if (status === 'resolved') {
            setCurrentStatus('IDLE');
            setLastAlert(prev => prev ? { ...prev, status: 'COMPLETED' } : prev);
            setHistory(prev => prev.map((item, i) => i === 0 ? { ...item, status: 'COMPLETED' } : item));
          }
        }
      });
    });
    return () => unsubscribe();
  }, []);

  // Listen to responder self-reported status in real time
  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'responder_status', 'current'),
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const status = docSnapshot.data().status;
          if (status === 'idle') setCurrentStatus('IDLE');
          if (status === 'busy') setCurrentStatus('BUSY');
          if (status === 'off_duty') setCurrentStatus('OFF_DUTY');
        }
      }
    );
    return () => unsubscribe();
  }, []);

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    if (currentStatus === 'BUSY' || currentStatus === 'OFF_DUTY') {
      alert(`Cannot send alert — responder is currently ${currentStatus.replace('_', ' ')}.`);
      return;
    }
    try {
      const { data } = await axios.post('https://medilink-production-f576.up.railway.app/api/alerts/create', {
        incidentType: useCustomType && customType.trim() ? customType.trim() : incidentType,
        priority: parseInt(priority),
        location: location || 'Location not specified',
      });
      const newAlert = {
        type: data.incident,
        priority,
        binary_code: data.systemCode,
        time: new Date().toLocaleTimeString(),
        status: 'SENT',
      };
      setLastAlert(newAlert);
      setHistory(prev => [newAlert, ...prev]);
      setLocation('');
      if (useCustomType) setCustomType('');
    } catch (err) {
      console.error('Alert creation failed:', err);
      alert('Backend connection failed!');
    }
  };

  const sc = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.IDLE;
  const blocked = currentStatus === 'BUSY' || currentStatus === 'OFF_DUTY';

  return (
    <div style={{ padding: '32px', minHeight: '100vh', background: '#0d1117' }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: '32px',
      }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#e6edf3', letterSpacing: '-0.02em' }}>
            Dispatcher Dashboard
          </h1>
          <p style={{ color: '#8b949e', fontSize: '13px', marginTop: '5px' }}>
            Emergency Alert Management · Real-time hardware sync
          </p>
        </div>

        {/* Live Status Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '9px 18px',
          borderRadius: '24px',
          background: sc.bg,
          border: `1px solid ${sc.border}`,
          color: sc.color,
          fontSize: '12px',
          fontWeight: '700',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          marginTop: '4px',
        }}>
          <span
            className={currentStatus !== 'IDLE' ? 'status-dot-active' : ''}
            style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: sc.color,
              flexShrink: 0,
            }}
          />
          Responder · {sc.label}
        </div>
      </div>

      {/* ── Main 2-col Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>

        {/* Alert Form */}
        <Card style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '22px', paddingBottom: '16px', borderBottom: '1px solid #21262d' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f85149', boxShadow: '0 0 8px rgba(248,81,73,0.5)' }} />
            <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#e6edf3' }}>Create Emergency Alert</h2>
          </div>

          <form onSubmit={handleCreateAlert} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

            {/* Incident Type */}
            <div>
              <SectionLabel>Incident Type</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {Object.entries(INCIDENT_META).map(([type, meta]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setIncidentType(type)}
                    className="priority-btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: `1px solid ${incidentType === type ? meta.color : '#30363d'}`,
                      background: incidentType === type ? `${meta.color}15` : '#0d1117',
                      color: incidentType === type ? meta.color : '#8b949e',
                      fontSize: '13px',
                      fontWeight: incidentType === type ? '600' : '400',
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ fontSize: '16px' }}>{meta.icon}</span>
                    {type}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setUseCustomType(!useCustomType)}
                  className="priority-btn"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${useCustomType ? '#a855f7' : '#30363d'}`,
                    background: useCustomType ? 'rgba(168,85,247,0.1)' : '#0d1117',
                    color: useCustomType ? '#a855f7' : '#8b949e',
                    fontSize: '13px',
                    fontWeight: useCustomType ? '600' : '400',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  ✏️ Custom Incident Type
                </button>
                {useCustomType && (
                  <input
                    type="text"
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    placeholder="e.g. Gas Leak, Flood, Explosion..."
                    style={{
                      marginTop: '8px',
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid #30363d',
                      background: '#0d1117',
                      color: '#e6edf3',
                      fontSize: '13px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                )}
              </div>
            </div>

            {/* Priority */}
            <div>
              <SectionLabel>Priority Level</SectionLabel>
              <div style={{ display: 'flex', gap: '8px' }}>
                {Object.entries(PRIORITY_CONFIG).map(([p, cfg]) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className="priority-btn"
                    style={{
                      flex: 1,
                      padding: '10px 6px',
                      borderRadius: '8px',
                      border: `1px solid ${priority === p ? cfg.color : '#30363d'}`,
                      background: priority === p ? cfg.bg : '#0d1117',
                      color: priority === p ? cfg.color : '#8b949e',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      letterSpacing: '0.02em',
                    }}
                  >
                    P{p} · {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <SectionLabel>Incident Location</SectionLabel>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Toronto General Hospital, 200 Elizabeth St"
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #30363d',
                  background: '#0d1117',
                  color: '#e6edf3',
                  fontSize: '13px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={blocked}
              className="submit-btn"
              style={{
                padding: '12px',
                borderRadius: '8px',
                border: 'none',
                background: blocked ? '#21262d' : '#f85149',
                color: blocked ? '#656d76' : 'white',
                fontSize: '13px',
                fontWeight: '700',
                cursor: blocked ? 'not-allowed' : 'pointer',
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                marginTop: '2px',
              }}
            >
              {blocked
                ? `Blocked — Responder ${currentStatus.replace('_', ' ')}`
                : 'Send Emergency Alert'
              }
            </button>
          </form>
        </Card>

        {/* Live Transmission */}
        <Card style={{ padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '22px', paddingBottom: '16px', borderBottom: '1px solid #21262d' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#58a6ff', boxShadow: '0 0 8px rgba(88,166,255,0.5)' }} />
            <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#e6edf3' }}>Live Transmission</h2>
          </div>

          {lastAlert ? (
            <div className="alert-card-enter" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Status banner */}
              {(() => {
                const asc = ALERT_STATUS_CONFIG[lastAlert.status] || ALERT_STATUS_CONFIG.SENT;
                return (
                  <div style={{
                    padding: '12px 14px',
                    borderRadius: '8px',
                    background: asc.bg,
                    border: `1px solid ${asc.border}`,
                    color: asc.color,
                    fontSize: '13px',
                    fontWeight: '600',
                  }}>
                    {lastAlert.status === 'IN_PROGRESS' && '🚨 Responder In-Route'}
                    {lastAlert.status === 'BUSY'        && '⚠️ Rejected — Responder Busy'}
                    {lastAlert.status === 'OFF_DUTY'    && '⚫ Rejected — Off Duty'}
                    {lastAlert.status === 'SENT'        && '✅ Transmission Successful'}
                    {lastAlert.status === 'COMPLETED'   && '✔ Incident Resolved'}
                  </div>
                );
              })()}

              {/* Detail rows */}
              {[
                { label: 'Type',     value: `${INCIDENT_META[lastAlert.type]?.icon || ''} ${lastAlert.type}` },
                { label: 'Priority', value: `P${lastAlert.priority} — ${PRIORITY_CONFIG[lastAlert.priority]?.label}`, color: PRIORITY_CONFIG[lastAlert.priority]?.color },
                { label: 'Time',     value: lastAlert.time },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#656d76', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    {row.label}
                  </span>
                  <span style={{ color: row.color || '#e6edf3', fontSize: '13px', fontWeight: '500' }}>
                    {row.value}
                  </span>
                </div>
              ))}

              {/* UART code */}
              <div>
                <SectionLabel>UART Signal</SectionLabel>
                <code style={{
                  display: 'block',
                  padding: '10px 14px',
                  background: '#0d1117',
                  border: '1px solid #30363d',
                  borderRadius: '8px',
                  color: '#79c0ff',
                  fontFamily: 'ui-monospace, Consolas, monospace',
                  fontSize: '13px',
                  letterSpacing: '0.12em',
                }}>
                  {lastAlert.binary_code}
                </code>
              </div>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '180px',
              gap: '10px',
              color: '#484f58',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="9"/>
                <path d="M12 8v4l3 3"/>
              </svg>
              <p style={{ fontSize: '13px', color: '#656d76' }}>Awaiting incoming incident…</p>
            </div>
          )}
        </Card>
      </div>

      {/* ── Dispatch History ── */}
      <Card>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '16px 24px',
          borderBottom: '1px solid #21262d',
        }}>
          <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#e6edf3' }}>Dispatch History</h2>
          {history.length > 0 && (
            <span style={{
              fontSize: '11px',
              fontWeight: '700',
              padding: '2px 8px',
              borderRadius: '10px',
              background: '#21262d',
              color: '#8b949e',
              letterSpacing: '0.03em',
            }}>
              {history.length}
            </span>
          )}
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Timestamp', 'Incident', 'Priority', 'Status'].map(col => (
                <th key={col} style={{
                  padding: '10px 24px',
                  textAlign: 'left',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#8b949e',
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  background: '#161b22',
                  borderBottom: '1px solid #21262d',
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#484f58', fontSize: '13px' }}>
                  No dispatches recorded yet
                </td>
              </tr>
            ) : (
              history.map((item, index) => (
                <tr
                  key={index}
                  className="history-row"
                  style={{ borderBottom: index < history.length - 1 ? '1px solid #21262d' : 'none' }}
                >
                  <td style={{ padding: '14px 24px', color: '#8b949e', fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>
                    {item.time}
                  </td>
                  <td style={{ padding: '14px 24px', fontSize: '13px', fontWeight: '500', color: '#e6edf3' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>{INCIDENT_META[item.type]?.icon || ''}</span>
                      {item.type}
                    </span>
                  </td>
                  <td style={{ padding: '14px 24px' }}>
                    {(() => {
                      const cfg = PRIORITY_CONFIG[item.priority];
                      return cfg ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '2px 9px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: '700',
                          color: cfg.color,
                          background: cfg.bg,
                          border: `1px solid ${cfg.border}`,
                          letterSpacing: '0.04em',
                        }}>
                          P{item.priority}
                        </span>
                      ) : item.priority;
                    })()}
                  </td>
                  <td style={{ padding: '14px 24px' }}>
                    <StatusBadge status={item.status} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default Dashboard;
