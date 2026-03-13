# ⬡ VAULTLESS

Behavioural authentication prototype for desktop and touch devices that uses multiple behavioural signals, including typing rhythm, mouse dynamics, touch interaction, device motion, and stress indicators, as a password substitute, with authentication events anchored to an Ethereum Sepolia smart contract.

## Why We Are Building This

Digital security still depends too heavily on secrets that can be stolen, guessed, phished, leaked, or coerced out of people. Passwords, OTPs, and even many forms of 2FA often fail at the exact moment a person is under pressure.

VAULTLESS is being built to explore a safer model: authentication based on how a person naturally behaves, not just what they know. Instead of trusting a static secret, the system looks at behavioural patterns such as typing rhythm, mouse movement, touch behaviour on mobile devices, and motion signals from supported phones, then uses that signal to make authentication harder to fake and easier to adapt under real-world conditions.

This matters socially because account compromise is not just a technical inconvenience. It affects:

- students and workers whose email and identity can be hijacked
- families who lose savings to phishing and fraud
- journalists, activists, and vulnerable users facing coercion
- teams that need better signals than passwords alone

The duress flow is especially important to that vision. In a coercive situation, the goal is not only to block access, but to protect the user without obviously alerting the attacker. That makes VAULTLESS a prototype for more humane security, where systems respond to risk with discretion rather than just denial.

## Social Impact

VAULTLESS is designed as a prototype for security that could help society in practical ways:

- reduce dependence on stolen or reused passwords
- make phishing less effective by adding behaviour-based verification
- create safer fallback behaviour during coercion scenarios
- provide transparent event logging for high-trust systems
- encourage security design that protects people, not just accounts

## What It Does

VAULTLESS replaces static credentials with a behavioural profile built from:

- Keystroke timing
- Mouse movement patterns
- Touch movement and touch pressure on supported devices
- Device motion signals such as gyroscope and accelerometer activity
- Stress and rhythm variance signals

This makes VAULTLESS a multi-platform authentication system that can adapt to both desktop and mobile usage instead of relying on a single input signal.

The app guides a user through enrollment, compares live behaviour during authentication, and then routes the session into one of three outcomes:

- `authenticated`: normal session access
- `rejected`: failed verification
- `duress`: suspicious but plausible login, redirected into a ghost session while logging the event

## Core Flow

1. Open the landing page and choose demo or live mode.
2. Enroll by typing `Secure my account` three times.
3. The client averages those samples into a behavioural vector.
4. A commitment hash is registered on the Sepolia contract.
5. During authentication, a fresh behavioural sample is compared against the enrolled baseline using weighted similarity checks across the available signals.
6. The app logs `AuthSuccess`, `AuthFailed`, or `DuressActivated`.

On touch-capable devices, enrollment and authentication can also capture touch gestures, touch pressure, and optional motion/sensor data where the browser, device, and permissions allow it.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing page with demo toggle and product framing |
| `/gmail` | Gmail-style entry page |
| `/enroll` | 3-sample behavioural enrollment flow |
| `/auth` | Live authentication and scoring UI |
| `/dashboard` | Authenticated session with chain event panel |
| `/ghost` | Decoy session shown during duress |

Unknown routes redirect back to `/`.

## Tech Stack

- React 18
- Vite 5
- React Router
- Ethers v6
- Recharts
- Tailwind/PostCSS tooling
- Solidity 0.8.20
- EmailJS for duress alerts
- Touch and motion-aware mobile interaction capture
- Browser device sensor APIs where available

## Project Structure

