import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import SystemMonitor from './pages/SystemMonitor';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/monitor" element={<SystemMonitor />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;