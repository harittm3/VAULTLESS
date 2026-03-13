// ============================================================
// FILE: src/pages/Ghost.jsx
// ============================================================
// Ghost session — looks identical to /dashboard.
// The /ghost URL loads an identical-looking inbox.
// No visual difference whatsoever to the attacker.
import Dashboard from './Dashboard.jsx'

export default function Ghost() {
  return <Dashboard isGhost={true} />
}
