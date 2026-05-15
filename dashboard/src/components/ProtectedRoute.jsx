import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';

const ProtectedRoute = ({ children }) => {
  const [checking, setChecking] = useState(true);
  const [authed, setAuthed] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthed(true);
      } else {
        navigate('/dispatcher', { replace: true });
      }
      setChecking(false);
    });
    return () => unsub();
  }, [navigate]);

  if (checking) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0d0820',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          border: '2px solid rgba(255,255,255,0.1)',
          borderTop: '2px solid #22d3ee',
          animation: 'ringRotate 0.8s linear infinite',
        }} />
      </div>
    );
  }

  if (!authed) return null;
  return children;
};

export default ProtectedRoute;
