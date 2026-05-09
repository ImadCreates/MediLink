import { Link, useLocation } from 'react-router-dom';
import '../pages/dashboard.css';

const NAV_ITEMS = [
  {
    path: '/',
    label: 'Dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    path: '/monitor',
    label: 'System Monitor',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
];

const Layout = ({ children }) => {
  const location = useLocation();

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%' }}>
      {/* Sidebar */}
      <nav style={{
        width: '224px',
        background: '#010409',
        borderRight: '1px solid #21262d',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
      }}>
        {/* Brand */}
        <div style={{
          padding: '20px 16px',
          borderBottom: '1px solid #21262d',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}>
          <div style={{
            width: '34px',
            height: '34px',
            background: 'linear-gradient(135deg, #f85149 0%, #ff9a9a 100%)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            boxShadow: '0 2px 8px rgba(248,81,73,0.35)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
              <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2zm1 14h-2v-2h2v2zm0-4h-2V7h2v5z" opacity="0"/>
              <path d="M11 7h2v6h-2zm0 8h2v2h-2z" fill="white"/>
              <rect x="11" y="5" width="2" height="6" fill="white"/>
              <rect x="8" y="11" width="8" height="2" fill="white"/>
            </svg>
          </div>
          <div>
            <div style={{ color: '#e6edf3', fontWeight: '700', fontSize: '15px', lineHeight: '1.2', letterSpacing: '-0.01em' }}>
              MediLink
            </div>
            <div style={{ color: '#8b949e', fontSize: '11px', marginTop: '1px', letterSpacing: '0.02em' }}>
              Dispatch System
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div style={{ padding: '12px 8px', flex: 1 }}>
          <div style={{ color: '#656d76', fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 10px 8px' }}>
            Navigation
          </div>
          {NAV_ITEMS.map(item => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="nav-link"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  color: isActive ? '#e6edf3' : '#8b949e',
                  fontSize: '13px',
                  fontWeight: isActive ? '500' : '400',
                  background: isActive ? '#21262d' : 'transparent',
                  marginBottom: '2px',
                  borderLeft: isActive ? '2px solid #f85149' : '2px solid transparent',
                }}
              >
                <span style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 16px',
          borderTop: '1px solid #21262d',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#3fb950',
            flexShrink: 0,
            boxShadow: '0 0 6px #3fb950',
          }} />
          <span style={{ color: '#656d76', fontSize: '11px' }}>
            Serial Active · v1.0
          </span>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ flex: 1, overflowY: 'auto', background: '#0d1117' }}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
