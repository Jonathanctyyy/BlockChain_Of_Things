import { expect } from "chai";
import { ethers } from "ethers";
import { readFileSync } from "fs";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

describe("PredictiveMaintenance Contract - Mocha/Chai", function () {
  let provider;
  let signer1, signer2, signer3;
  let predictiveMaintenance;
  let PredictiveMaintenanceFactory;

  before(async function () {
    // Connect to Hardhat node
    provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
    
    // Get signers
    const accounts = await provider.listAccounts();
    signer1 = await provider.getSigner(0);
    signer2 = await provider.getSigner(1);
    signer3 = await provider.getSigner(2);

    // Load compiled contract
    const artifact = JSON.parse(
      readFileSync(
        "./artifacts/contracts/PredictiveMaintenance.sol/PredictiveMaintenance.json",
        "utf8"
      )
    );

    // Create contract factory
    PredictiveMaintenanceFactory = new ethers.ContractFactory(
      artifact.abi,
      artifact.bytecode,
      signer1
    );
  });

  beforeEach(async function () {
    // Deploy fresh contract for each test
    predictiveMaintenance = await PredictiveMaintenanceFactory.deploy();
    await predictiveMaintenance.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should deploy successfully", async function () {
      const address = await predictiveMaintenance.getAddress();
      expect(address).to.match(/^0x[a-fA-F0-9]{40}$/);
    });
  });

  describe("Store Proof Functionality", function () {
    it("Should store proof without anomaly", async function () {
      const machineID = "MACHINE_001";
      const merkleRoot = ethers.id("test_root");
      const hasAnomaly = false;

      const tx = await predictiveMaintenance.storeProof(
        machineID,
        merkleRoot,
        hasAnomaly
      );
      await tx.wait();

      const anchor = await predictiveMaintenance.machineLedger(machineID, 0);
      expect(anchor.merkleRoot).to.equal(merkleRoot);
      expect(anchor.hasAnomaly).to.be.false;
    });

    it("Should store proof with anomaly and emit AnomalyDetected event", async function () {
      const machineID = "MACHINE_002";
      const merkleRoot = ethers.id("test_root_anomaly");
      const hasAnomaly = true;

      const tx = await predictiveMaintenance.storeProof(machineID, merkleRoot, hasAnomaly);
      const receipt = await tx.wait();
      
      // Check events manually
      const anomalyEvent = receipt.logs.find(log => {
        try {
          const parsed = predictiveMaintenance.interface.parseLog(log);
          return parsed && parsed.name === "AnomalyDetected";
        } catch (e) {
          return false;
        }
      });
      
      expect(anomalyEvent).to.exist;
      const parsed = predictiveMaintenance.interface.parseLog(anomalyEvent);
      // Indexed strings are hashed in events - compare the hash value
      const expectedHash = ethers.id(machineID);
      expect(parsed.args.machineID.hash || parsed.args.machineID).to.equal(expectedHash);
      // Check non-indexed fields directly (parameter is called 'message' in the event)
      expect(parsed.args.message).to.equal("CRITICAL: Sensor anomaly found in batch. Check off-chain data.");
    });

    it("Should store multiple proofs for the same machine", async function () {
      const machineID = "MACHINE_003";
      const merkleRoot1 = ethers.id("root1");
      const merkleRoot2 = ethers.id("root2");

      await predictiveMaintenance.storeProof(machineID, merkleRoot1, false);
      await predictiveMaintenance.storeProof(machineID, merkleRoot2, true);

      const anchor0 = await predictiveMaintenance.machineLedger(machineID, 0);
      const anchor1 = await predictiveMaintenance.machineLedger(machineID, 1);

      expect(anchor0.merkleRoot).to.equal(merkleRoot1);
      expect(anchor0.hasAnomaly).to.be.false;
      expect(anchor1.merkleRoot).to.equal(merkleRoot2);
      expect(anchor1.hasAnomaly).to.be.true;
    });
  });

  describe("Machine Registration", function () {
    it("Should register a machine address", async function () {
      const machineID = "MACHINE_004";
      const machineAddress = await signer2.getAddress();

      await predictiveMaintenance.registerMachine(machineID, machineAddress);

      const registeredAddress = await predictiveMaintenance.machineAddresses(
        machineID
      );
      expect(registeredAddress).to.equal(machineAddress);
    });

    it("Should allow updating machine address", async function () {
      const machineID = "MACHINE_005";
      const addr1 = await signer2.getAddress();
      const addr2 = await signer3.getAddress();

      await predictiveMaintenance.registerMachine(machineID, addr1);
      await predictiveMaintenance.registerMachine(machineID, addr2);

      const registeredAddress = await predictiveMaintenance.machineAddresses(
        machineID
      );
      expect(registeredAddress).to.equal(addr2);
    });
  });

  describe("Signature Verification", function () {
    it("Should verify valid machine signature", async function () {
      const machineID = "MACHINE_006";
      
      // Create a wallet with a known private key for testing
      const testPrivateKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";
      const testWallet = new ethers.Wallet(testPrivateKey, provider);
      const machineAddress = await testWallet.getAddress();

      await predictiveMaintenance.registerMachine(machineID, machineAddress);

      const dataHash = ethers.id("sensor_data");
      // Use signMessage for EIP-191 Ethereum Signed Message standard
      const signature = await testWallet.signMessage(ethers.getBytes(dataHash));

      const isValid = await predictiveMaintenance.verifySignature(
        machineID,
        dataHash,
        signature
      );

      expect(isValid).to.be.true;
    });

    it("Should reject invalid machine signature", async function () {
      const machineID = "MACHINE_007";
      const machineAddress = await signer2.getAddress();

      await predictiveMaintenance.registerMachine(machineID, machineAddress);

      const dataHash = ethers.id("sensor_data");
      const signature = await signer3.signMessage(ethers.getBytes(dataHash));

      const isValid = await predictiveMaintenance.verifySignature(
        machineID,
        dataHash,
        signature
      );

      expect(isValid).to.be.false;
    });
  });

  describe("Merkle Proof Verification", function () {
    it("Should verify valid Merkle proof", async function () {
      const machineID = "MACHINE_008";

      // Create test data
      const leaves = ["reading1", "reading2", "reading3", "reading4"].map((x) =>
        keccak256(x)
      );

      const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
      const root = tree.getRoot();
      const leaf = leaves[0];
      const proof = tree.getProof(leaf);

      // Store the merkle root
      await predictiveMaintenance.storeProof(
        machineID,
        "0x" + root.toString("hex"),
        false
      );

      // Prepare proof for contract
      const proofHexes = proof.map((p) => "0x" + p.data.toString("hex"));
      const positions = proof.map((p) => (p.position === "right" ? 1 : 0));

      // Verify
      const isValid = await predictiveMaintenance.verifyMerkleProof(
        machineID,
        0,
        "0x" + leaf.toString("hex"),
        proofHexes,
        positions
      );

      expect(isValid).to.be.true;
    });

    it("Should reject invalid Merkle proof", async function () {
      const machineID = "MACHINE_009";
      const merkleRoot = ethers.id("test_root");
      await predictiveMaintenance.storeProof(machineID, merkleRoot, false);

      const fakeLeaf = ethers.id("fake_data");
      const fakeProof = [ethers.id("fake_proof")];
      const positions = [0];

      const isValid = await predictiveMaintenance.verifyMerkleProof(
        machineID,
        0,
        fakeLeaf,
        fakeProof,
        positions
      );

      expect(isValid).to.be.false;
    });

    it("Should revert with mismatched proof and positions length", async function () {
      const machineID = "MACHINE_010";
      const merkleRoot = ethers.id("test_root");
      await predictiveMaintenance.storeProof(machineID, merkleRoot, false);

      const leaf = ethers.id("data");
      const proof = [ethers.id("proof1"), ethers.id("proof2")];
      const positions = [0]; // Only one position for two proofs

      try {
        await predictiveMaintenance.verifyMerkleProof(
          machineID,
          0,
          leaf,
          proof,
          positions
        );
        expect.fail("Should have reverted");
      } catch (error) {
        // Check for revert - error message may vary
        expect(error.message).to.satisfy(msg => 
          msg.includes("Proof and positions length mismatch") || 
          msg.includes("revert") ||
          msg.includes("reverted")
        );
      }
    });
  });

  describe("Insurance Claim Validation", function () {
    it("Should validate claim with valid proof and no anomaly", async function () {
      const machineID = "MACHINE_012";

      const leaves = ["sensor1", "sensor2", "sensor3"].map((x) => keccak256(x));
      const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
      const root = tree.getRoot();
      const leaf = leaves[0];
      const proof = tree.getProof(leaf);

      await predictiveMaintenance.storeProof(
        machineID,
        "0x" + root.toString("hex"),
        false
      );

      const proofHexes = proof.map((p) => "0x" + p.data.toString("hex"));
      const positions = proof.map((p) => (p.position === "right" ? 1 : 0));
      const leafHex = "0x" + leaf.toString("hex");

      // Use staticCall to get return values
      const result = await predictiveMaintenance.validateInsuranceClaim.staticCall(
        machineID,
        0,
        leafHex,
        proofHexes,
        positions
      );

      expect(result[0]).to.be.true; // verified
      expect(result[1]).to.be.false; // hasAnomaly
    });

    it("Should validate claim with valid proof and anomaly detected", async function () {
      const machineID = "MACHINE_013";

      const leaves = ["temp_high", "vibration_extreme"].map((x) =>
        keccak256(x)
      );
      const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
      const root = tree.getRoot();
      const leaf = leaves[0];
      const proof = tree.getProof(leaf);

      await predictiveMaintenance.storeProof(
        machineID,
        "0x" + root.toString("hex"),
        true
      );

      const proofHexes = proof.map((p) => "0x" + p.data.toString("hex"));
      const positions = proof.map((p) => (p.position === "right" ? 1 : 0));
      const leafHex = "0x" + leaf.toString("hex");

      // Use staticCall to get return values
      const result = await predictiveMaintenance.validateInsuranceClaim.staticCall(
        machineID,
        0,
        leafHex,
        proofHexes,
        positions
      );

      expect(result[0]).to.be.true; // verified
      expect(result[1]).to.be.true; // hasAnomaly
    });

    it("Should emit ClaimValidated event", async function () {
      const machineID = "MACHINE_014";
      const merkleRoot = ethers.id("root");
      await predictiveMaintenance.storeProof(machineID, merkleRoot, true);

      const leaf = ethers.id("data");
      const proof = [];
      const positions = [];

      const tx = await predictiveMaintenance.validateInsuranceClaim(
        machineID,
        0,
        leaf,
        proof,
        positions
      );
      const receipt = await tx.wait();
      
      // Check events manually
      const claimEvent = receipt.logs.find(log => {
        try {
          const parsed = predictiveMaintenance.interface.parseLog(log);
          return parsed && parsed.name === "ClaimValidated";
        } catch (e) {
          return false;
        }
      });
      
      expect(claimEvent).to.exist;
      const parsed = predictiveMaintenance.interface.parseLog(claimEvent);
      expect(parsed.args[0]).to.equal(machineID);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle empty machine ID", async function () {
      const merkleRoot = ethers.id("root");
      const tx = await predictiveMaintenance.storeProof("", merkleRoot, false);
      await tx.wait();
      // Should not revert
      expect(tx).to.be.ok;
    });

    it("Should handle multiple anchors for same machine", async function () {
      const machineID = "MACHINE_015";

      for (let i = 0; i < 5; i++) {
        const root = ethers.id(`root_${i}`);
        await predictiveMaintenance.storeProof(machineID, root, i % 2 === 0);
      }

      // Verify we can access all anchors
      for (let i = 0; i < 5; i++) {
        const anchor = await predictiveMaintenance.machineLedger(machineID, i);
        expect(anchor.hasAnomaly).to.equal(i % 2 === 0);
      }
    });
  });
});

// Helper function for matching any value in events
function anyValue() {
  return Promise.resolve(undefined);
}
