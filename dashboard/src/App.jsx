import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import LandingHome from './pages/LandingHome';
import Login from './pages/Login';
import ResponderPage from './pages/ResponderPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingHome />} />
        <Route path="/dispatcher" element={<Login />} />
        <Route path="/responder" element={<ResponderPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
