import { BrowserRouter, Routes, Route } from "react-router-dom";
import { VaultlessProvider } from "./lib/VaultlessContext";

import Landing from "./pages/Landing";
import Gmail from "./pages/Gmail";
import Enroll from "./pages/Enroll";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Ghost from "./pages/Ghost";

import { useState } from "react";
import HexLoader from "./components/HexLoader";

export default function App() {

  const [loading, setLoading] = useState(true);

  if (loading) {
    return <HexLoader onFinish={() => setLoading(false)} />;
  }

  return (
    <VaultlessProvider>
      <BrowserRouter>

        <Routes>

          <Route path="/" element={<Landing />} />
          <Route path="/gmail" element={<Gmail />} />
          <Route path="/enroll" element={<Enroll />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/ghost" element={<Ghost />} />

        </Routes>

      </BrowserRouter>
    </VaultlessProvider>
  );
}