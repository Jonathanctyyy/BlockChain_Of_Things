# Insurance Claim Double Confirmation System

## Overview

This system implements a **two-phase validation** for insurance claims based on IoT sensor data. Both phases must pass for a claim to be approved.

## Double Confirmation Process

```
┌─────────────────────────────────────────────────────────┐
│              INSURANCE CLAIM SUBMITTED                  │
│     (Anomalous sensor reading from IPFS)                │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│  PHASE 1: INTEGRITY CHECK (Merkle Proof Verification)  │
│  ✓ Does the reading match the Merkle root on-chain?    │
│  ✓ Has the data been tampered with?                    │
└─────────────────────────────────────────────────────────┘
                           ↓
                      PASSED? ──NO──→ ❌ CLAIM REJECTED
                           │               (Data integrity failed)
                          YES
                           ↓
┌─────────────────────────────────────────────────────────┐
│  PHASE 2: POLICY CHECK (Business Logic Validation)     │
│  ✓ Does the reading exceed policy thresholds?          │
│  ✓ Is this a covered event?                            │
└─────────────────────────────────────────────────────────┘
                           ↓
                      PASSED? ──NO──→ ❌ CLAIM REJECTED
                           │               (No policy violation)
                          YES
                           ↓
                   ✅ CLAIM APPROVED
```

## Why Double Confirmation?

### **Problem Without It:**

| Scenario | Single Check (Proof Only) | Result |
|----------|--------------------------|---------|
| Temperature = 105°C (Policy: >110°C) | ✅ Proof valid | ❌ **WRONG**: Pays out even though below threshold |
| Tampered data showing 115°C | No integrity check | ❌ **WRONG**: Pays fraudulent claim |

### **Solution With Double Confirmation:**

| Check 1 (Integrity) | Check 2 (Policy) | Result | Reason |
|---------------------|------------------|--------|---------|
| ✅ Valid | ✅ Exceeds threshold | ✅ **APPROVED** | Both checks passed |
| ✅ Valid | ❌ Within range | ❌ **REJECTED** | Real data but no violation |
| ❌ Invalid | N/A | ❌ **REJECTED** | Tampered data |
| ✅ Valid | ❌ No policy | ❌ **REJECTED** | Machine not insured |

## Usage

### Step 1: Set Insurance Policy

```bash
# Set policy thresholds for Machine 1
node scripts/insurance-claim.js set-policy 1
```

**Default Thresholds:**
- Voltage: 155.0V - 190.0V
- Vibration: < 50.0 mm/s
- Pressure: 80.0 - 120.0 PSI
- Rotation: 350 - 550 RPM

### Step 2: Validate Claim

```bash
# Validate Machine 1's first anomaly
node scripts/insurance-claim.js validate 1 0

# Full workflow (set policy + validate)
node scripts/insurance-claim.js full 1 0
```

## Example Output

```
═══════════════════════════════════════
   PHASE 1: INTEGRITY CHECK
═══════════════════════════════════════

🔍 Verifying Merkle proof...
   Merkle Root: 0x3a5b7c9d...
   Leaf Hash: 0x8f2c1d4e...
   Proof Length: 10 hashes

✅ Phase 1 PASSED: Data integrity verified

═══════════════════════════════════════
   PHASE 2: POLICY CHECK
═══════════════════════════════════════

📊 SENSOR READINGS:
   Voltage: 152.3V
   Vibration: 55.2 mm/s
   Pressure: 95.0 PSI
   Rotation: 450 RPM

🔍 Checking against thresholds...

Policy Violation Found:
   Type: VOLTAGE_LOW
   Reading: 152.3V
   Threshold: 155.0V minimum

✅ Phase 2 PASSED: Policy violation confirmed

═══════════════════════════════════════
   🎉 CLAIM APPROVED
═══════════════════════════════════════

   Machine: 1
   Claim Type: VOLTAGE_LOW
   Timestamp: 2024-01-15 14:30:00

Next Steps:
   • Evidence verified on blockchain
   • Policy violation confirmed
   • Ready for insurance payout processing
```

## Smart Contract Functions

### 1. Set Insurance Policy

```solidity
function setInsurancePolicy(
    string memory _machineID,
    uint256 _voltageMin,
    uint256 _voltageMax,
    uint256 _vibrationMax,
    // ... other thresholds
) public
```

### 2. Validate Claim (Double Confirmation)

```solidity
function validateInsuranceClaim(
    string memory _machineID,
    uint256 _anchorIndex,
    bytes32 _leaf,
    bytes32[] memory _proof,
    uint8[] memory _positions,
    uint256 voltage,
    uint256 vibration,
    uint256 pressure,
    uint256 rotation
) public returns (
    bool proofValid,    // Phase 1 result
    bool policyMet,     // Phase 2 result
    string memory claimType
)
```

### 3. Check Eligibility (No Gas)

```solidity
function checkClaimEligibility(
    string memory _machineID,
    uint256 voltage,
    uint256 vibration,
    uint256 pressure,
    uint256 rotation
) public view returns (
    bool eligible,
    string memory reason
)
```

## Claim Validation Logic

### Phase 1: Integrity Check

```javascript
// Reconstruct Merkle root from proof
computedRoot = hash(leaf, proof[0])
computedRoot = hash(computedRoot, proof[1])
// ... continue up the tree

// Compare with stored root
if (computedRoot === storedRoot) {
    ✅ Phase 1 PASSED
} else {
    ❌ Phase 1 FAILED - Data tampered
}
```

