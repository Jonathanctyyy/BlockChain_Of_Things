import { expect } from "chai";
import { ethers } from "ethers";
import { readFileSync, writeFileSync } from "fs";
import { performance } from "perf_hooks";

/**
 * Statistical analysis helpers for probability density calculation
 */
function calculateStatistics(data) {
  if (data.length === 0) return null;
  
  const sorted = [...data].sort((a, b) => a - b);
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  const stdDev = Math.sqrt(variance);
  
  return {
    mean: parseFloat(mean.toFixed(4)),
    median: parseFloat(median.toFixed(4)),
    stdDev: parseFloat(stdDev.toFixed(4)),
    variance: parseFloat(variance.toFixed(4)),
    min: parseFloat(sorted[0].toFixed(4)),
    max: parseFloat(sorted[sorted.length - 1].toFixed(4)),
    p25: parseFloat(sorted[Math.floor(sorted.length * 0.25)].toFixed(4)),
    p75: parseFloat(sorted[Math.floor(sorted.length * 0.75)].toFixed(4)),
    p90: parseFloat(sorted[Math.floor(sorted.length * 0.90)].toFixed(4)),
    p95: parseFloat(sorted[Math.floor(sorted.length * 0.95)].toFixed(4)),
    p99: parseFloat(sorted[Math.floor(sorted.length * 0.99)].toFixed(4))
  };
}

function calculateProbabilityDensity(data, binCount = 20) {
  if (data.length === 0) return null;
  
  const sorted = [...data].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const binWidth = (max - min) / binCount;
  
  const bins = Array(binCount).fill(0).map((_, i) => ({
    start: parseFloat((min + i * binWidth).toFixed(4)),
    end: parseFloat((min + (i + 1) * binWidth).toFixed(4)),
    count: 0,
    frequency: 0,
    density: 0
  }));
  
  // Count data points in each bin
  sorted.forEach(value => {
    const binIndex = Math.min(Math.floor((value - min) / binWidth), binCount - 1);
    bins[binIndex].count++;
  });
  
  // Calculate frequency and probability density
  bins.forEach(bin => {
    bin.frequency = parseFloat((bin.count / data.length).toFixed(6));
    bin.density = parseFloat((bin.frequency / binWidth).toFixed(6));
  });
  
  return {
    binCount,
    binWidth: parseFloat(binWidth.toFixed(4)),
    bins: bins.filter(b => b.count > 0), // Only include non-empty bins
    totalSamples: data.length
  };
}

/**
 * Platform Throughput Testing Suite
 * Measures transactions per second (TPS) and overall system capacity
 */
