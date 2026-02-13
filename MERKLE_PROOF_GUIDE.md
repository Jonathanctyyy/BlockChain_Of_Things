# Merkle Proof System for Anomaly Verification

## Overview

This system implements **efficient cryptographic verification** of anomalous sensor readings using Merkle trees. Instead of storing all data on-chain, only the Merkle root is stored, enabling **O(log n) verification** of any specific reading.

## Key Benefits

### 🔒 **Space Efficient**
- **On-chain**: Only 32 bytes (Merkle root)
- **Verification**: ~10 hashes (for 1000 records)
- **Savings**: 99%+ reduction in blockchain storage

### ⚡ **Time Efficient**
- **Complexity**: O(log₂ n)
- **Example**: 1,000,000 records → only 20 hash operations
- **Result**: Sub-second verification

### 🛡️ **Cryptographically Secure**
- SHA-256 based Merkle tree
- Tamper-proof verification
- No need to trust the data provider

## How It Works

### 1. **Data Processing** (`process.js`)

When anomalies are detected:

```javascript
// For each machine's records:
// 1. Create Merkle tree from all sensor readings
const tree = new MerkleTree(leaves, SHA256);
const root = tree.getRoot();

// 2. Generate proofs for CRITICAL readings
const proof = tree.getProof(anomalousLeaf);

// 3. Store proof (compact: ~10 hashes)
// Instead of storing full data (100+ fields)
```

### 2. **Proof Structure**

Each anomaly proof contains:

```json
{
  "recordIndex": 42,
  "datetime": "2024-01-15 14:30:00",
  "leaf": "0x3a5b...",
  "proof": [
    { "position": "left", "data": "0x8f2c..." },
    { "position": "right", "data": "0x1d4e..." }
  ],
  "proofLength": 10,
  "data": {
    "volt": 152.3,
    "vibration": 55.2,
    "status": "CRITICAL"
  }
}
```

### 3. **On-Chain Verification** (`PredictiveMaintenance.sol`)

```solidity
function verifyMerkleProof(
    string memory _machineID,
    uint256 _anchorIndex,
    bytes32 _leaf,
    bytes32[] memory _proof,
    uint8[] memory _positions
) public view returns (bool)
```

**Verification Process:**
1. Start with leaf hash (the anomalous reading)
2. Combine with sibling hashes in proof
3. Work up the tree to compute root
4. Compare with stored Merkle root
5. ✅ Match = reading is authentic

## Usage

### Run the System

```bash
# 1. Process data and generate Merkle proofs
node ./scripts/process.js

# Output files:
# - anomaly_proofs.json (Merkle proofs for verification)
# - transaction_log.json (includes anomaly count)
# - database_analyzed.json (full dataset)
```

### Verify an Anomaly Proof

```bash
# Verify Machine 1's first anomaly
node ./scripts/verify-merkle-proof.js 1 0

# Verify Machine 2's second anomaly
node ./scripts/verify-merkle-proof.js 2 1
```

### Example Output

```
========================================
   MERKLE PROOF VERIFICATION
========================================

Machine ID: 1
Total Records: 1000
Anomalies Detected: 5
Merkle Root: 0x3a5b7c9d...

Verifying Anomalous Reading:
  Date/Time: 2024-01-15 14:30:00
  Voltage: 152.3V
  Vibration: 55.2 mm/s
  Status: CRITICAL

Merkle Proof Details:
  Proof Length: 10 hashes (O(log n) ≈ log₂(1000))
  Efficiency: 1.00% of full dataset size

🔍 Verifying proof on-chain...

✅ PROOF VERIFIED
   The anomalous reading is cryptographically proven
   to be part of the dataset on-chain.

Benefits:
✓ Space Efficient: 10 hashes vs 1000 records
✓ Time Efficient: O(log n) = 10 operations
✓ Cryptographically Secure: SHA-256 based
✓ Decentralized: Anyone can verify
✓ Immutable: Proof anchored on blockchain
```

## File Structure

```
project/
├── scripts/
│   ├── process.js                 # Generates Merkle proofs
│   └── verify-merkle-proof.js     # Verifies proofs on-chain
├── contracts/
│   └── PredictiveMaintenance.sol  # Includes verifyMerkleProof()
└── anomaly_proofs.json           # Generated proof database
```

## Technical Details

### Merkle Tree Construction

```
Records: [R0, R1, R2, R3, R4, R5, R6, R7]
                      ROOT
                    /      \
                  H01        H23
                 /  \       /  \
               H0   H1    H2   H3
              / \   / \   / \   / \
             R0 R1 R2 R3 R4 R5 R6 R7
```

### Proof Path Example

To verify R2 (anomalous):
- Proof: [R3, H01, H67]
- Path: R2 → H2 (with R3) → H23 (with H01) → ROOT (with H67)
- Size: 3 hashes (log₂ 8 = 3)

### Gas Costs

| Operation | Gas Cost | Notes |
|-----------|----------|-------|
| Store Merkle Root | ~22,000 | One-time per batch |
| Verify Proof (view) | 0 | Free read operation |
| Verify Proof (tx) | ~50,000 | With event emission |

**Comparison:**
- Storing 1000 records on-chain: ~5,000,000 gas
- Merkle root + verifications: ~100,000 gas
- **Savings: 98%**

## Configuration

Adjust anomaly detection sensitivity in `process.js`:

```javascript
const ANOMALY_CONFIG = {
    CONSECUTIVE_THRESHOLD: 3,      // Consecutive anomalies needed
    MULTI_SENSOR_THRESHOLD: 2,     // Sensors failing together
    TIME_WINDOW_HOURS: 1          // Time window for analysis
};
```

## Security Considerations

1. **Merkle Root Integrity**: Stored immutably on blockchain
2. **Proof Authenticity**: Cryptographically verifiable
3. **Data Tampering**: Any modification invalidates the proof
4. **Replay Attacks**: Timestamp and transaction hash prevent reuse

## Use Cases

- **Maintenance Audits**: Prove when anomalies were first detected
- **Insurance Claims**: Verify equipment failure evidence
- **Regulatory Compliance**: Demonstrate monitoring compliance
- **Dispute Resolution**: Cryptographic proof of equipment state
- **Third-Party Verification**: Allow auditors to verify without raw data access

## Advanced Features

### Multiple Anomaly Verification

```javascript
// Verify all anomalies for a machine
const machineProofs = anomalyProofs.find(p => p.machineID === '1');
for (let i = 0; i < machineProofs.anomalies.length; i++) {
    await verifyAnomalyProof('1', i);
}
```

### Batch Verification

Smart contract could be extended to verify multiple proofs in one transaction:

```solidity
function verifyMultipleProofs(
    string memory _machineID,
    uint256 _anchorIndex,
    bytes32[] memory _leaves,
    bytes32[][] memory _proofs,
    uint8[][] memory _positions
) public view returns (bool[] memory)
```

## Future Enhancements

- [ ] Frontend UI for proof visualization
- [ ] Automatic proof generation for all anomalies
- [ ] Proof aggregation using ZK-SNARKs
- [ ] Cross-machine anomaly correlation
- [ ] Historical proof comparison

## References

- [Merkle Trees](https://en.wikipedia.org/wiki/Merkle_tree)
- [MerkleTree.js Library](https://github.com/merkletreejs/merkletreejs)
- [Ethereum Merkle Proofs](https://docs.ethers.org/v5/api/utils/hashing/#utils-solidityKeccak256)
