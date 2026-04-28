# The Blockchain of Things (BCoT) A Scalable Hybrid Architecture for Automated Maintenance Claims

A dissertation project demonstrating how blockchain technology can provide tamper-proof data integrity and decentralised trust for IoT-based predictive maintenance and insurance claims, without the prohibitive gas costs of fully on-chain computation.

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Prerequisites](#prerequisites)
4. [Installation](#installation)
5. [Running the System](#running-the-system)
6. [How Each Component Works](#how-each-component-works)
   - [Anomaly Detection (Off-Chain)](#1-anomaly-detection-off-chain)
   - [Merkle Trees and Data Integrity](#2-merkle-trees-and-data-integrity)
   - [Digital Signatures](#3-digital-signatures)
   - [Smart Contract (On-Chain Anchoring)](#4-smart-contract-on-chain-anchoring)
   - [IPFS Off-Chain Storage](#5-ipfs-off-chain-storage)
   - [Frontend Interfaces](#6-frontend-interfaces)
7. [The Dataset](#the-dataset)
8. [Anomaly Detection Algorithm](#anomaly-detection-algorithm)
9. [Smart Contract Design](#smart-contract-design)
10. [Running Tests and Benchmarks](#running-tests-and-benchmarks)
11. [Project Structure](#project-structure)
12. [Key Design Decisions](#key-design-decisions)

---

## Overview

**BlockChain of Things** is a hybrid IoT data integrity system that combines:

- **Off-chain anomaly detection** — fast, free JavaScript-based sensor analysis
- **On-chain anchoring** — only cryptographic commitments (Merkle roots) are written to the Ethereum blockchain
- **Digital signatures** — each machine signs its own data to prove authenticity
- **IPFS decentralised storage** — full sensor logs and Merkle proofs are stored on IPFS via Pinata
- **Insurance claim validation** — smart contracts verify Merkle proofs to validate claims without storing all sensor data

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────┐
│             IoT SENSOR DATA (PdM_telemetry.csv)              │
│        Industrial machine telemetry: ~80M readings           │
│        Sensors: vibration, voltage, pressure, rotation       │
└──────────────────────────┬───────────────────────────────────┘
                           │ stream (csv-parser)
                           ▼
┌──────────────────────────────────────────────────────────────┐
│              scripts/process.js  (Main Orchestrator)         │
│                                                              │
│  Step 1 — ANOMALY DETECTION (off-chain, free)                │
│    • Multi-sensor rule: ≥2 sensors fail simultaneously       │
│    • Temporal rule: same sensor fails 3+ consecutive reads   │
│    • Filters isolated false positives (single-reading spikes)│
│                                                              │
│  Step 2 — CRYPTOGRAPHIC PROOFS                               │
│    • Build keccak256 Merkle tree for each machine's batch    │
│    • Extract Merkle proofs only for anomalous readings       │
│    • Sign all data with machine's ECDSA private key          │
│                                                              │
│  Step 3 — BLOCKCHAIN SUBMISSION (on-chain anchoring)         │
│    • Register machine address on smart contract              │
│    • Store (merkleRoot, hasAnomaly) — NOT individual records │
│    • Optionally verify ECDSA signature on-chain              │
│                                                              │
│  Step 4 — OFF-CHAIN STORAGE (IPFS via Pinata)                │
│    • Upload full sensor log JSON                             │
│    • Upload Merkle proofs for each anomaly                   │
│    • Store transaction log for frontend                      │
└──────────┬───────────────────┬──────────────────────────────┘
           │                   │
           ▼                   ▼
    ┌─────────────┐    ┌──────────────────┐
    │  BLOCKCHAIN │    │  IPFS (Pinata)   │
    │  Ethereum   │    │  Full data logs  │
    │  Merkle     │    │  Merkle proofs   │
    │  roots only │    │  Anomaly details │
    └──────┬──────┘    └────────┬─────────┘
           │                   │
           └─────────┬─────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │   FRONTEND INTERFACES  │
        │  client.html           │
        │  → Submit claims       │
        │  → View tx history     │
        │                        │
        │  insurance.html        │
        │  → Verify claims       │
        │  → Approve/deny        │
        │  → Batch payouts       │
        └────────────────────────┘
```

---

## Prerequisites

| Requirement | Version | Purpose |
|-------------|---------|---------|
| Node.js | ≥ 18 | Runtime for all scripts |
| npm | ≥ 9 | Package management |
| Python | ≥ 3.8 | Visualisation generation (optional) |
| Slither | latest | Smart contract static analysis (optional) |

You will also need:

- A [Pinata](https://pinata.cloud) account for IPFS storage (free tier works)
- The `iot-data/PdM_telemetry.csv` dataset (Microsoft Predictive Maintenance dataset)

---

## Running the System

The full pipeline requires three terminals.

### Terminal 1 — Start the local Ethereum blockchain

```bash
npx hardhat node
```

This starts a local Hardhat Ethereum node at `http://localhost:8545`. It prints a list of funded test accounts with private keys. Copy one of these private keys — you will need it for the deployment step.

### Terminal 2 — Deploy the smart contract

```bash
npx hardhat run scripts/deploy-web3.js --network localhost
```

This deploys `PredictiveMaintenance.sol` to the running Hardhat node. The contract address is automatically saved to `contract-address.json`, which `process.js` reads at startup.

> If you want to run the gas-comparison benchmark, also deploy the multi-record contract:
> ```bash
> npx hardhat run scripts/deploy-multirecord.js --network localhost
> ```

### Terminal 3 — Run the IoT processing pipeline

```bash
node scripts/process.js
```

This is the main entry point. It streams the CSV dataset, runs anomaly detection, builds Merkle trees, submits proofs to the blockchain, and uploads data to IPFS. Progress is logged to the console. On completion it writes:

| Output file | Contents |
|-------------|----------|
| `database_analyzed.json` | All processed records with anomaly status |
| `transaction_log.json` | Blockchain transaction details per machine |
| `anomaly_proofs.json` | Merkle proofs for all detected anomalies |

### Terminal 3 (optional) — Serve the frontend

Serve the `frontend/` folder with any static file server, for example:

```bash
npx serve frontend -p 8045
```

Then open:
- `http://localhost:8045/client.html` — machine owner portal
- `http://localhost:8045/insurance.html` — insurance company portal

Connect MetaMask to `http://localhost:8545` (chain ID 31337) to interact with the deployed contract.

---

## How Each Component Works

### 1. Anomaly Detection (Off-Chain)

**File:** [scripts/process.js](scripts/process.js)

The sensor data is read as a CSV stream using `csv-parser`. For each machine, readings are grouped into **1-hour time windows**. Within each window, two rules determine whether an anomaly is critical enough to record:

**Rule A — Multi-Sensor Correlation**
If two or more sensors breach their thresholds simultaneously in a single reading, it is classified as a critical anomaly. Isolated single-sensor violations are not flagged, as they may be transient noise.

```
Thresholds:
  vibration  > 50.0
  voltage    < 155.0  or  > 190.0
  pressure   < 80.0   or  > 120.0
  rotation   < 350.0  or  > 550.0
```

**Rule B — Temporal Persistence**
If the same sensor exceeds its threshold in three or more **consecutive** readings, it indicates a sustained fault rather than a spike, and is also classified as critical.

Both rules together dramatically reduce false positives while catching genuine equipment degradation.

---

### 2. Merkle Trees and Data Integrity

**Library:** `merkletreejs` with `keccak256`

After processing each machine's batch of readings, a **Merkle tree** is constructed. Each leaf is the keccak256 hash of one sensor reading record. The tree uses sorted pairs, making it deterministic and compatible with OpenZeppelin's on-chain verifier.

```
Leaf = keccak256(machineId | timestamp | vibration | voltage | pressure | rotation)

             Root (bytes32)
            /              \
       Hash(A+B)        Hash(C+D)
       /     \           /     \
    H(A)    H(B)      H(C)    H(D)
     |       |         |       |
  Record A  Record B  Record C Record D
```

Only the **root hash** (32 bytes) is written to the blockchain. The full tree stays off-chain (on IPFS). To prove that a specific anomalous reading is genuine, a **Merkle proof** (a short array of sibling hashes) can be provided. Anyone can verify this proof on-chain by re-computing the path from the leaf to the root and checking it matches the stored root.

This means the blockchain never stores individual sensor values, yet can cryptographically verify any claim about them.

---

### 3. Digital Signatures

**Library:** `@noble/secp256k1` with EIP-191 encoding

Each machine has an Ethereum-compatible ECDSA keypair. Before submitting a batch, the machine signs a digest of all its data using its private key. The signature proves:

1. The data was produced by the machine that owns this address
2. The data has not been modified since signing

The smart contract stores the machine's registered address. When verifying a claim, `ecrecover` is called on-chain to recover the signer's address from the signature and check it matches the registered machine address. This prevents a fraudulent machine owner from fabricating anomaly data.

---

### 4. Smart Contract (On-Chain Anchoring)

**File:** [contracts/PredictiveMaintenance.sol](contracts/PredictiveMaintenance.sol)

The contract maintains a **ledger** mapping each machine ID to an array of `Anchor` structs:

```solidity
struct Anchor {
    uint256 timestamp;
    bytes32 merkleRoot;
    bool    hasAnomaly;
}

mapping(address => Anchor[]) public machineLedger;
```

**Key functions:**

| Function | What it does |
|----------|-------------|
| `registerMachine(address machine)` | Registers a machine's signing address |
| `storeProof(bytes32 root, bool anomaly)` | Appends an Anchor for the caller's machine |
| `verifySignature(bytes32 hash, bytes sig, address machine)` | Recovers signer via ecrecover and checks it matches |
| `verifyMerkleProof(bytes32[] proof, bytes32 root, bytes32 leaf)` | Validates a Merkle inclusion proof |
| `validateInsuranceClaim(address machine, bytes32[] proof, bytes32 leaf, uint index)` | Combines Merkle proof + anomaly flag check for insurance |

Each `storeProof` call costs approximately 100,000–200,000 gas regardless of how many sensor readings were in the batch, because only one 32-byte hash is stored.

**Comparison contract:** `PredictiveMaintenanceMultiRecord.sol` stores every individual sensor reading on-chain for each batch. Its gas cost scales linearly with the number of records, demonstrating why the Merkle-root approach is essential for scalability.

---

### 5. IPFS Off-Chain Storage

**Service:** Pinata (IPFS pinning gateway)

After each machine batch is processed and submitted to the blockchain, the following data is uploaded to IPFS:

- The full sensor readings JSON for that machine's batch
- The Merkle proofs for all anomalous readings
- The transaction log containing the blockchain transaction hash

The IPFS content identifier (CID) returned by Pinata is stored in `transaction_log.json`. Anyone with the CID can retrieve the full data via any IPFS gateway:

```
https://gateway.pinata.cloud/ipfs/{CID}
```

The blockchain transaction serves as the immutable timestamp and commitment; IPFS provides the decentralised store for the bulk data that would be impractical to store on-chain.

---

### 6. Frontend Interfaces

**Files:** [frontend/client.html](frontend/client.html), [frontend/insurance.html](frontend/insurance.html)

Both interfaces connect to the deployed smart contract via MetaMask and read `transaction_log.json` from the local server.

**Client portal (`client.html`):**
- Machine owners can view their transaction history
- Submit an insurance claim by providing the anomaly reading and its Merkle proof
- The proof is verified on-chain by calling `validateInsuranceClaim`

**Insurance portal (`insurance.html`):**
- Insurance company queries claims submitted to the contract
- Verifies the Merkle proof and signature on-chain
- Approves or denies claims
- Initiates batch Ether payouts to approved claimants

---

## The Dataset

**Source:** Microsoft Azure AI Gallery — Predictive Maintenance Dataset (PdM)

The dataset simulates an industrial environment with multiple machines over several months. The main file `PdM_telemetry.csv` contains hourly sensor readings:

| Column | Description |
|--------|-------------|
| `datetime` | Timestamp of the reading |
| `machineID` | Machine identifier (1–100) |
| `volt` | Voltage reading |
| `rotate` | Rotation speed (RPM) |
| `pressure` | Pressure |
| `vibration` | Vibration level |

Supporting files:
- `PdM_failures.csv` — ground-truth failure labels (used for evaluation accuracy)
- `PdM_errors.csv` — error codes logged during operation
- `PdM_maint.csv` — maintenance records
- `PdM_machines.csv` — machine metadata (model, age)

---

## Anomaly Detection Algorithm

The detection logic in [scripts/process.js](scripts/process.js) processes readings per machine in streaming fashion:

```
For each reading:
  1. Check each sensor against its threshold → build list of failing sensors
  
  2. Multi-sensor rule:
     IF count(failing sensors) >= 2 THEN → CRITICAL ANOMALY
  
  3. Temporal persistence rule:
     FOR each sensor:
       IF sensor failed in current AND previous 2 consecutive readings THEN → CRITICAL ANOMALY
  
  4. If CRITICAL ANOMALY detected:
     • Tag the reading as anomalous in the output
     • Add its index to the anomaly list for Merkle proof extraction
     • Update statistics counters

Output per machine batch:
  • readings[]     — all records with anomaly flag
  • anomalyCount   — number of critical anomalies found
  • merkleRoot     — root of the Merkle tree of all readings
  • signature      — ECDSA signature over all readings
```

---

## Smart Contract Design

Two contracts are provided for comparison:

### PredictiveMaintenance.sol (production design)

- Stores only `(merkleRoot, hasAnomaly)` per batch — O(1) cost per batch
- Machine identity verified via ECDSA `ecrecover`
- Merkle inclusion proofs allow verification of individual readings without storing them
- Insurance validation is fully on-chain and permissionless

### PredictiveMaintenanceMultiRecord.sol (comparison baseline)

- Stores every individual sensor record on-chain
- Gas cost grows linearly with batch size
- Used in benchmarks to demonstrate the cost advantage of the Merkle approach
- At 100 records the multi-record contract costs 10–100× more gas

---

## Running Tests and Benchmarks

All test scripts are in the `test/` directory.

```bash
# Unit tests for the smart contract (Mocha/Chai)
npm run test:mocha

# Gas usage benchmarks
npm run test:gas

# Transaction latency benchmarks
npm run test:latency

# Throughput benchmarks
npm run test:throughput

# Insurance claim end-to-end benchmark
npm run test:insurance-benchmark

# Run all performance benchmarks
npm run test:performance

# Smart contract static analysis (requires Slither)
npm run test:slither

# Solidity coverage report
npm run test:coverage
```

Benchmark results are written to `report/` as JSON files. 

---

## Project Structure

```
BlockChain_Of_Things/
│
├── contracts/
│   ├── PredictiveMaintenance.sol           # Main contract (off-chain detection)
│   └── PredictiveMaintenanceMultiRecord.sol # Baseline contract (on-chain detection)
│
├── scripts/
│   ├── process.js                          # Main IoT processing pipeline
│   ├── deploy-web3.js                      # Deploy PredictiveMaintenance
│   ├── deploy-multirecord.js               # Deploy MultiRecord (for benchmarks)
│   └── dramatic-comparison.js             # Gas cost comparison demo
│
├── test/
│   ├── mocha/
│   │   └── PredictiveMaintenance.mocha.test.js
│   ├── gas-efficiency.test.js
│   ├── latency.test.js
│   ├── throughput.test.js
│   ├── merkle-proof-efficiency.test.js
│   ├── insurance-claim-benchmark.js
│   ├── batch-payout.test.js
│   └── cost-to-value-ratio.test.js
│
├── frontend/
│   ├── client.html                         # Machine owner portal
│   ├── insurance.html                      # Insurance company portal
│   └── scripts/                            # Frontend JS
│
├── iot-data/
│   ├── PdM_telemetry.csv                   # Main sensor dataset (~80M readings)
│   ├── PdM_failures.csv
│   ├── PdM_errors.csv
│   ├── PdM_maint.csv
│   └── PdM_machines.csv
│
├── report/                                 # Benchmark output JSON files
├── visualizations/                         # Generated charts (PNG/PDF)
├── artifacts/                              # Compiled contract ABIs
│
├── package.json
├── hardhat.config.ts
├── .env                                    # API keys and private keys
├── contract-address.json                   # Written by deploy script
├── database_analyzed.json                  # Written by process.js
├── transaction_log.json                    # Written by process.js
└── anomaly_proofs.json                     # Written by process.js
```

---
