# Performance Testing Guide

## Overview

This project includes comprehensive performance testing for gas efficiency and system latency.

## 📊 Gas Efficiency Testing

Tests gas consumption for different smart contract operations.

### Run Gas Tests
```bash
npm run test:gas
```

### What it measures:
- **Single Record Operations** (Off-chain anomaly detection)
  - `storeProof` without anomaly
  - `storeProof` with anomaly
  - Merkle proof verification
  
- **Multi-Record Operations** (On-chain anomaly detection)
  - 10, 50, 100 records processing
  - Gas costs per record
  - Impact of anomaly events
  
- **Deployment Costs**
  - Contract deployment gas usage

### Output:
- Console output with detailed gas usage per operation
- `gas-report.json` - Detailed JSON report with:
  - Gas used per transaction
  - Gas price (in wei)
  - Total cost (in ETH)
  - Average gas across all tests

### Example Output:
```
📊 GAS EFFICIENCY ANALYSIS

  Single Record (Off-chain Detection)
    ⛽ Gas used: 67,234
    ✔ Should measure gas for storeProof without anomaly

GAS SUMMARY
================================================================================
storeProof_no_anomaly                              67,234 gas  | 0.000067234 ETH
storeProof_with_anomaly                            89,456 gas  | 0.000089456 ETH
multirecord_100_readings                         3,456,789 gas  | 0.003456789 ETH
================================================================================
```

---

## ⏱️ System Latency Testing

Measures real-world performance and response times.

### Run Latency Tests
```bash
npm run test:latency
```

### What it measures:
- **Transaction Latency**
  - Transaction creation time
  - Network propagation time
  - Block confirmation time
  - Total end-to-end latency
  
- **Read Operation Latency**
  - Data retrieval speed
  - State query performance
  
- **Sequential vs Parallel Operations**
  - Performance comparison
  - Optimization benefits
  
- **Network Under Load**
  - Burst transaction handling
  - System throughput
  
- **End-to-End Workflows**
  - Complete operation chains
  - Multi-step process timing

### Output:
- Console output with detailed timing breakdown
- `latency-report.json` - Detailed JSON report with:
  - Individual operation latencies
  - Statistical analysis (avg, median, min, max, std dev)
  - Performance breakdown by operation type

### Example Output:
```
⏱️  SYSTEM LATENCY ANALYSIS

  Transaction Latency
    ⏱️  storeProof
       Total: 234.56ms | TX Create: 12.34ms | Network: 56.78ms | Confirm: 165.44ms

LATENCY SUMMARY
================================================================================
Average Latency:    245.67 ms
Median Latency:     234.56 ms
Min Latency:        198.23 ms
Max Latency:        312.45 ms
Std Deviation:      34.21 ms
================================================================================
```

---

## 🚀 Run All Performance Tests

```bash
npm run test:performance
```

This runs both gas and latency tests in sequence.

---

## 📊 Generate Visualizations for Your Paper

After running tests, generate publication-quality graphs:

```bash
npm run visualize
```

Or run tests and generate graphs in one command:

```bash
npm run test:performance:full
```

This creates 8 publication-quality graphs in the `visualizations/` folder:

**Gas Efficiency Graphs:**
- `gas_comparison.png/pdf` - Overall gas usage comparison
- `per_record_gas.png/pdf` - Scalability analysis  
- `anomaly_impact.png/pdf` - Impact of anomalies on gas costs
- `eth_cost_comparison.png/pdf` - Transaction costs in ETH

**System Performance Graphs:**
- `latency_breakdown.png/pdf` - Transaction latency components
- `read_write_latency.png/pdf` - Read vs write performance
- `sequential_vs_parallel.png/pdf` - Parallel execution benefits
- `latency_statistics.png/pdf` - Overall latency metrics

📄 **Formats**: PNG (300 DPI) for presentations, PDF (vector) for papers

See [visualizations/README.md](visualizations/README.md) for detailed guide on using graphs in your paper.

---

## Prerequisites

Before running tests, make sure:

1. **Hardhat node is running**:
   ```bash
   npx hardhat node
   ```

2. **Contracts are compiled**:
   ```bash
   npm run compile
   ```

3. **Dependencies are installed**:
   ```bash
   npm install
   ```

---

## Understanding the Results

### Gas Efficiency Results

**Low Gas = Good** 
- Off-chain detection: ~60-90k gas per operation
- On-chain detection: ~2-5 million gas for 100 records
- **Key Insight**: Off-chain anomaly detection is 50-100x more gas efficient

### Latency Results

**Low Latency = Good**
- Write operations: 200-500ms typical
- Read operations: <100ms typical
- Parallel operations: 3-5x faster than sequential
- **Key Insight**: Blockchain writes are slow; optimize by batching

---

## Integration with CI/CD

Add to your CI pipeline:

```yaml
- name: Performance Tests
  run: |
    npx hardhat node &
    sleep 5
    npm run test:performance
```

---

## Generated Reports

Both tests generate JSON reports for further analysis:

- **gas-report.json** - Full gas usage data
- **latency-report.json** - Full timing data

These can be:
- Tracked over time to monitor regression
- Compared across commits
- Visualized using charting tools
- Integrated into monitoring dashboards

---

## Tips for Optimization

Based on test results:

1. **Gas Optimization**:
   - Use off-chain anomaly detection
   - Batch operations when possible
   - Minimize on-chain storage
   - Use events for logging, not storage

2. **Latency Optimization**:
   - Send transactions in parallel
   - Use read operations for queries
   - Cache frequently accessed data
   - Consider layer 2 solutions

---

## Troubleshooting

**"Connection refused"** - Make sure Hardhat node is running
**Timeout errors** - Increase timeout in package.json scripts
**Gas estimation failed** - Check contract compilation

---

## Next Steps

1. Run baseline tests: `npm run test:performance`
2. Make optimizations to contracts
3. Run tests again and compare results
4. Document improvements in your project
