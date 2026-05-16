import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './dashboard.css';
import { collection, onSnapshot, query, addDoc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getAuth, signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// ── Fix Leaflet default icon missing-image issue ──────────────────────────────
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Custom div icons ──────────────────────────────────────────────────────────
const makeResponderIcon = (isNearest) =>
  L.divIcon({
    className: '',
    html: `<div style="
      width:14px;height:14px;border-radius:50%;
      background:${isNearest ? '#3fb950' : '#58a6ff'};
      border:2px solid ${isNearest ? '#26a641' : '#388bfd'};
      box-shadow:0 0 8px ${isNearest ? 'rgba(63,185,80,0.7)' : 'rgba(88,166,255,0.5)'};
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

const incidentIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:16px;height:16px;border-radius:50%;
    background:#f85149;
    border:2px solid #da3633;
    box-shadow:0 0 12px rgba(248,81,73,0.8);
  "></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// ── Haversine distance (km) ───────────────────────────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Nominatim geocode ─────────────────────────────────────────────────────────
async function geocode(address) {
  if (!address || address.trim() === '') return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();
    if (data.length > 0) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (_) {}
  return null;
}

// ── RecenterMap — re-fits bounds when markers change ─────────────────────────
function RecenterMap({ incidentCoords, responders }) {
  const map = useMap();
  useEffect(() => {
    const points = [];
    if (incidentCoords) points.push([incidentCoords.lat, incidentCoords.lng]);
    responders.forEach((r) => points.push([r.lat, r.lng]));
    if (points.length === 1) {
      map.setView(points[0], 13);
    } else if (points.length > 1) {
      map.fitBounds(points, { padding: [40, 40] });
    }
  }, [incidentCoords, responders, map]);
  return null;
}

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
  '1': { label: 'Low',    color: '#f85149', bg: 'rgba(248,81,73,0.1)',   border: 'rgba(248,81,73,0.3)' },
  '2': { label: 'Medium', color: '#3fb950', bg: 'rgba(63,185,80,0.1)',  border: 'rgba(63,185,80,0.3)' },
  '3': { label: 'High',   color: '#e3b341', bg: 'rgba(227,179,65,0.1)', border: 'rgba(227,179,65,0.3)' },
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
  const navigate = useNavigate();

  const [incidentType, setIncidentType]   = useState('Fire');
  const [customType, setCustomType]       = useState('');
  const [useCustomType, setUseCustomType] = useState(false);
  const [priority, setPriority]           = useState('1');
  const [locationInput, setLocationInput] = useState('');
  const [lastAlert, setLastAlert]         = useState(null);
  const [history, setHistory]             = useState([]);
  const [currentStatus, setCurrentStatus] = useState('IDLE');

  // Map state
  const [responders, setResponders]           = useState([]);
  const [incidentCoords, setIncidentCoords]   = useState(null);
  const [nearestResponderId, setNearestResponderId] = useState(null);

  // ── Dispatch modal state ────────────────────────────────────────────────────
  const [showDispatchModal, setShowDispatchModal]     = useState(false);
  const [pendingAlert, setPendingAlert]               = useState(null);
  const [selectedResponderId, setSelectedResponderId] = useState(null);

  // ── Logout ──────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    try {
      await signOut(getAuth());
      navigate('/dispatcher');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

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

  // ── Firestore: persistent dispatch history ─────────────────────────────────
  useEffect(() => {
    const q = query(
      collection(db, 'alerts'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loaded = snapshot.docs.map(d => ({
        type:     d.data().type || d.data().incidentType,
        priority: String(d.data().priority),
        location: d.data().location,
        time:     d.data().createdAt?.toDate().toLocaleTimeString() || 'N/A',
        status:   d.data().status === 'resolved' ? 'COMPLETED'
                : d.data().status === 'accepted'  ? 'IN_PROGRESS'
                : d.data().status === 'declined'  ? 'BUSY'
                : 'SENT',
      }));
      setHistory(loaded);
    });
    return () => unsubscribe();
  }, []);

  // ── Firestore: alert status changes ────────────────────────────────────────
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
            setTimeout(() => setCurrentStatus('IDLE'), 3000);
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

  // ── Firestore: live responder locations ────────────────────────────────────
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'responders'), (snapshot) => {
      const list = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((r) => r.lat != null && r.lng != null)
        .filter((r) => r.status === 'idle');
      setResponders(list);
    });
    return () => unsubscribe();
  }, []);

  // ── Recompute nearest responder whenever responders or incident changes ─────
  useEffect(() => {
    if (!incidentCoords || responders.length === 0) {
      setNearestResponderId(null);
      return;
    }
    let nearest = null, bestDist = Infinity;
    responders.forEach((r) => {
      const d = haversine(incidentCoords.lat, incidentCoords.lng, r.lat, r.lng);
      if (d < bestDist) { bestDist = d; nearest = r.id; }
    });
    setNearestResponderId(nearest);
  }, [incidentCoords, responders]);

  // ── Step 1: geocode + rank responders → open modal ─────────────────────────
  const handleCreateAlert = async (e) => {
    e.preventDefault();
    if (currentStatus === 'BUSY' || currentStatus === 'OFF_DUTY') {
      alert(`Cannot send alert — responder is currently ${currentStatus.replace('_', ' ')}.`);
      return;
    }

    const resolvedType = useCustomType && customType.trim() ? customType.trim() : incidentType;

    // Geocode the incident location
    const coords = await geocode(locationInput);
    if (coords) setIncidentCoords(coords);

    // Rank all available responders by distance to incident
    const ranked = responders
      .map(r => ({
        ...r,
        dist: coords ? haversine(coords.lat, coords.lng, r.lat, r.lng) : Infinity,
      }))
      .sort((a, b) => a.dist - b.dist);

    // Store pending alert details and open modal
    setPendingAlert({
      type:     resolvedType,
      priority,
      location: locationInput || 'Location not specified',
      coords,
      ranked,
    });
    setSelectedResponderId(ranked[0]?.id ?? null);
    setShowDispatchModal(true);
  };

  // ── Step 2: confirmed dispatch → axios + Firestore write ───────────────────
  const handleConfirmDispatch = async () => {
    if (!pendingAlert || !selectedResponderId) return;
    try {
      const { data } = await axios.post(
        'https://medilink-production-f576.up.railway.app/api/alerts/create',
        {
          incidentType: pendingAlert.type,
          priority:     parseInt(pendingAlert.priority),
          location:     pendingAlert.location,
          assignedTo:   selectedResponderId,
        }
      );

      await addDoc(collection(db, 'alerts'), {
        type:         pendingAlert.type,
        incidentType: pendingAlert.type,
        priority:     parseInt(pendingAlert.priority),
        location:     pendingAlert.location,
        status:       'sent',
        assignedTo:   selectedResponderId,
        createdAt:    serverTimestamp(),
      });

      const newAlert = {
        type:        data.incident,
        priority:    pendingAlert.priority,
        binary_code: data.systemCode,
        time:        new Date().toLocaleTimeString(),
        location:    pendingAlert.location,
        status:      'SENT',
      };
      setLastAlert(newAlert);
      setHistory(prev => [newAlert, ...prev]);

      // Close modal and reset
      setShowDispatchModal(false);
      setPendingAlert(null);
      setSelectedResponderId(null);
      setLocationInput('');
      if (useCustomType) setCustomType('');
    } catch (err) {
      console.error('Alert creation failed:', err);
      alert('Backend connection failed!');
    }
  };

  const sc      = STATUS_CONFIG[currentStatus] || STATUS_CONFIG.IDLE;
  const blocked = currentStatus === 'BUSY' || currentStatus === 'OFF_DUTY';
  const nearestResponder = responders.find((r) => r.id === nearestResponderId);

  // Default map center: Toronto
  const defaultCenter = [43.6532, -79.3832];

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

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}>
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
          }}>
            <span
              className={currentStatus !== 'IDLE' ? 'status-dot-active' : ''}
              style={{
                width: '7px', height: '7px', borderRadius: '50%',
                background: sc.color, flexShrink: 0,
              }}
            />
            Responder · {sc.label}
          </div>

          {/* Sign Out button */}
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              letterSpacing: '0.02em',
              fontFamily: 'inherit',
            }}
          >
            Sign Out
          </button>
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
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '10px 12px', borderRadius: '8px',
                      border: `1px solid ${incidentType === type ? meta.color : '#30363d'}`,
                      background: incidentType === type ? `${meta.color}15` : '#0d1117',
                      color: incidentType === type ? meta.color : '#8b949e',
                      fontSize: '13px', fontWeight: incidentType === type ? '600' : '400',
                      cursor: 'pointer', textAlign: 'left',
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
                    width: '100%', padding: '10px 12px', borderRadius: '8px',
                    border: `1px solid ${useCustomType ? '#a855f7' : '#30363d'}`,
                    background: useCustomType ? 'rgba(168,85,247,0.1)' : '#0d1117',
                    color: useCustomType ? '#a855f7' : '#8b949e',
                    fontSize: '13px', fontWeight: useCustomType ? '600' : '400',
                    cursor: 'pointer', textAlign: 'left',
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
                      marginTop: '8px', width: '100%', padding: '10px 12px',
                      borderRadius: '8px', border: '1px solid #30363d',
                      background: '#0d1117', color: '#e6edf3', fontSize: '13px',
                      outline: 'none', boxSizing: 'border-box',
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
                      flex: 1, padding: '10px 6px', borderRadius: '8px',
                      border: `1px solid ${priority === p ? cfg.color : '#30363d'}`,
                      background: priority === p ? cfg.bg : '#0d1117',
                      color: priority === p ? cfg.color : '#8b949e',
                      fontSize: '12px', fontWeight: '600', cursor: 'pointer',
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
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder="e.g. Toronto General Hospital, 200 Elizabeth St"
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '8px',
                  border: '1px solid #30363d', background: '#0d1117',
                  color: '#e6edf3', fontSize: '13px', outline: 'none',
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
                padding: '12px', borderRadius: '8px', border: 'none',
                background: blocked ? '#21262d' : '#f85149',
                color: blocked ? '#656d76' : 'white',
                fontSize: '13px', fontWeight: '700',
                cursor: blocked ? 'not-allowed' : 'pointer',
                letterSpacing: '0.05em', textTransform: 'uppercase', marginTop: '2px',
              }}
            >
              {blocked
                ? `Blocked — Responder ${currentStatus.replace('_', ' ')}`
                : 'Review & Dispatch →'
              }
            </button>
          </form>
        </Card>

        {/* ── Live Responder Map ── */}
        <Card style={{ padding: '0', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Card header */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '16px 20px', borderBottom: '1px solid #21262d', flexShrink: 0,
          }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3fb950', boxShadow: '0 0 8px rgba(63,185,80,0.5)' }} />
            <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#e6edf3' }}>Live Responder Map</h2>
            <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#8b949e' }}>
              {responders.length} available
            </span>
          </div>

          {/* Map container */}
          <div style={{ flex: 1, minHeight: '320px', position: 'relative' }}>
            <MapContainer
              center={defaultCenter}
              zoom={11}
              style={{ width: '100%', height: '100%', minHeight: '320px' }}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />

              <RecenterMap incidentCoords={incidentCoords} responders={responders} />

              {/* Incident marker */}
              {incidentCoords && (
                <Marker position={[incidentCoords.lat, incidentCoords.lng]} icon={incidentIcon}>
                  <Popup>
                    <span style={{ fontWeight: 600 }}>Incident Location</span>
                    {lastAlert && <><br />{lastAlert.type} · P{lastAlert.priority}</>}
                  </Popup>
                </Marker>
              )}

              {/* Responder markers */}
              {responders.map((r) => (
                <Marker
                  key={r.id}
                  position={[r.lat, r.lng]}
                  icon={makeResponderIcon(r.id === nearestResponderId)}
                >
                  <Popup>
                    <span style={{ fontWeight: 600 }}>{r.displayName || 'Responder'}</span>
                    <br />
                    <span style={{ color: r.id === nearestResponderId ? '#3fb950' : '#888' }}>
                      {r.id === nearestResponderId ? '⭐ Nearest' : r.status || 'idle'}
                    </span>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          {/* Footer: nearest responder */}
          <div style={{
            padding: '10px 20px', borderTop: '1px solid #21262d',
            background: '#161b22', flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            {nearestResponder ? (
              <>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3fb950', flexShrink: 0, boxShadow: '0 0 6px rgba(63,185,80,0.6)' }} />
                <span style={{ fontSize: '12px', color: '#8b949e' }}>Nearest:</span>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#3fb950' }}>
                  {nearestResponder.displayName || nearestResponder.id}
                </span>
              </>
            ) : (
              <span style={{ fontSize: '12px', color: '#484f58' }}>
                {responders.length === 0 ? 'No responders available' : 'Create an alert to find nearest responder'}
              </span>
            )}
          </div>
        </Card>
      </div>

      {/* ── Dispatch Modal ── */}
      {showDispatchModal && pendingAlert && (
        <div style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '16px',
            width: '100%', maxWidth: '520px',
            padding: '28px',
            maxHeight: '80vh',
            overflowY: 'auto',
          }}>
            {/* Modal header */}
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#e6edf3', marginBottom: '4px' }}>
                Confirm Dispatch
              </h2>
              <p style={{ fontSize: '13px', color: '#8b949e' }}>
                Select a responder to assign this alert to, then confirm.
              </p>
            </div>

            {/* Alert summary */}
            <div style={{
              background: '#0d1117',
              border: '1px solid #30363d',
              borderRadius: '10px',
              padding: '14px 16px',
              marginBottom: '20px',
              display: 'flex', flexDirection: 'column', gap: '6px',
            }}>
              <div style={{ fontSize: '13px', color: '#e6edf3', fontWeight: '600' }}>
                {INCIDENT_META[pendingAlert.type]?.icon || '🚨'} {pendingAlert.type}
              </div>
              <div style={{ fontSize: '12px', color: '#8b949e' }}>
                📍 {pendingAlert.location} &nbsp;·&nbsp; P{pendingAlert.priority}
              </div>
            </div>

            {/* Responder list */}
            <div style={{ marginBottom: '20px' }}>
              <SectionLabel>Available Responders — sorted by distance</SectionLabel>
              {pendingAlert.ranked.length === 0 ? (
                <div style={{ fontSize: '13px', color: '#484f58', padding: '16px 0' }}>
                  No responders currently available.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {pendingAlert.ranked.map((r, i) => {
                    const isSelected = selectedResponderId === r.id;
                    const isNearest  = i === 0;
                    return (
                      <div
                        key={r.id}
                        onClick={() => setSelectedResponderId(r.id)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '12px 14px', borderRadius: '10px',
                          border: `1px solid ${isSelected ? '#3fb950' : '#30363d'}`,
                          background: isSelected ? 'rgba(63,185,80,0.08)' : '#0d1117',
                          cursor: 'pointer',
                          transition: 'border-color 0.15s, background 0.15s',
                        }}
                      >
                        {/* Status dot */}
                        <span style={{
                          width: '10px', height: '10px', borderRadius: '50%', flexShrink: 0,
                          background: isNearest ? '#3fb950' : '#58a6ff',
                          boxShadow: `0 0 6px ${isNearest ? 'rgba(63,185,80,0.6)' : 'rgba(88,166,255,0.4)'}`,
                        }} />

                        {/* Name */}
                        <span style={{ flex: 1, fontSize: '13px', fontWeight: '500', color: '#e6edf3' }}>
                          {r.displayName || r.id}
                        </span>

                        {/* NEAREST badge */}
                        {isNearest && (
                          <span style={{
                            fontSize: '10px', fontWeight: '700', padding: '2px 8px',
                            borderRadius: '8px',
                            background: 'rgba(63,185,80,0.15)', color: '#3fb950',
                            border: '1px solid rgba(63,185,80,0.3)',
                            letterSpacing: '0.05em', flexShrink: 0,
                          }}>
                            NEAREST
                          </span>
                        )}

                        {/* Distance */}
                        <span style={{ fontSize: '12px', color: '#8b949e', flexShrink: 0 }}>
                          {r.dist === Infinity ? '—' : `${r.dist.toFixed(1)} km`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => {
                  setShowDispatchModal(false);
                  setPendingAlert(null);
                  setSelectedResponderId(null);
                }}
                style={{
                  flex: 1, padding: '12px', borderRadius: '8px',
                  border: '1px solid #30363d', background: 'transparent',
                  color: '#8b949e', fontSize: '13px', fontWeight: '600',
                  cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDispatch}
                disabled={!selectedResponderId}
                style={{
                  flex: 1, padding: '12px', borderRadius: '8px', border: 'none',
                  background: selectedResponderId ? '#f85149' : '#21262d',
                  color: selectedResponderId ? '#ffffff' : '#656d76',
                  fontSize: '13px', fontWeight: '700',
                  cursor: selectedResponderId ? 'pointer' : 'not-allowed',
                  letterSpacing: '0.05em', textTransform: 'uppercase',
                  fontFamily: 'inherit',
                }}
              >
                Send Alert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dispatch History ── */}
      <Card>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '16px 24px', borderBottom: '1px solid #21262d',
        }}>
          <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#e6edf3' }}>Dispatch History</h2>
          {history.length > 0 && (
            <span style={{
              fontSize: '11px', fontWeight: '700', padding: '2px 8px',
              borderRadius: '10px', background: '#21262d', color: '#8b949e', letterSpacing: '0.03em',
            }}>
              {history.length}
            </span>
          )}
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Timestamp', 'Incident', 'Location', 'Priority', 'Status'].map(col => (
                <th key={col} style={{
                  padding: '10px 24px', textAlign: 'left', fontSize: '11px',
                  fontWeight: '600', color: '#8b949e', textTransform: 'uppercase',
                  letterSpacing: '0.07em', background: '#161b22', borderBottom: '1px solid #21262d',
                }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: '#484f58', fontSize: '13px' }}>
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
                  <td style={{ padding: '14px 24px', fontSize: '13px', color: '#8b949e', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.location || '—'}
                  </td>
                  <td style={{ padding: '14px 24px' }}>
                    {(() => {
                      const cfg = PRIORITY_CONFIG[item.priority];
                      return cfg ? (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center',
                          padding: '2px 9px', borderRadius: '10px',
                          fontSize: '11px', fontWeight: '700',
                          color: cfg.color, background: cfg.bg,
                          border: `1px solid ${cfg.border}`, letterSpacing: '0.04em',
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
