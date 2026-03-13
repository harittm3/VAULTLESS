import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { VaultlessProvider } from './lib/VaultlessContext';
import Landing from './pages/Landing';
import Gmail from './pages/Gmail';
import Enroll from './pages/Enroll';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Ghost from './pages/Ghost';
import ParticleBackground from './components/ParticleBackground.jsx'
import { useState } from "react";
import HexLoader from "./components/HexLoader";

export default function App() {

  const [loading, setLoading] = useState(true);

  return (
    <VaultlessProvider>
      <BrowserRouter>
        <ParticleBackground />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/gmail" element={<Gmail />} />
          <Route path="/enroll" element={<Enroll />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/ghost" element={<Ghost />} />
        </Routes>

        {/* LOADER OVERLAY */}
        {loading && (
          <HexLoader onFinish={() => setLoading(false)} />
        )}

      </BrowserRouter>
    </VaultlessProvider>
  );
}