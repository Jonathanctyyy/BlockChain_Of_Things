import { expect } from "chai";
import { ethers } from "ethers";
import { readFileSync, writeFileSync } from "fs";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

/**
 * Gas Efficiency Testing Suite
 * Measures and compares gas costs for different operations
 */
describe("Gas Efficiency Tests", function () {
  let provider;
  let signer;
  let predictiveMaintenance;
  let predictiveMaintenanceMultiRecord;
  const gasResults = {};

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

    console.log("\n📊 GAS EFFICIENCY ANALYSIS\n");
  });

  after(function () {
    // Save gas report to file
    const report = {
      timestamp: new Date().toISOString(),
      results: gasResults,
      summary: {
        totalTests: Object.keys(gasResults).length,
        averageGas: Object.values(gasResults).reduce((sum, val) => sum + val.gasUsed, 0) / Object.keys(gasResults).length
      }
    };

    writeFileSync("gas-report.json", JSON.stringify(report, null, 2));
    
    console.log("\n📋 GAS SUMMARY");
    console.log("=" .repeat(80));
    Object.entries(gasResults).forEach(([test, data]) => {
      const costInEth = ethers.formatEther(data.gasCost);
      console.log(`${test.padEnd(50)} ${data.gasUsed.toLocaleString().padStart(10)} gas  | ${costInEth} ETH`);
    });
    console.log("=" .repeat(80));
    console.log(`\n✅ Gas report saved to: gas-report.json\n`);
  });

  async function trackGas(testName, tx) {
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed;
    const gasPrice = tx.gasPrice || (await provider.getFeeData()).gasPrice;
    const gasCost = gasUsed * gasPrice;

    gasResults[testName] = {
      gasUsed: Number(gasUsed),
      gasPrice: Number(gasPrice),
      gasCost: Number(gasCost),
      gasCostEth: ethers.formatEther(gasCost)
    };

    return { gasUsed, gasCost };
  }

  describe("Single Record (Off-chain Detection)", function () {
    it("Should measure gas for storeProof without anomaly", async function () {
      const machineID = "MACHINE_001";
      const merkleRoot = ethers.id("test_root");
      const hasAnomaly = false;

      const tx = await predictiveMaintenance.storeProof(machineID, merkleRoot, hasAnomaly);
      const { gasUsed } = await trackGas("storeProof_no_anomaly", tx);

      console.log(`  ⛽ Gas used: ${gasUsed.toLocaleString()}`);
      expect(gasUsed).to.be.lessThan(100000n);
    });

    it("Should measure gas for storeProof with anomaly", async function () {
      const machineID = "MACHINE_002";
      const merkleRoot = ethers.id("test_root_anomaly");
      const hasAnomaly = true;

      const tx = await predictiveMaintenance.storeProof(machineID, merkleRoot, hasAnomaly);
      const { gasUsed } = await trackGas("storeProof_with_anomaly", tx);

      console.log(`  ⛽ Gas used: ${gasUsed.toLocaleString()}`);
      expect(gasUsed).to.be.lessThan(150000n);
    });

    it("Should measure gas for Merkle proof verification", async function () {
      const machineID = "MACHINE_003";
      
      // Create Merkle tree
      const data = ["reading1", "reading2", "reading3", "reading4"];
      const leaves = data.map(x => keccak256(x));
      const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
      const root = tree.getRoot();
      
      // Store proof
      await predictiveMaintenance.storeProof(machineID, `0x${root.toString('hex')}`, false);
      
      // Verify proof
      const leaf = leaves[0];
      const proof = tree.getProof(leaf).map(x => `0x${x.data.toString('hex')}`);
      const positions = tree.getProof(leaf).map(x => x.position === 'right' ? 1 : 0);
      
      const tx = await predictiveMaintenance.verifyAndLog(
        machineID, 
        0, 
        `0x${leaf.toString('hex')}`, 
        proof, 
        positions
      );
      const { gasUsed } = await trackGas("merkle_proof_verification", tx);

      console.log(`  ⛽ Gas used: ${gasUsed.toLocaleString()}`);
      expect(gasUsed).to.be.lessThan(200000n);
    });
  });

  describe("Multi-Record (On-chain Detection)", function () {
    let machineCounter = 1;

    it("Should measure gas for 10 records", async function () {
      const machineID = machineCounter++;
      
      // Register machine
      await predictiveMaintenanceMultiRecord.registerMachine(machineID, signer.address);

      const readings = Array(10).fill(0).map((_, i) => ({
        vibration: 40,
        volt: 170,
        pressure: 100,
        rotation: 450
      }));

      const tx = await predictiveMaintenanceMultiRecord.storeProofWithMultiRecordCheck(
        machineID,
        ethers.id("root_10"),
        readings
      );
      const { gasUsed } = await trackGas("multirecord_10_readings", tx);

      console.log(`  ⛽ Gas used: ${gasUsed.toLocaleString()} (${Number(gasUsed)/10} per record)`);
    });

    it("Should measure gas for 50 records", async function () {
      const machineID = machineCounter++;
      
      // Register machine
      await predictiveMaintenanceMultiRecord.registerMachine(machineID, signer.address);

      const readings = Array(50).fill(0).map((_, i) => ({
        vibration: 40,
        volt: 170,
        pressure: 100,
        rotation: 450
      }));

      const tx = await predictiveMaintenanceMultiRecord.storeProofWithMultiRecordCheck(
        machineID,
        ethers.id("root_50"),
        readings
      );
      const { gasUsed } = await trackGas("multirecord_50_readings", tx);

      console.log(`  ⛽ Gas used: ${gasUsed.toLocaleString()} (${Number(gasUsed)/50} per record)`);
    });

    it("Should measure gas for 100 records", async function () {
      const machineID = machineCounter++;
      
      // Register machine
      await predictiveMaintenanceMultiRecord.registerMachine(machineID, signer.address);

      const readings = Array(100).fill(0).map((_, i) => ({
        vibration: 40,
        volt: 170,
        pressure: 100,
        rotation: 450
      }));

      const tx = await predictiveMaintenanceMultiRecord.storeProofWithMultiRecordCheck(
        machineID,
        ethers.id("root_100"),
        readings
      );
      const { gasUsed } = await trackGas("multirecord_100_readings", tx);

      console.log(`  ⛽ Gas used: ${gasUsed.toLocaleString()} (${Number(gasUsed)/100} per record)`);
    });

    it("Should demonstrate gas explosion with anomalies", async function () {
      const machineID = machineCounter++;
      
      // Register machine
      await predictiveMaintenanceMultiRecord.registerMachine(machineID, signer.address);

      const readingsWithAnomalies = Array(50).fill(0).map((_, i) => ({
        vibration: i % 3 === 0 ? 60 : 40,  // Every 3rd has high vibration
        volt: i % 5 === 0 ? 200 : 170,      // Every 5th has high voltage
        pressure: 100,
        rotation: 450
      }));

      const tx = await predictiveMaintenanceMultiRecord.storeProofWithMultiRecordCheck(
        machineID,
        ethers.id("root_anomalies"),
        readingsWithAnomalies
      );
      const { gasUsed } = await trackGas("multirecord_50_with_anomalies", tx);

      console.log(`  ⛽ Gas used with anomalies: ${gasUsed.toLocaleString()}`);
      
      // Compare with previous 50-record test
      const normalGas = gasResults["multirecord_50_readings"].gasUsed;
      const increase = ((Number(gasUsed) - normalGas) / normalGas * 100).toFixed(2);
      console.log(`  📈 Gas increase: ${increase}% due to anomaly events`);
    });
  });

  describe("Deployment Costs", function () {
    it("Should report deployment gas costs", async function () {
      // These were already deployed, but let's report their costs
      const pmAddress = await predictiveMaintenance.getAddress();
      const pmrAddress = await predictiveMaintenanceMultiRecord.getAddress();
      
      console.log(`  📦 PredictiveMaintenance deployed at: ${pmAddress}`);
      console.log(`  📦 PredictiveMaintenanceMultiRecord deployed at: ${pmrAddress}`);
    });
  });
});