describe("Platform Throughput Tests", function () {
  let provider;
  let signer;
  let predictiveMaintenance;
  let predictiveMaintenanceMultiRecord;
  const throughputResults = {};

  // Increase timeout for throughput tests
  this.timeout(120000); // 2 minutes

  before(async function () {
    provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    signer = await provider.getSigner(0);

    // Deploy PredictiveMaintenance
    const pmArtifact = JSON.parse(
      readFileSync(
        "./artifacts/contracts/PredictiveMaintenance.sol/PredictiveMaintenance.json",
        "utf8"
      )
    );
    const PMFactory = new ethers.ContractFactory(
      pmArtifact.abi,
      pmArtifact.bytecode,
      signer
    );
    predictiveMaintenance = await PMFactory.deploy();
    await predictiveMaintenance.waitForDeployment();

    // Deploy PredictiveMaintenanceMultiRecord
    const pmrArtifact = JSON.parse(
      readFileSync(
        "./artifacts/contracts/PredictiveMaintenanceMultiRecord.sol/PredictiveMaintenanceMultiRecord.json",
        "utf8"
      )
    );
    const PMRFactory = new ethers.ContractFactory(
      pmrArtifact.abi,
      pmrArtifact.bytecode,
      signer
    );
    predictiveMaintenanceMultiRecord = await PMRFactory.deploy();
    await predictiveMaintenanceMultiRecord.waitForDeployment();

    console.log("\n🚀 PLATFORM THROUGHPUT ANALYSIS\n");
  });

  after(function () {
    // Save throughput report
    const report = {
      timestamp: new Date().toISOString(),
      platform: "Hardhat (Ethereum-like)",
      networkType: "Local Development",
      results: throughputResults,
      summary: {
        maxTPS: Math.max(...Object.values(throughputResults).map(r => r.tps || 0)),
        maxThroughput: Math.max(...Object.values(throughputResults).map(r => r.throughput || 0)),
        averageBlockTime: "~2 seconds (Hardhat default)"
      }
    };

    writeFileSync("throughput-report.json", JSON.stringify(report, null, 2));

    console.log("\n📊 THROUGHPUT SUMMARY");
    console.log("=" .repeat(80));
    Object.entries(throughputResults).forEach(([test, data]) => {
      if (data.tps) {
        console.log(`${test.padEnd(50)} ${data.tps.toFixed(2).padStart(10)} TPS`);
      }
    });
    console.log("=" .repeat(80));
    console.log(`\n✅ Throughput report saved to: throughput-report.json\n`);
  });

  describe("Transactions Per Second (TPS)", function () {
    it("Should measure TPS for sequential writes", async function () {
      const txCount = 20;
      let totalClientTime = 0;
      let totalContractTime = 0;
      const startTime = performance.now();
      const contractTimes = [];
      const clientTimes = [];

      // Send transactions sequentially
      for (let i = 0; i < txCount; i++) {
        // Measure client-side preparation time
        const clientStart = performance.now();
        const tx = await predictiveMaintenance.storeProof(
          `MACHINE_SEQ_${i}`,
          ethers.id(`root_${i}`),
          false
        );
        const clientEnd = performance.now();
        const clientTime = (clientEnd - clientStart) / 1000;
        totalClientTime += (clientEnd - clientStart);
        clientTimes.push(clientTime);

        // Measure on-chain execution time
        const contractStart = performance.now();
        await tx.wait();
        const contractEnd = performance.now();
        const contractTime = (contractEnd - contractStart) / 1000;
        totalContractTime += (contractEnd - contractStart);
        contractTimes.push(contractTime);
      }

      const endTime = performance.now();
      const totalTimeSeconds = (endTime - startTime) / 1000;
      const clientTimeSeconds = totalClientTime / 1000;
      const contractTimeSeconds = totalContractTime / 1000;
      const tps = txCount / totalTimeSeconds;

      // Calculate statistics
      const contractStats = calculateStatistics(contractTimes);
      const clientStats = calculateStatistics(clientTimes);
      const contractPDF = calculateProbabilityDensity(contractTimes, 15);
      const clientPDF = calculateProbabilityDensity(clientTimes, 15);

      console.log(`  📝 Sequential Write TPS:`);
      console.log(`     Transactions: ${txCount}`);
      console.log(`     Total Time: ${totalTimeSeconds.toFixed(2)}s`);
      console.log(`     Client Time: ${clientTimeSeconds.toFixed(2)}s (${((clientTimeSeconds/totalTimeSeconds)*100).toFixed(1)}%)`);
      console.log(`     Contract Time: ${contractTimeSeconds.toFixed(2)}s (${((contractTimeSeconds/totalTimeSeconds)*100).toFixed(1)}%)`);
      console.log(`     TPS: ${tps.toFixed(2)}`);
      console.log(`     Contract Time - Mean: ${contractStats.mean}s, StdDev: ${contractStats.stdDev}s`);

      throughputResults["sequential_write_tps"] = {
        transactions: txCount,
        totalTime: totalTimeSeconds,
        clientTime: clientTimeSeconds,
        contractTime: contractTimeSeconds,
        clientPercentage: ((clientTimeSeconds/totalTimeSeconds)*100).toFixed(1) + "%",
        contractPercentage: ((contractTimeSeconds/totalTimeSeconds)*100).toFixed(1) + "%",
        tps: tps,
        mode: "sequential",
        statistics: {
          contract: contractStats,
          client: clientStats
        },
        probabilityDensity: {
          contract: contractPDF,
          client: clientPDF
        }
      };

      expect(tps).to.be.greaterThan(0);
    });

    it("Should measure TPS for parallel writes (best case)", async function () {
      const txCount = 50;
      const startTime = performance.now();
      const contractTimes = [];

      // Measure client-side preparation time
      const clientStart = performance.now();
      const txPromises = [];
      for (let i = 0; i < txCount; i++) {
        txPromises.push(
          predictiveMaintenance.storeProof(
            `MACHINE_PAR_${i}`,
            ethers.id(`root_par_${i}`),
            false
          )
        );
      }

      // Wait for all to be sent
      const txs = await Promise.all(txPromises);
      const clientEnd = performance.now();
      const clientTimeSeconds = (clientEnd - clientStart) / 1000;

      // Measure on-chain execution time for each transaction
      const contractStart = performance.now();
      const waitPromises = txs.map(async (tx) => {
        const txStart = performance.now();
        await tx.wait();
        const txEnd = performance.now();
        contractTimes.push((txEnd - txStart) / 1000);
      });
      await Promise.all(waitPromises);
      const contractEnd = performance.now();
      const contractTimeSeconds = (contractEnd - contractStart) / 1000;

      const endTime = performance.now();
      const totalTimeSeconds = (endTime - startTime) / 1000;
      const tps = txCount / totalTimeSeconds;

      // Calculate statistics
      const contractStats = calculateStatistics(contractTimes);
      const contractPDF = calculateProbabilityDensity(contractTimes, 15);

      console.log(`  ⚡ Parallel Write TPS:`);
      console.log(`     Transactions: ${txCount}`);
      console.log(`     Total Time: ${totalTimeSeconds.toFixed(2)}s`);
      console.log(`     Client Time: ${clientTimeSeconds.toFixed(2)}s (${((clientTimeSeconds/totalTimeSeconds)*100).toFixed(1)}%)`);
      console.log(`     Contract Time: ${contractTimeSeconds.toFixed(2)}s (${((contractTimeSeconds/totalTimeSeconds)*100).toFixed(1)}%)`);
      console.log(`     TPS: ${tps.toFixed(2)}`);
      console.log(`     Improvement: ${(tps / throughputResults.sequential_write_tps.tps).toFixed(2)}x faster`);
      console.log(`     Contract Time - Mean: ${contractStats.mean}s, StdDev: ${contractStats.stdDev}s`);

      throughputResults["parallel_write_tps"] = {
        transactions: txCount,
        totalTime: totalTimeSeconds,
        clientTime: clientTimeSeconds,
        contractTime: contractTimeSeconds,
        clientPercentage: ((clientTimeSeconds/totalTimeSeconds)*100).toFixed(1) + "%",
        contractPercentage: ((contractTimeSeconds/totalTimeSeconds)*100).toFixed(1) + "%",
        tps: tps,
        mode: "parallel",
        statistics: {
          contract: contractStats
        },
        probabilityDensity: {
          contract: contractPDF
        }
      };

      expect(tps).to.be.greaterThan(throughputResults.sequential_write_tps.tps);
    });

    it("Should measure sustained TPS over 30 seconds", async function () {
      this.timeout(60000); // 60 seconds timeout

      const testDuration = 30; // seconds
      const startTime = performance.now();
      let txCount = 0;
      const pendingTxs = [];
      let totalClientTime = 0;
      const contractTimes = [];
      const clientTimes = [];

      console.log(`  ⏱️  Running sustained load test for ${testDuration} seconds...`);

      // Continuously send transactions for the duration
      const testEndTime = startTime + (testDuration * 1000);
      
      while (performance.now() < testEndTime) {
        const clientStart = performance.now();
        const tx = predictiveMaintenance.storeProof(
          `MACHINE_SUSTAINED_${txCount}`,
          ethers.id(`root_sustained_${txCount}`),
          txCount % 5 === 0 // Every 5th has anomaly
        );
        const clientEnd = performance.now();
        const clientTime = (clientEnd - clientStart) / 1000;
        totalClientTime += (clientEnd - clientStart);
        clientTimes.push(clientTime);
        
        pendingTxs.push(tx.then(async (resolvedTx) => {
          const contractStart = performance.now();
          await resolvedTx.wait();
          const contractEnd = performance.now();
          contractTimes.push((contractEnd - contractStart) / 1000);
        }));
        txCount++;

        // Small delay to avoid overwhelming the node
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const clientPhaseEnd = performance.now();
      const clientTimeSeconds = totalClientTime / 1000;

      // Wait for all pending transactions
      console.log(`     Waiting for ${txCount} transactions to confirm...`);
      const contractStart = performance.now();
      await Promise.all(pendingTxs);
      const contractEnd = performance.now();
      const contractTimeSeconds = (contractEnd - contractStart) / 1000;

      const endTime = performance.now();
      const totalTimeSeconds = (endTime - startTime) / 1000;
      const tps = txCount / totalTimeSeconds;

      // Calculate statistics
      const contractStats = calculateStatistics(contractTimes);
      const clientStats = calculateStatistics(clientTimes);
      const contractPDF = calculateProbabilityDensity(contractTimes, 20);
      const clientPDF = calculateProbabilityDensity(clientTimes, 20);

      console.log(`  📊 Sustained TPS:`);
      console.log(`     Total Transactions: ${txCount}`);
      console.log(`     Total Time: ${totalTimeSeconds.toFixed(2)}s`);
      console.log(`     Client Time: ${clientTimeSeconds.toFixed(2)}s (${((clientTimeSeconds/totalTimeSeconds)*100).toFixed(1)}%)`);
      console.log(`     Contract Time: ${contractTimeSeconds.toFixed(2)}s (${((contractTimeSeconds/totalTimeSeconds)*100).toFixed(1)}%)`);
      console.log(`     Average TPS: ${tps.toFixed(2)}`);
      console.log(`     Contract Time - Mean: ${contractStats.mean}s, StdDev: ${contractStats.stdDev}s, P95: ${contractStats.p95}s`);

      throughputResults["sustained_tps"] = {
        transactions: txCount,
        totalTime: totalTimeSeconds,
        clientTime: clientTimeSeconds,
        contractTime: contractTimeSeconds,
        clientPercentage: ((clientTimeSeconds/totalTimeSeconds)*100).toFixed(1) + "%",
        contractPercentage: ((contractTimeSeconds/totalTimeSeconds)*100).toFixed(1) + "%",
        tps: tps,
        mode: "sustained",
        testDuration: testDuration,
        statistics: {
          contract: contractStats,
          client: clientStats
        },
        probabilityDensity: {
          contract: contractPDF,
          client: clientPDF
        }
      };

      expect(txCount).to.be.greaterThan(50); // Should process at least 50 txs in 30s (local node)
    });
  });

  describe("Batch Processing Throughput", function () {
    let machineCounter = 1000;

    it("Should measure throughput for small batches (10 records)", async function () {
      const batchCount = 10;
      const recordsPerBatch = 10;
      const totalRecords = batchCount * recordsPerBatch;
      let totalClientTime = 0;
      let totalContractTime = 0;
      const contractTimes = [];
      const clientTimes = [];

      const startTime = performance.now();

      for (let i = 0; i < batchCount; i++) {
        const machineID = machineCounter++;
        await predictiveMaintenanceMultiRecord.registerMachine(machineID, signer.address);

        const clientStart = performance.now();
        const readings = Array(recordsPerBatch).fill(0).map(() => ({
          vibration: 40,
          volt: 170,
          pressure: 100,
          rotation: 450
        }));

        const tx = await predictiveMaintenanceMultiRecord.storeProofWithMultiRecordCheck(
          machineID,
          ethers.id(`batch_${i}`),
          readings
        );
        const clientEnd = performance.now();
        const clientTime = (clientEnd - clientStart) / 1000;
        totalClientTime += (clientEnd - clientStart);
        clientTimes.push(clientTime);

        const contractStart = performance.now();
        await tx.wait();
        const contractEnd = performance.now();
        const contractTime = (contractEnd - contractStart) / 1000;
        totalContractTime += (contractEnd - contractStart);
        contractTimes.push(contractTime);
      }

      const endTime = performance.now();
      const totalTimeSeconds = (endTime - startTime) / 1000;
      const clientTimeSeconds = totalClientTime / 1000;
      const contractTimeSeconds = totalContractTime / 1000;
      const throughput = totalRecords / totalTimeSeconds; // Records per second

      console.log(`  📦 Small Batch Throughput:`);
      console.log(`     Batches: ${batchCount}`);
      console.log(`     Records per batch: ${recordsPerBatch}`);
      console.log(`     Total records: ${totalRecords}`);
      console.log(`     Total Time: ${totalTimeSeconds.toFixed(2)}s`);
      console.log(`     Client Time: ${clientTimeSeconds.toFixed(2)}s (${((clientTimeSeconds/totalTimeSeconds)*100).toFixed(1)}%)`);
      console.log(`     Contract Time: ${contractTimeSeconds.toFixed(2)}s (${((contractTimeSeconds/totalTimeSeconds)*100).toFixed(1)}%)`);
      console.log(`     Throughput: ${throughput.toFixed(2)} records/second`);

      // Calculate statistics
      const contractStats = calculateStatistics(contractTimes);
      const clientStats = calculateStatistics(clientTimes);
      const contractPDF = calculateProbabilityDensity(contractTimes, 15);
      const clientPDF = calculateProbabilityDensity(clientTimes, 15);

      throughputResults["batch_small_throughput"] = {
        batches: batchCount,
        recordsPerBatch: recordsPerBatch,
        totalRecords: totalRecords,
        totalTime: totalTimeSeconds,
        clientTime: clientTimeSeconds,
        contractTime: contractTimeSeconds,
        clientPercentage: ((clientTimeSeconds/totalTimeSeconds)*100).toFixed(1) + "%",
        contractPercentage: ((contractTimeSeconds/totalTimeSeconds)*100).toFixed(1) + "%",
        throughput: throughput,
        statistics: {
          contract: contractStats,
          client: clientStats
        },
        probabilityDensity: {
          contract: contractPDF,
          client: clientPDF
        }
      };

      expect(throughput).to.be.greaterThan(0);
    });

    it("Should measure throughput for large batches (100 records)", async function () {
      const batchCount = 5;
      const recordsPerBatch = 100;
      const totalRecords = batchCount * recordsPerBatch;
      let totalClientTime = 0;
      let totalContractTime = 0;
      const contractTimes = [];
      const clientTimes = [];

      const startTime = performance.now();

      for (let i = 0; i < batchCount; i++) {
        const machineID = machineCounter++;
        await predictiveMaintenanceMultiRecord.registerMachine(machineID, signer.address);

        const clientStart = performance.now();
        const readings = Array(recordsPerBatch).fill(0).map(() => ({
          vibration: 40,
          volt: 170,
          pressure: 100,
          rotation: 450
        }));

        const tx = await predictiveMaintenanceMultiRecord.storeProofWithMultiRecordCheck(
          machineID,
          ethers.id(`batch_large_${i}`),
          readings
        );
        const clientEnd = performance.now();
        const clientTime = (clientEnd - clientStart) / 1000;
        totalClientTime += (clientEnd - clientStart);
        clientTimes.push(clientTime);

        const contractStart = performance.now();
        await tx.wait();
        const contractEnd = performance.now();
        const contractTime = (contractEnd - contractStart) / 1000;
        totalContractTime += (contractEnd - contractStart);
        contractTimes.push(contractTime);
      }

      const endTime = performance.now();
      const totalTimeSeconds = (endTime - startTime) / 1000;
      const clientTimeSeconds = totalClientTime / 1000;
      const contractTimeSeconds = totalContractTime / 1000;
      const throughput = totalRecords / totalTimeSeconds;

      console.log(`  📦 Large Batch Throughput:`);
      console.log(`     Batches: ${batchCount}`);
      console.log(`     Records per batch: ${recordsPerBatch}`);
      console.log(`     Total records: ${totalRecords}`);
      console.log(`     Total Time: ${totalTimeSeconds.toFixed(2)}s`);
      console.log(`     Client Time: ${clientTimeSeconds.toFixed(2)}s (${((clientTimeSeconds/totalTimeSeconds)*100).toFixed(1)}%)`);
      console.log(`     Contract Time: ${contractTimeSeconds.toFixed(2)}s (${((contractTimeSeconds/totalTimeSeconds)*100).toFixed(1)}%)`);
      console.log(`     Throughput: ${throughput.toFixed(2)} records/second`);
      console.log(`     Efficiency gain: ${(throughput / throughputResults.batch_small_throughput.throughput).toFixed(2)}x vs small batches`);

      // Calculate statistics
      const contractStats = calculateStatistics(contractTimes);
      const clientStats = calculateStatistics(clientTimes);
      const contractPDF = calculateProbabilityDensity(contractTimes, 15);
      const clientPDF = calculateProbabilityDensity(clientTimes, 15);

      throughputResults["batch_large_throughput"] = {
        batches: batchCount,
        recordsPerBatch: recordsPerBatch,
        totalRecords: totalRecords,
        totalTime: totalTimeSeconds,
        clientTime: clientTimeSeconds,
        contractTime: contractTimeSeconds,
        clientPercentage: ((clientTimeSeconds/totalTimeSeconds)*100).toFixed(1) + "%",
        contractPercentage: ((contractTimeSeconds/totalTimeSeconds)*100).toFixed(1) + "%",
        throughput: throughput,
        statistics: {
          contract: contractStats,
          client: clientStats
        },
        probabilityDensity: {
          contract: contractPDF,
          client: clientPDF
        }
      };

      expect(throughput).to.be.greaterThan(throughputResults.batch_small_throughput.throughput);
    });
  });

  describe("Read Throughput", function () {
    before(async function () {
      // Setup: Store 100 proofs
      for (let i = 0; i < 100; i++) {
        const tx = await predictiveMaintenance.storeProof(
          `MACHINE_READ_${i}`,
          ethers.id(`root_read_${i}`),
          false
        );
        await tx.wait();
      }
    });

    it("Should measure read operations per second", async function () {
      const readCount = 1000;
      let totalClientTime = 0;
      const clientTimes = [];
      const startTime = performance.now();

      // Perform rapid reads
      for (let i = 0; i < readCount; i++) {
        const machineId = `MACHINE_READ_${i % 100}`;
        const clientStart = performance.now();
        await predictiveMaintenance.machineLedger(machineId, 0);
        const clientEnd = performance.now();
        const clientTime = (clientEnd - clientStart) / 1000;
        totalClientTime += (clientEnd - clientStart);
        clientTimes.push(clientTime);
      }

      const endTime = performance.now();
      const totalTimeSeconds = (endTime - startTime) / 1000;
      const clientTimeSeconds = totalClientTime / 1000;
      const readsPerSecond = readCount / totalTimeSeconds;

      // Calculate statistics
      const clientStats = calculateStatistics(clientTimes);
      const clientPDF = calculateProbabilityDensity(clientTimes, 20);

      console.log(`  📖 Read Throughput:`);
      console.log(`     Read operations: ${readCount}`);
      console.log(`     Total Time: ${totalTimeSeconds.toFixed(2)}s`);
      console.log(`     Client Time: ${clientTimeSeconds.toFixed(2)}s (${((clientTimeSeconds/totalTimeSeconds)*100).toFixed(1)}%)`);
      console.log(`     Reads/second: ${readsPerSecond.toFixed(2)}`);

      throughputResults["read_throughput"] = {
        operations: readCount,
        totalTime: totalTimeSeconds,
        clientTime: clientTimeSeconds,
        clientPercentage: ((clientTimeSeconds/totalTimeSeconds)*100).toFixed(1) + "%",
        readsPerSecond: readsPerSecond,
        statistics: {
          client: clientStats
        },
        probabilityDensity: {
          client: clientPDF
        }
      };

      expect(readsPerSecond).to.be.greaterThan(10); // Should be faster than writes (local node: ~30-50 reads/sec)
    });
  });

  describe("Mixed Workload Throughput", function () {
    it("Should measure throughput for mixed read/write operations", async function () {
      const totalOps = 100;
      const writeRatio = 0.3; // 30% writes, 70% reads
      const writes = Math.floor(totalOps * writeRatio);
      const reads = totalOps - writes;
      let totalClientTime = 0;
      let totalContractTime = 0;
      const contractTimes = [];
      const clientTimes = [];

      const startTime = performance.now();

      let writeCount = 0;
      let readCount = 0;

      for (let i = 0; i < totalOps; i++) {
        if (Math.random() < writeRatio && writeCount < writes) {
          // Write operation
          const clientStart = performance.now();
          const tx = await predictiveMaintenance.storeProof(
            `MACHINE_MIXED_${writeCount}`,
            ethers.id(`root_mixed_${writeCount}`),
            false
          );
          const clientEnd = performance.now();
          const clientTime = (clientEnd - clientStart) / 1000;
          totalClientTime += (clientEnd - clientStart);
          clientTimes.push(clientTime);

          const contractStart = performance.now();
          await tx.wait();
          const contractEnd = performance.now();
          const contractTime = (contractEnd - contractStart) / 1000;
          totalContractTime += (contractEnd - contractStart);
          contractTimes.push(contractTime);
          writeCount++;
        } else if (readCount < reads) {
          // Read operation
          const clientStart = performance.now();
          await predictiveMaintenance.machineLedger(`MACHINE_READ_0`, 0);
          const clientEnd = performance.now();
          const clientTime = (clientEnd - clientStart) / 1000;
          totalClientTime += (clientEnd - clientStart);
          clientTimes.push(clientTime);
          readCount++;
        }
      }

      const endTime = performance.now();
      const totalTimeSeconds = (endTime - startTime) / 1000;
      const clientTimeSeconds = totalClientTime / 1000;
      const contractTimeSeconds = totalContractTime / 1000;
      const opsPerSecond = totalOps / totalTimeSeconds;

      // Calculate statistics (only for writes since reads dominate)
      const contractStats = contractTimes.length > 0 ? calculateStatistics(contractTimes) : null;
      const clientStats = calculateStatistics(clientTimes);
      const contractPDF = contractTimes.length > 0 ? calculateProbabilityDensity(contractTimes, 15) : null;
      const clientPDF = calculateProbabilityDensity(clientTimes, 20);

      console.log(`  🔀 Mixed Workload Throughput:`);
      console.log(`     Total operations: ${totalOps}`);
      console.log(`     Writes: ${writeCount} (${(writeRatio * 100).toFixed(0)}%)`);
      console.log(`     Reads: ${readCount} (${((1 - writeRatio) * 100).toFixed(0)}%)`);
      console.log(`     Total Time: ${totalTimeSeconds.toFixed(2)}s`);
      console.log(`     Client Time: ${clientTimeSeconds.toFixed(2)}s (${((clientTimeSeconds/totalTimeSeconds)*100).toFixed(1)}%)`);
      console.log(`     Contract Time: ${contractTimeSeconds.toFixed(2)}s (${((contractTimeSeconds/totalTimeSeconds)*100).toFixed(1)}%)`);
      console.log(`     Ops/second: ${opsPerSecond.toFixed(2)}`);

      const result = {
        totalOperations: totalOps,
        writes: writeCount,
        reads: readCount,
        writeRatio: writeRatio,
        totalTime: totalTimeSeconds,
        clientTime: clientTimeSeconds,
        contractTime: contractTimeSeconds,
        clientPercentage: ((clientTimeSeconds/totalTimeSeconds)*100).toFixed(1) + "%",
        contractPercentage: ((contractTimeSeconds/totalTimeSeconds)*100).toFixed(1) + "%",
        opsPerSecond: opsPerSecond,
        statistics: {
          client: clientStats
        },
        probabilityDensity: {
          client: clientPDF
        }
      };

      if (contractStats && contractPDF) {
        result.statistics.contract = contractStats;
        result.probabilityDensity.contract = contractPDF;
      }

      throughputResults["mixed_workload"] = result;

      expect(opsPerSecond).to.be.greaterThan(0);
    });
  });

  describe("Platform Limits", function () {
    it("Should identify maximum concurrent transactions", async function () {
      const maxConcurrent = 100;
      const startTime = performance.now();
      const contractTimes = [];

      // Measure client-side preparation time
      const clientStart = performance.now();
      const txPromises = Array(maxConcurrent).fill(0).map((_, i) => 
        predictiveMaintenance.storeProof(
          `MACHINE_MAX_${i}`,
          ethers.id(`root_max_${i}`),
          false
        )
      );

      const txs = await Promise.allSettled(txPromises);
      const clientEnd = performance.now();
      const clientTimeSeconds = (clientEnd - clientStart) / 1000;

      // Measure contract execution time for each transaction
      const contractStart = performance.now();
      const waitPromises = txs
        .filter(r => r.status === 'fulfilled')
        .map(r => {
          const txStart = performance.now();
          return r.value.wait().then(() => {
            const txEnd = performance.now();
            contractTimes.push((txEnd - txStart) / 1000);
          });
        });
      const results = await Promise.allSettled(waitPromises);
      const contractEnd = performance.now();
      const contractTimeSeconds = (contractEnd - contractStart) / 1000;

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = maxConcurrent - successful;

      const endTime = performance.now();
      const totalTimeSeconds = (endTime - startTime) / 1000;
      const tps = successful / totalTimeSeconds;

      // Calculate statistics
      const contractStats = calculateStatistics(contractTimes);
      const contractPDF = calculateProbabilityDensity(contractTimes, 20);

      console.log(`  🎯 Maximum Concurrent Load:`);
      console.log(`     Attempted: ${maxConcurrent}`);
      console.log(`     Successful: ${successful}`);
      console.log(`     Failed: ${failed}`);
      console.log(`     Total Time: ${totalTimeSeconds.toFixed(2)}s`);
      console.log(`     Client Time: ${clientTimeSeconds.toFixed(2)}s (${((clientTimeSeconds/totalTimeSeconds)*100).toFixed(1)}%)`);
      console.log(`     Contract Time: ${contractTimeSeconds.toFixed(2)}s (${((contractTimeSeconds/totalTimeSeconds)*100).toFixed(1)}%)`);
      console.log(`     Peak TPS: ${tps.toFixed(2)}`);
      console.log(`     Contract Time - Mean: ${contractStats.mean}s, StdDev: ${contractStats.stdDev}s, P95: ${contractStats.p95}s`);

      throughputResults["max_concurrent"] = {
        attempted: maxConcurrent,
        successful: successful,
        failed: failed,
        totalTime: totalTimeSeconds,
        clientTime: clientTimeSeconds,
        contractTime: contractTimeSeconds,
        clientPercentage: ((clientTimeSeconds/totalTimeSeconds)*100).toFixed(1) + "%",
        contractPercentage: ((contractTimeSeconds/totalTimeSeconds)*100).toFixed(1) + "%",
        peakTPS: tps,
        successRate: (successful / maxConcurrent * 100).toFixed(2) + "%",
        statistics: {
          contract: contractStats
        },
        probabilityDensity: {
          contract: contractPDF
        }
      };

      expect(successful).to.be.greaterThan(maxConcurrent * 0.9); // At least 90% success
    });
  });
});
