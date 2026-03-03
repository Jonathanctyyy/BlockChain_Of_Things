import { expect } from "chai";
import { ethers } from "ethers";
import { readFileSync, writeFileSync } from "fs";
import { performance } from "perf_hooks";

/**
 * System Latency Testing Suite
 * Measures end-to-end performance for blockchain operations
 */
describe("System Latency Tests", function () {
  let provider;
  let signer;
  let predictiveMaintenance;
  const latencyResults = [];

  before(async function () {
    provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    signer = await provider.getSigner(0);

    // Deploy contract
    const artifact = JSON.parse(
      readFileSync(
        "./artifacts/contracts/PredictiveMaintenance.sol/PredictiveMaintenance.json",
        "utf8"
      )
    );
    const Factory = new ethers.ContractFactory(
      artifact.abi,
      artifact.bytecode,
      signer
    );
    predictiveMaintenance = await Factory.deploy();
    await predictiveMaintenance.waitForDeployment();

    console.log("\n⏱️  SYSTEM LATENCY ANALYSIS\n");
  });

  after(function () {
    // Calculate statistics
    const latencies = latencyResults.map(r => r.totalLatency);
    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const min = Math.min(...latencies);
    const max = Math.max(...latencies);
    const median = latencies.sort((a, b) => a - b)[Math.floor(latencies.length / 2)];

    const report = {
      timestamp: new Date().toISOString(),
      results: latencyResults,
      statistics: {
        average: avg,
        median: median,
        min: min,
        max: max,
        standardDeviation: Math.sqrt(
          latencies.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / latencies.length
        )
      }
    };

    writeFileSync("latency-report.json", JSON.stringify(report, null, 2));

    console.log("\n📊 LATENCY SUMMARY");
    console.log("=" .repeat(80));
    console.log(`Average Latency:    ${avg.toFixed(2)} ms`);
    console.log(`Median Latency:     ${median.toFixed(2)} ms`);
    console.log(`Min Latency:        ${min.toFixed(2)} ms`);
    console.log(`Max Latency:        ${max.toFixed(2)} ms`);
    console.log(`Std Deviation:      ${report.statistics.standardDeviation.toFixed(2)} ms`);
    console.log("=" .repeat(80));
    console.log(`\n✅ Latency report saved to: latency-report.json\n`);
  });

  /**
   * Measure latency for a blockchain operation
   */
  async function measureLatency(testName, operation) {
    const startTime = performance.now();
    
    // Start transaction timing
    const txStartTime = performance.now();
    const tx = await operation();
    const txSentTime = performance.now();
    
    // Wait for confirmation
    const confirmStartTime = performance.now();
    const receipt = await tx.wait();
    const confirmEndTime = performance.now();
    
    const endTime = performance.now();

    const result = {
      test: testName,
      totalLatency: endTime - startTime,
      transactionCreation: txSentTime - txStartTime,
      networkPropagation: confirmStartTime - txSentTime,
      blockConfirmation: confirmEndTime - confirmStartTime,
      blockNumber: receipt.blockNumber,
      gasUsed: Number(receipt.gasUsed),
      timestamp: new Date().toISOString()
    };

    latencyResults.push(result);

    console.log(`  ⏱️  ${testName}`);
    console.log(`     Total: ${result.totalLatency.toFixed(2)}ms | ` +
                `TX Create: ${result.transactionCreation.toFixed(2)}ms | ` +
                `Network: ${result.networkPropagation.toFixed(2)}ms | ` +
                `Confirm: ${result.blockConfirmation.toFixed(2)}ms`);

    return result;
  }

  describe("Transaction Latency", function () {
    it("Should measure storeProof latency", async function () {
      const result = await measureLatency(
        "storeProof",
        () => predictiveMaintenance.storeProof(
          "MACHINE_001",
          ethers.id("root1"),
          false
        )
      );

      expect(result.totalLatency).to.be.lessThan(5000); // Should be < 5 seconds
    });

    it("Should measure storeProof with anomaly latency", async function () {
      const result = await measureLatency(
        "storeProof_with_anomaly",
        () => predictiveMaintenance.storeProof(
          "MACHINE_002",
          ethers.id("root2"),
          true
        )
      );

      expect(result.totalLatency).to.be.lessThan(5000);
    });

    it("Should measure registerMachine latency", async function () {
      const result = await measureLatency(
        "registerMachine",
        () => predictiveMaintenance.registerMachine(
          "MACHINE_003",
          signer.address
        )
      );

      expect(result.totalLatency).to.be.lessThan(5000);
    });
  });

  describe("Read Operation Latency", function () {
    before(async function () {
      // Setup: Store some data
      const tx = await predictiveMaintenance.storeProof(
        "MACHINE_READ_TEST",
        ethers.id("root_for_read"),
        false
      );
      await tx.wait();
    });

    it("Should measure read latency for machineLedger", async function () {
      const startTime = performance.now();
      const anchor = await predictiveMaintenance.machineLedger("MACHINE_READ_TEST", 0);
      const endTime = performance.now();

      const latency = endTime - startTime;
      console.log(`  📖 Read latency: ${latency.toFixed(2)}ms`);

      latencyResults.push({
        test: "read_machineLedger",
        totalLatency: latency,
        operationType: "read",
        timestamp: new Date().toISOString()
      });

      expect(latency).to.be.lessThan(1000); // Reads should be very fast
    });

    it("Should measure read latency for machineAddresses", async function () {
      const startTime = performance.now();
      const address = await predictiveMaintenance.machineAddresses("MACHINE_READ_TEST");
      const endTime = performance.now();

      const latency = endTime - startTime;
      console.log(`  📖 Read latency: ${latency.toFixed(2)}ms`);

      latencyResults.push({
        test: "read_machineAddresses",
        totalLatency: latency,
        operationType: "read",
        timestamp: new Date().toISOString()
      });

      expect(latency).to.be.lessThan(1000);
    });
  });

  describe("Sequential vs Parallel Operations", function () {
    it("Should measure sequential operations latency", async function () {
      const startTime = performance.now();

      for (let i = 0; i < 5; i++) {
        const tx = await predictiveMaintenance.storeProof(
          `MACHINE_SEQ_${i}`,
          ethers.id(`root_seq_${i}`),
          false
        );
        await tx.wait();
      }

      const endTime = performance.now();
      const totalLatency = endTime - startTime;

      console.log(`  🔄 Sequential (5 ops): ${totalLatency.toFixed(2)}ms (avg: ${(totalLatency/5).toFixed(2)}ms per op)`);

      latencyResults.push({
        test: "sequential_5_operations",
        totalLatency: totalLatency,
        averagePerOperation: totalLatency / 5,
        operationType: "sequential",
        timestamp: new Date().toISOString()
      });

      expect(totalLatency).to.be.lessThan(25000); // 5 ops should be < 25 seconds
    });

    it("Should measure parallel operations latency", async function () {
      const startTime = performance.now();

      // Send all transactions in parallel
      const txPromises = [];
      for (let i = 0; i < 5; i++) {
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

      // Wait for all confirmations
      await Promise.all(txs.map(tx => tx.wait()));

      const endTime = performance.now();
      const totalLatency = endTime - startTime;

      console.log(`  ⚡ Parallel (5 ops): ${totalLatency.toFixed(2)}ms`);

      latencyResults.push({
        test: "parallel_5_operations",
        totalLatency: totalLatency,
        operationType: "parallel",
        timestamp: new Date().toISOString()
      });

      // Parallel should be faster than sequential
      const seqResult = latencyResults.find(r => r.test === "sequential_5_operations");
      if (seqResult) {
        const improvement = ((seqResult.totalLatency - totalLatency) / seqResult.totalLatency * 100).toFixed(2);
        console.log(`  📈 Performance improvement: ${improvement}% faster than sequential`);
      }
    });
  });

  describe("Network Conditions", function () {
    it("Should measure latency under load (burst transactions)", async function () {
      const burstSize = 10;
      const startTime = performance.now();

      // Send burst of transactions
      const promises = Array(burstSize).fill(0).map(async (_, i) => {
        const tx = await predictiveMaintenance.storeProof(
          `MACHINE_BURST_${i}`,
          ethers.id(`root_burst_${i}`),
          i % 3 === 0 // Every 3rd has anomaly
        );
        return tx.wait();
      });

      await Promise.all(promises);

      const endTime = performance.now();
      const totalLatency = endTime - startTime;

      console.log(`  💥 Burst (${burstSize} ops): ${totalLatency.toFixed(2)}ms (avg: ${(totalLatency/burstSize).toFixed(2)}ms per op)`);

      latencyResults.push({
        test: `burst_${burstSize}_operations`,
        totalLatency: totalLatency,
        averagePerOperation: totalLatency / burstSize,
        operationType: "burst",
        burstSize: burstSize,
        timestamp: new Date().toISOString()
      });
    });
  });

  describe("End-to-End Workflow Latency", function () {
    it("Should measure complete workflow: register + store + verify", async function () {
      const machineID = "MACHINE_E2E";
      const startTime = performance.now();

      // Step 1: Register machine
      const stepStart1 = performance.now();
      const tx1 = await predictiveMaintenance.registerMachine(machineID, signer.address);
      await tx1.wait();
      const step1Time = performance.now() - stepStart1;

      // Step 2: Store proof
      const stepStart2 = performance.now();
      const tx2 = await predictiveMaintenance.storeProof(
        machineID,
        ethers.id("e2e_root"),
        false
      );
      await tx2.wait();
      const step2Time = performance.now() - stepStart2;

      // Step 3: Read back data
      const stepStart3 = performance.now();
      const anchor = await predictiveMaintenance.machineLedger(machineID, 0);
      const address = await predictiveMaintenance.machineAddresses(machineID);
      const step3Time = performance.now() - stepStart3;

      const totalLatency = performance.now() - startTime;

      console.log(`  🔄 End-to-End Workflow:`);
      console.log(`     Total: ${totalLatency.toFixed(2)}ms`);
      console.log(`     ├─ Register: ${step1Time.toFixed(2)}ms`);
      console.log(`     ├─ Store: ${step2Time.toFixed(2)}ms`);
      console.log(`     └─ Read: ${step3Time.toFixed(2)}ms`);

      latencyResults.push({
        test: "e2e_workflow",
        totalLatency: totalLatency,
        breakdown: {
          register: step1Time,
          store: step2Time,
          read: step3Time
        },
        operationType: "workflow",
        timestamp: new Date().toISOString()
      });

      expect(totalLatency).to.be.lessThan(10000); // Complete workflow < 10 seconds
    });
  });
});