### Phase 2: Policy Check

```javascript
if (voltage < policy.voltageMin) {
    claimType = "VOLTAGE_LOW"
    ✅ Phase 2 PASSED
} else if (voltage > policy.voltageMax) {
    claimType = "VOLTAGE_HIGH"
    ✅ Phase 2 PASSED
} else if (vibration > policy.vibrationMax) {
    claimType = "VIBRATION_HIGH"
    ✅ Phase 2 PASSED
}
// ... check other thresholds

if (no_violations) {
    ❌ Phase 2 FAILED - No policy violation
}
```

## Events Emitted

### ClaimApproved
```solidity
event ClaimApproved(
    string indexed machineID,
    uint256 timestamp,
    string claimType
)
```

### ClaimRejected
```solidity
event ClaimRejected(
    string indexed machineID,
    uint256 timestamp,
    string reason
)
```

### ClaimValidated
```solidity
event ClaimValidated(
    string indexed machineID,
    uint256 anchorIndex,
    bytes32 leaf,
    bool proofValid,
    bool policyMet,
    string reason
)
```

## Rejection Reasons

| Reason | Explanation |
|--------|-------------|
| `INTEGRITY_FAILED` | Merkle proof invalid - data tampered |
| `NO_POLICY` | No active insurance for this machine |
| `NO_VIOLATION` | Readings within acceptable range |
| `VOLTAGE_LOW` | ✅ Valid claim - voltage too low |
| `VOLTAGE_HIGH` | ✅ Valid claim - voltage too high |
| `VIBRATION_HIGH` | ✅ Valid claim - excessive vibration |
| `PRESSURE_LOW` | ✅ Valid claim - pressure too low |
| `PRESSURE_HIGH` | ✅ Valid claim - pressure too high |
| `ROTATION_LOW` | ✅ Valid claim - rotation too slow |
| `ROTATION_HIGH` | ✅ Valid claim - rotation too fast |

## Real-World Example

### Scenario: Motor Overheating Claim

**Step 1:** Motor runs hot, vibration sensor reads 55.2 mm/s
**Step 2:** IoT device uploads data to IPFS
**Step 3:** Merkle root stored on blockchain
**Step 4:** Insurance claim submitted

**Phase 1 (Integrity Check):**
```
Claim: "Vibration was 55.2 mm/s on Jan 15, 2024 at 14:30"
Proof: [hash1, hash2, hash3, ...]
Result: ✅ Merkle proof valid - data is authentic
```

**Phase 2 (Policy Check):**
```
Reading: 55.2 mm/s
Policy: < 50.0 mm/s
Violation: VIBRATION_HIGH
Result: ✅ Exceeds threshold - claim valid
```

**Outcome:** ✅ Claim approved for payout

### Counter-Example: False Claim

**Scenario:** User tries to claim with tampered data

**Phase 1 (Integrity Check):**
```
Claim: "Voltage was 145V" (actually was 165V)
Proof: [hash1_fake, hash2_fake, ...]
Result: ❌ Merkle proof invalid
```

**Outcome:** ❌ Claim rejected immediately (Phase 2 not evaluated)

## Gas Costs

| Operation | Gas Cost | Notes |
|-----------|----------|-------|
| Set Policy | ~100,000 | One-time setup per machine |
| Check Eligibility (view) | 0 | Free off-chain check |
| Validate Claim | ~150,000 | Full verification + event |
| Merkle Proof Verify | ~50,000 | Part of validation |

## Integration with External Systems

### Insurance Automation

```javascript
// Listen for ClaimApproved events
contract.events.ClaimApproved()
    .on('data', async (event) => {
        const machineID = event.returnValues.machineID;
        const claimType = event.returnValues.claimType;
        
        // Trigger automated payout
        await insuranceAPI.processPayout(machineID, claimType);
    });
```

### Maintenance Scheduling

```javascript
// Listen for approved claims to schedule repairs
contract.events.ClaimApproved()
    .on('data', async (event) => {
        const machineID = event.returnValues.machineID;
        
        // Automatically schedule maintenance
        await maintenanceSystem.scheduleRepair(machineID);
    });
```

## Security Considerations

1. **Double Verification**: Both phases must pass
2. **Immutable Evidence**: Merkle root on blockchain can't be changed
3. **Transparent Logic**: All validation rules on-chain
4. **Event Logging**: Complete audit trail
5. **No Replay Attacks**: Each proof tied to specific timestamp

## Benefits

✅ **Fraud Prevention**: Can't fake data (Phase 1)  
✅ **No False Positives**: Only pays valid claims (Phase 2)  
✅ **Automation Ready**: Smart contract enables instant payouts  
✅ **Dispute Resolution**: Cryptographic proof settles disagreements  
✅ **Regulatory Compliance**: Transparent, auditable process  
✅ **Cost Efficient**: O(log n) verification instead of storing all data  

## Next Steps

1. Compile updated contract: `npx hardhat compile`
2. Deploy contract: `node scripts/deploy-web3.js`
3. Set insurance policies: `node scripts/insurance-claim.js set-policy 1`
4. Process IoT data: `node scripts/process.js`
5. Validate claims: `node scripts/insurance-claim.js validate 1 0`
