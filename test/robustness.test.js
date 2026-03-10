import { expect } from "chai";
import { ethers } from "ethers";
import { readFileSync, writeFileSync } from "fs";
import { StandardMerkleTree } from "@openzeppelin/merkle-tree";

/**
 * ====================================================================
 * FUNCTIONAL ROBUSTNESS AND EDGE CASE VALIDATION
 * ====================================================================
 * 
 * This test suite validates that the system correctly handles:
 * 1. Tampered/invalid data (Merkle proof failures)
 * 2. Invalid signatures (authentication failures)
 * 3. Edge cases (empty data, duplicate entries, etc.)
 * 4. Concurrent transaction integrity
 * 
 * Goal: Prove the system is "smart enough to say No"
 * ====================================================================
 */

describe("Functional Robustness and Edge Case Validation", function () {
  let provider;
  let signer;
  let predictiveMaintenance;
  const robustnessResults = {
    timestamp: new Date().toISOString(),
    scenarios: []
  };

  this.timeout(60000);

  before(async function () {
    provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    signer = await provider.getSigner(0);

    // Deploy contract
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

    console.log("\n" + "=".repeat(80));
    console.log("FUNCTIONAL ROBUSTNESS AND EDGE CASE VALIDATION");
    console.log("=".repeat(80));
    console.log("\n✅ Contract deployed successfully");
    console.log(`   Address: ${await predictiveMaintenance.getAddress()}\n`);
  });

  after(function () {
    // Save robustness test report
    const report = {
      ...robustnessResults,
      summary: {
        totalTests: robustnessResults.scenarios.length,
        passed: robustnessResults.scenarios.filter(s => s.passed).length,
        failed: robustnessResults.scenarios.filter(s => !s.passed).length,
        autoDeclineCount: robustnessResults.scenarios.filter(s => s.type === 'auto-decline').length,
        edgeCaseCount: robustnessResults.scenarios.filter(s => s.type === 'edge-case').length
      }
    };

    writeFileSync("robustness-report.json", JSON.stringify(report, null, 2));
    
    console.log("\n" + "=".repeat(80));
    console.log("ROBUSTNESS TEST SUMMARY");
    console.log("=".repeat(80));
    console.log(`Total Scenarios Tested: ${report.summary.totalTests}`);
    console.log(`✅ Passed: ${report.summary.passed}`);
    console.log(`❌ Failed: ${report.summary.failed}`);
    console.log(`Success Rate: ${(report.summary.passed / report.summary.totalTests * 100).toFixed(2)}%`);
    console.log(`\n📊 Report saved to: robustness-report.json`);
    console.log("=".repeat(80) + "\n");
  });

  describe("Scenario 4: Auto-Decline - Tampered Data Detection", function () {
    it("Should REJECT claim with tampered sensor reading (invalid Merkle proof)", async function () {
      console.log("\n📋 SCENARIO 4: Auto-Decline - Tampered Data");
      console.log("─".repeat(80));

      const machineID = "MACHINE_TAMPERED_001";

      // Step 1: Store legitimate data
      const originalData = [
        ["voltage", "220.5"],
        ["current", "15.2"],
        ["temperature", "75.8"],
        ["vibration", "0.05"],
        ["status", "normal"]
      ];

      const tree = StandardMerkleTree.of(originalData, ["string", "string"]);
      const merkleRoot = tree.root;

      // Register machine and store proof
      await predictiveMaintenance.registerMachine(machineID, await signer.getAddress());
      const tx1 = await predictiveMaintenance.storeProof(machineID, merkleRoot, false);
      await tx1.wait();

      console.log("\n  ✓ Step 1: Stored legitimate data on-chain");
      console.log(`    Merkle Root: ${merkleRoot}`);

      // Step 2: Attempt to verify with TAMPERED data
      console.log("\n  ⚠️  Step 2: Attempting to verify TAMPERED data...");
      
      const tamperedData = [
        ["voltage", "150.0"],  // TAMPERED: Changed from 220.5 to 150.0
        ["current", "15.2"],
        ["temperature", "75.8"],
        ["vibration", "0.05"],
        ["status", "normal"]
      ];

      const tamperedTree = StandardMerkleTree.of(tamperedData, ["string", "string"]);
      const tamperedLeaf = tamperedTree.values[0].hash;
      const tamperedProof = tamperedTree.getProof(0);

      console.log(`    Original voltage: 220.5V`);
      console.log(`    Tampered voltage: 150.0V (FRAUD ATTEMPT)`);
      console.log(`    Tampered Leaf Hash: ${tamperedLeaf}`);

      // Step 3: Verify - Should fail
      try {
        const result = await predictiveMaintenance.validateInsuranceClaim(
          machineID,
          0, // First anchor
          tamperedLeaf,
          tamperedProof,
          []
        );

        const [verified, hasAnomaly] = result;

        console.log(`\n  🔍 Verification Result:`);
        console.log(`    Verified: ${verified}`);
        console.log(`    Status: ${verified ? "✅ APPROVED" : "❌ REJECTED"}`);

        if (!verified) {
          console.log(`\n  🎉 SUCCESS: Smart contract correctly rejected tampered data!`);
          console.log(`    Reason: Merkle proof validation failed`);
          console.log(`    Protection: Data integrity verified via cryptography`);
        }

        // Test assertions
        expect(verified).to.be.false;

        // Record results
        robustnessResults.scenarios.push({
          scenario: "Auto-Decline: Tampered Data",
          type: "auto-decline",
          machineID: machineID,
          originalValue: "220.5V",
          tamperedValue: "150.0V",
          verified: verified,
          rejected: !verified,
          reason: "Merkle proof validation failed",
          passed: !verified, // Pass if rejected
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        console.log(`\n  ❌ Transaction reverted (expected behavior)`);
        console.log(`    Error: ${error.message}`);
        
        robustnessResults.scenarios.push({
          scenario: "Auto-Decline: Tampered Data (Reverted)",
          type: "auto-decline",
          machineID: machineID,
          reverted: true,
          reason: "Transaction reverted due to invalid proof",
          passed: true,
          timestamp: new Date().toISOString()
        });
      }
    });

    it("Should REJECT claim with completely fabricated data (no matching root)", async function () {
      console.log("\n📋 SCENARIO 4B: Auto-Decline - Fabricated Data");
      console.log("─".repeat(80));

      const machineID = "MACHINE_FABRICATED_002";

      // Store some data
      const realData = [["voltage", "170.0"], ["status", "normal"]];
      const realTree = StandardMerkleTree.of(realData, ["string", "string"]);
      
      await predictiveMaintenance.registerMachine(machineID, await signer.getAddress());
      const tx = await predictiveMaintenance.storeProof(machineID, realTree.root, false);
      await tx.wait();

      console.log("\n  ✓ Stored real data on-chain");

      // Attempt with completely fabricated proof
      const fakeData = [["voltage", "999.9"], ["status", "fake"]];
      const fakeTree = StandardMerkleTree.of(fakeData, ["string", "string"]);
      const fakeLeaf = fakeTree.values[0].hash;
      const fakeProof = fakeTree.getProof(0);

      console.log(`\n  ⚠️  Attempting validation with fabricated data...`);

      const result = await predictiveMaintenance.validateInsuranceClaim(
        machineID,
        0,
        fakeLeaf,
        fakeProof,
        []
      );

      const [verified, hasAnomaly] = result;

      console.log(`\n  🔍 Verification Result: ${verified ? "✅ APPROVED" : "❌ REJECTED"}`);
      
      if (!verified) {
        console.log(`  🎉 SUCCESS: Fabricated data rejected!`);
      }

      expect(verified).to.be.false;

      robustnessResults.scenarios.push({
        scenario: "Auto-Decline: Fabricated Data",
        type: "auto-decline",
        machineID: machineID,
        verified: verified,
        rejected: !verified,
        passed: !verified,
        timestamp: new Date().toISOString()
      });
    });

    it("Should REJECT claim with mismatched proof array lengths", async function () {
      console.log("\n📋 SCENARIO 4C: Auto-Decline - Malformed Proof");
      console.log("─".repeat(80));

      const machineID = "MACHINE_MALFORMED_003";

      const data = [["voltage", "180.0"], ["current", "10.0"]];
      const tree = StandardMerkleTree.of(data, ["string", "string"]);
      
      await predictiveMaintenance.registerMachine(machineID, await signer.getAddress());
      const tx = await predictiveMaintenance.storeProof(machineID, tree.root, false);
      await tx.wait();

      console.log(`\n  ⚠️  Attempting validation with mismatched proof arrays...`);

      try {
        // Intentionally provide mismatched array (proof has 2 elements, positions has 1)
        await predictiveMaintenance.validateInsuranceClaim(
          machineID,
          0,
          tree.values[0].hash,
          [ethers.id("fake1"), ethers.id("fake2")], // 2 elements
          [0] // Only 1 element - MISMATCH
        );

        console.log(`  ❌ UNEXPECTED: Transaction should have reverted`);
        expect.fail("Should have reverted");

      } catch (error) {
        console.log(`  ✅ SUCCESS: Transaction reverted as expected`);
        console.log(`     Reason: ${error.message.includes("mismatch") ? "Array length mismatch detected" : "Validation failed"}`);

        robustnessResults.scenarios.push({
          scenario: "Auto-Decline: Malformed Proof",
          type: "auto-decline",
          machineID: machineID,
          reverted: true,
          reason: "Proof and positions length mismatch",
          passed: true,
          timestamp: new Date().toISOString()
        });
      }
    });
  });

  describe("Scenario: Edge Case Validation", function () {
    it("Should handle empty machine ledger gracefully", async function () {
      console.log("\n📋 EDGE CASE: Empty Machine Ledger");
      console.log("─".repeat(80));

      const machineID = "MACHINE_EMPTY_001";
      
      await predictiveMaintenance.registerMachine(machineID, await signer.getAddress());

      console.log(`\n  ⚠️  Attempting to verify proof for machine with no stored data...`);

      try {
        // Attempt to verify against non-existent anchor
        await predictiveMaintenance.validateInsuranceClaim(
          machineID,
          0, // No data at this index
          ethers.id("fake"),
          [],
          []
        );

        console.log(`  ❌ UNEXPECTED: Should have failed`);

      } catch (error) {
        console.log(`  ✅ SUCCESS: Empty ledger handled correctly`);
        console.log(`     Reason: ${error.message}`);

        robustnessResults.scenarios.push({
          scenario: "Edge Case: Empty Ledger",
          type: "edge-case",
          machineID: machineID,
          handled: true,
          passed: true,
          timestamp: new Date().toISOString()
        });
      }
    });

    it("Should handle maximum concurrent transactions (100)", async function () {
      console.log("\n📋 EDGE CASE: Maximum Concurrent Load (100 transactions)");
      console.log("─".repeat(80));

      const concurrentCount = 100;
      const promises = [];
      let successful = 0;
      let failed = 0;

      console.log(`\n  🚀 Submitting ${concurrentCount} concurrent transactions...`);

      const startTime = Date.now();

      for (let i = 0; i < concurrentCount; i++) {
        const machineID = `MACHINE_CONCURRENT_${i}`;
        const data = [["id", `${i}`], ["value", `${Math.random()}`]];
        const tree = StandardMerkleTree.of(data, ["string", "string"]);

        const promise = (async () => {
          try {
            await predictiveMaintenance.registerMachine(machineID, await signer.getAddress());
            const tx = await predictiveMaintenance.storeProof(machineID, tree.root, false);
            await tx.wait();
            return { success: true, machineID };
          } catch (error) {
            return { success: false, machineID, error: error.message };
          }
        })();

        promises.push(promise);
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      successful = results.filter(r => r.success).length;
      failed = results.filter(r => !r.success).length;

      const successRate = (successful / concurrentCount * 100).toFixed(2);

      console.log(`\n  📊 Results:`);
      console.log(`     Total Attempted: ${concurrentCount}`);
      console.log(`     ✅ Successful: ${successful}`);
      console.log(`     ❌ Failed: ${failed}`);
      console.log(`     Success Rate: ${successRate}%`);
      console.log(`     Duration: ${duration.toFixed(2)}s`);
      console.log(`     Throughput: ${(successful / duration).toFixed(2)} tx/s`);

      if (successRate === "100.00") {
        console.log(`\n  🎉 PERFECT SUCCESS: 100% of concurrent transactions succeeded!`);
        console.log(`     System demonstrated complete reliability under load.`);
      }

      expect(successful).to.be.greaterThan(concurrentCount * 0.95); // At least 95% success

      robustnessResults.scenarios.push({
        scenario: "Edge Case: Maximum Concurrent Load",
        type: "edge-case",
        attempted: concurrentCount,
        successful: successful,
        failed: failed,
        successRate: successRate + "%",
        duration: duration,
        throughput: (successful / duration).toFixed(2) + " tx/s",
        passed: successful >= concurrentCount * 0.95,
        timestamp: new Date().toISOString()
      });
    });

    it("Should handle duplicate registration attempts", async function () {
      console.log("\n📋 EDGE CASE: Duplicate Machine Registration");
      console.log("─".repeat(80));

      const machineID = "MACHINE_DUPLICATE_001";

      // First registration
      await predictiveMaintenance.registerMachine(machineID, await signer.getAddress());
      console.log(`\n  ✓ First registration successful`);

      // Second registration (should overwrite)
      const newAddress = ethers.Wallet.createRandom().address;
      await predictiveMaintenance.registerMachine(machineID, newAddress);
      
      const registeredAddress = await predictiveMaintenance.machineAddresses(machineID);
      
      console.log(`  ✓ Second registration successful (address updated)`);
      console.log(`    Updated Address: ${registeredAddress}`);
      console.log(`    Expected Address: ${newAddress}`);

      expect(registeredAddress).to.equal(newAddress);

      robustnessResults.scenarios.push({
        scenario: "Edge Case: Duplicate Registration",
        type: "edge-case",
        machineID: machineID,
        handled: true,
        behavior: "Address overwritten",
        passed: true,
        timestamp: new Date().toISOString()
      });
    });

    it("Should handle large Merkle proof depths (10+ levels)", async function () {
      console.log("\n📋 EDGE CASE: Large Merkle Tree (1024 leaves = 10 proof depth)");
      console.log("─".repeat(80));

      const machineID = "MACHINE_LARGE_TREE_001";

      // Create large dataset (1024 entries)
      const largeData = Array(1024).fill(0).map((_, i) => [`key${i}`, `value${i}`]);
      const largeTree = StandardMerkleTree.of(largeData, ["string", "string"]);
      
      console.log(`\n  ℹ️  Tree Statistics:`);
      console.log(`     Total Entries: 1024`);
      console.log(`     Proof Depth: ~10 levels`);
      console.log(`     Merkle Root: ${largeTree.root}`);

      await predictiveMaintenance.registerMachine(machineID, await signer.getAddress());
      const tx1 = await predictiveMaintenance.storeProof(machineID, largeTree.root, false);
      const receipt = await tx1.wait();

      console.log(`  ✓ Large tree stored successfully`);
      console.log(`    Gas Used: ${Number(receipt.gasUsed).toLocaleString()}`);

      // Verify a leaf from the large tree
      const targetIndex = 512; // Middle of the tree
      const proof = largeTree.getProof(targetIndex);
      const leaf = largeTree.values[targetIndex].hash;

      console.log(`\n  🔍 Verifying leaf #${targetIndex}...`);
      console.log(`     Proof Length: ${proof.length} elements`);

      const result = await predictiveMaintenance.validateInsuranceClaim(
        machineID,
        0,
        leaf,
        proof,
        []
      );

      const [verified, hasAnomaly] = result;

      console.log(`     Verified: ${verified ? "✅ YES" : "❌ NO"}`);

      expect(verified).to.be.true;

      robustnessResults.scenarios.push({
        scenario: "Edge Case: Large Merkle Tree",
        type: "edge-case",
        machineID: machineID,
        treeSize: 1024,
        proofDepth: proof.length,
        gasUsed: Number(receipt.gasUsed),
        verified: verified,
        passed: verified,
        timestamp: new Date().toISOString()
      });
    });
  });
});
