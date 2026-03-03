# Running Mocha/Chai Tests

## Setup

The Mocha/Chai tests are standalone tests that use ethers.js directly and connect to a local Hardhat node.

## How to Run

### Step 1: Start Hardhat Node (Terminal 1)

Open a PowerShell terminal and run:

```powershell
npx hardhat node
```

Keep this terminal running. You should see output like:
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts
========
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
...
```

### Step 2: Compile Contracts (Terminal 2)

Open a second PowerShell terminal and compile the contracts:

```powershell
npm run compile
```

### Step 3: Run Mocha/Chai Tests (Terminal 2)

In the same terminal, run the tests:

```powershell
npm run test:mocha
```

## What Gets Tested

✅ Contract deployment  
✅ Storing proofs with/without anomalies  
✅ Machine registration  
✅ Signature verification  
✅ Merkle proof verification  
✅ Insurance claim validation  
✅ Edge cases  

## Test Structure

```
test/
└── mocha/
    └── PredictiveMaintenance.mocha.test.js    # Standalone Mocha/Chai tests
```

## Troubleshooting

### "connect ECONNREFUSED"
- Make sure Hardhat node is running in Terminal 1
- Check that it's running on http://127.0.0.1:8545

### "artifacts not found"
- Run `npm run compile` first

### Tests timeout
- Increase timeout: Use `--timeout 60000` flag

## Alternative: One-Command Run

To run everything in one command (requires keeping node running):

```powershell
# Terminal 1 - Keep running
npx hardhat node

# Terminal 2 - Run when node is ready
npm run compile; npm run test:mocha
```

## Other Test Frameworks

- **Hardhat Tests (Viem)**: `npm run test`
- **Slither** (requires Python): `npm run analyze`
- **Echidna** (requires installation): `npm run test:echidna:predictive`

---

**Note**: These Mocha/Chai tests are independent from Hardhat's test runner and use raw ethers.js for maximum compatibility.
