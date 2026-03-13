# VAULTLESS

Behavioural authentication prototype that uses typing rhythm and mouse dynamics as a password substitute, with authentication events anchored to an Ethereum Sepolia smart contract.

## What It Does

VAULTLESS replaces static credentials with a behavioural profile built from:

- Keystroke timing
- Mouse movement patterns
- Stress and rhythm variance signals

The app guides a user through enrollment, compares live behaviour during authentication, and then routes the session into one of three outcomes:

- `authenticated`: normal session access
- `rejected`: failed verification
- `duress`: suspicious but plausible login, redirected into a ghost session while logging the event

## Core Flow

1. Open the landing page and choose demo or live mode.
2. Enroll by typing `Secure my account` three times.
3. The client averages those samples into a behavioural vector.
4. A commitment hash is registered on the Sepolia contract.
5. During authentication, a fresh behavioural sample is compared against the enrolled baseline.
6. The app logs `AuthSuccess`, `AuthFailed`, or `DuressActivated`.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing page with demo toggle and product framing |
| `/gmail` | Gmail-style entry page |
| `/enroll` | 3-sample behavioural enrollment flow |
| `/auth` | Live authentication and scoring UI |
| `/dashboard` | Authenticated session with chain event panel |
| `/ghost` | Decoy session shown during duress |

## Tech Stack

- React 18
- Vite 5
- React Router
- Ethers v6
- Recharts
- Tailwind/PostCSS tooling
- Solidity 0.8.20
- EmailJS for duress alerts

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

## Smart Contract

The contract lives in [`src/contracts/VaultlessCore.sol`](/c:/Users/Dell/OneDrive/Desktop/VAULTLESS/src/contracts/VaultlessCore.sol).

It supports:

- `register(bytes32 commitmentHash)`
- `authenticate(bytes32 nullifier)`
- `authFailed()`
- `triggerDuress()`
- `refine(bytes32 newHash)`

### Deploy To Sepolia

1. Open Remix.
2. Paste in [`src/contracts/VaultlessCore.sol`](/c:/Users/Dell/OneDrive/Desktop/VAULTLESS/src/contracts/VaultlessCore.sol).
3. Compile with Solidity `0.8.20`.
4. Deploy using `Injected Provider - MetaMask`.
5. Copy the deployed address into `VITE_CONTRACT_ADDRESS`.
6. Set `VITE_DEMO_MODE=false`.

## Behaviour Engine

The main scoring logic is in [`src/hooks/behaviouralEngine.js`](/c:/Users/Dell/OneDrive/Desktop/VAULTLESS/src/hooks/behaviouralEngine.js).

Current decision rules in code:

- `score >= 0.70` -> authenticated
- `0.60 <= score < 0.70` and stress detected -> duress
- otherwise -> rejected

Stress detection currently triggers when live rhythm variance exceeds about `2.5x` the enrollment baseline.

## Duress Protocol

If the typing pattern looks close enough to be plausible but also carries a stress signal, VAULTLESS:

- records a duress event
- optionally sends an EmailJS alert
- redirects the session into `/ghost`

This lets the app avoid clearly signaling to an attacker that duress was detected.

## Persistence

Enrollment data is stored client-side in `localStorage` through [`src/lib/VaultlessContext.jsx`](/c:/Users/Dell/OneDrive/Desktop/VAULTLESS/src/lib/VaultlessContext.jsx).

That includes:

- enrollment vector
- averaged keystroke profile
- averaged mouse profile
- wallet address
- enrollment status

## Notes

- This repo is a prototype, not a production-hardened auth system.
- Behavioural data is processed client-side and reduced to a commitment hash for contract registration.
- The contract is written for Sepolia testing, not mainnet deployment as-is.

## Scripts

```bash
npm run dev
npm run build
npm run preview
```