```text
src/
  components/              UI helpers and animated visuals
  contracts/
    VaultlessCore.sol      Sepolia contract
  hooks/
    behaviouralEngine.js   Keystroke/mouse capture and scoring logic
  lib/
    ethereum.js            Wallet + contract helpers
    VaultlessContext.jsx   Global app state and persistence
    duressAlert.js         EmailJS alert integration
  pages/
    Landing.jsx
    Gmail.jsx
    Enroll.jsx
    Auth.jsx
    Dashboard.jsx
    Ghost.jsx
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- MetaMask if you want live Sepolia transactions

### Install

```bash
npm install
```

### Run Locally

```bash
npm run dev
```

Default Vite dev URL:

```text
http://localhost:5173
```

### Production Build

```bash
npm run build
npm run preview
```

## Environment Variables

Create a `.env` file in the project root as needed.

```env
VITE_DEMO_MODE=true
VITE_CONTRACT_ADDRESS=0x0000000000000000000000000000000000000000
VITE_EMAILJS_SERVICE_ID=
VITE_EMAILJS_TEMPLATE_ID=
VITE_EMAILJS_PUBLIC_KEY=
VITE_ALERT_EMAIL=alert@example.com
VITE_SHOW_SENSOR_DEBUG=false
```

### Modes

`VITE_DEMO_MODE=true`

- No wallet required
- Simulates transaction hashes
- Useful for UI demos and flow testing

`VITE_DEMO_MODE=false`

- Requires MetaMask
- Requires Sepolia contract deployment
- Uses real contract calls for register/auth/duress events

### Mobile Sensor Notes

- Motion/orientation capture may require an explicit permission prompt.
- Some browsers only allow sensor access in a secure context, such as HTTPS.
- On unsupported or blocked devices, VAULTLESS still works with the remaining signals instead of failing completely.
- `VITE_SHOW_SENSOR_DEBUG=true` enables extra live debugging graphs during enrollment.

## Smart Contract

The contract lives in [`src/contracts/VaultlessCore.sol`]

It supports:

- `register(bytes32 commitmentHash)`
- `authenticate(bytes32 nullifier)`
- `authFailed()`
- `triggerDuress()`
- `refine(bytes32 newHash)`

### Deploy To Sepolia

1. Open Remix.
2. Paste in [`src/contracts/VaultlessCore.sol`]
3. Compile with Solidity `0.8.20`.
4. Deploy using `Injected Provider - MetaMask`.
5. Copy the deployed address into `VITE_CONTRACT_ADDRESS`.
6. Set `VITE_DEMO_MODE=false`.

## Behaviour Engine

The main scoring logic is in [`src/hooks/behaviouralEngine.js`]

It currently uses a mix of:

- keystroke hold and flight timing
- mouse movement and click behavior
- touch movement and touch pressure on mobile devices
- optional motion/sensor-derived signals when supported
- weighted score fusion so keystrokes remain dominant while secondary signals add confidence

Current decision rules in code:

- `score >= 0.70` -> authenticated
- `0.60 <= score < 0.70` and stress detected -> duress
- otherwise -> rejected

Stress detection currently triggers when live rhythm variance exceeds about `2.5x` the enrollment baseline.

Current scoring behavior:

- keystroke similarity is the dominant signal
- mouse and gesture behaviour is blended in when enrollment data exists
- touch pressure and motion features contribute on mobile when enough data is available
- the engine falls back gracefully when a device cannot provide every signal


## Duress Protocol

If the typing pattern looks close enough to be plausible but also carries a stress signal, VAULTLESS:

- records a duress event
- optionally sends an EmailJS alert
- redirects the session into `/ghost`

This lets the app avoid clearly signaling to an attacker that duress was detected.

## Persistence

Enrollment data is stored client-side in `localStorage` through [`src/lib/VaultlessContext.jsx`]

That includes:

- enrollment vector
- averaged keystroke profile
- averaged mouse profile
- touch and motion-derived enrollment summaries when available
- wallet address
- enrollment status

## Notes

- This repo is a prototype, not a production-hardened auth system.
- Behavioural data is processed client-side and reduced to a commitment hash for contract registration.
- The contract is written for Sepolia testing, not mainnet deployment as-is.
- The broader goal is to prototype authentication that is more resilient, more human-aware, and more socially protective than passwords alone.

## Scripts

```bash
npm run dev
npm run build
npm run preview
```
