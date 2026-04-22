import fs from 'fs';
import Web3 from 'web3';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Web3
const web3 = new Web3('http://127.0.0.1:8545');

// Load contract ABI
const contractABI = JSON.parse(
    fs.readFileSync('./artifacts/contracts/PredictiveMaintenance.sol/PredictiveMaintenance.json', 'utf8')
).abi;

// Load contract address
const deploymentInfo = JSON.parse(fs.readFileSync('./contract-address.json', 'utf8'));
const contractAddress = deploymentInfo.contractAddress;

// Initialize contract
const contract = new web3.eth.Contract(contractABI, contractAddress);

/**
 * Verify a Merkle proof for an anomalous reading on-chain
 * 
 * This demonstrates O(log n) verification efficiency:
 * - Instead of storing all sensor readings on-chain
 * - Only the Merkle root is stored
 * - Any specific reading can be verified with just log₂(n) hashes
 * 
 * Example: For 1000 readings, only ~10 hashes needed for verification
 */
async function verifyAnomalyProof(machineID, anomalyIndex = 0) {
    try {
        console.log('\n========================================');
        console.log('   MERKLE PROOF VERIFICATION');
        console.log('========================================\n');

        // Load anomaly proofs
        const anomalyProofs = JSON.parse(fs.readFileSync('anomaly_proofs.json', 'utf8'));
        
        // Find proofs for the specified machine
        const machineProofs = anomalyProofs.find(p => p.machineID === machineID.toString());
        
        if (!machineProofs) {
            console.log(`❌ No anomaly proofs found for Machine ${machineID}`);
            return;
        }

        if (machineProofs.anomalies.length === 0) {
            console.log(`✅ No anomalies detected for Machine ${machineID}`);
            return;
        }

        console.log(`Machine ID: ${machineID}`);
        console.log(`Total Records: ${machineProofs.totalRecords}`);
        console.log(`Anomalies Detected: ${machineProofs.anomalies.length}`);
        console.log(`Merkle Root: ${machineProofs.merkleRoot}`);
        console.log(`Transaction: ${machineProofs.transactionHash}\n`);

        // Get the specific anomaly to verify
        const anomaly = machineProofs.anomalies[anomalyIndex];
        
        if (!anomaly) {
            console.log(`❌ Anomaly index ${anomalyIndex} not found`);
            return;
        }

        console.log('Verifying Anomalous Reading:');
        console.log(`  Date/Time: ${anomaly.datetime}`);
        console.log(`  Record Index: ${anomaly.recordIndex}`);
        console.log(`  Voltage: ${anomaly.data.volt}V`);
        console.log(`  Vibration: ${anomaly.data.vibration} mm/s`);
        console.log(`  Pressure: ${anomaly.data.pressure} PSI`);
        console.log(`  Rotation: ${anomaly.data.rotation} RPM`);
        console.log(`  Status: ${anomaly.data.status}\n`);

        console.log('Merkle Proof Details:');
        console.log(`  Leaf Hash: ${anomaly.leaf}`);
        console.log(`  Proof Length: ${anomaly.proofLength} hashes (O(log n) = log₂(${machineProofs.totalRecords}) ≈ ${Math.ceil(Math.log2(machineProofs.totalRecords))})`);
        console.log(`  Efficiency: ${((anomaly.proofLength / machineProofs.totalRecords) * 100).toFixed(2)}% of full dataset size\n`);

        // Prepare proof arrays for smart contract
        const proofHashes = anomaly.proof.map(p => p.data);
        const proofPositions = anomaly.proof.map(p => p.position === 'left' ? 0 : 1);

        console.log('Proof Path:');
        anomaly.proof.forEach((p, i) => {
            console.log(`  [${i}] ${p.position.toUpperCase()}: ${p.data}`);
        });

        // Find the correct anchor index by matching the Merkle root
        console.log('\n🔍 Finding correct anchor index on blockchain...\n');
        let anchorIndex = -1;
        
        for (let i = 0; i < 10; i++) {
            try {
                const anchor = await contract.methods.machineLedger(machineID.toString(), i).call();
                console.log(`   Checking anchor ${i}: ${anchor.merkleRoot}`);
                
                if (anchor.merkleRoot === machineProofs.merkleRoot) {
                    anchorIndex = i;
                    console.log(`   ✅ Match found at anchor index ${i}!\n`);
                    break;
                }
            } catch (e) {
                console.log(`   No more anchors found.\n`);
                break;
            }
        }
        
        if (anchorIndex === -1) {
            console.error('❌ Could not find matching Merkle root on blockchain!');
            console.error('   Please run: node scripts/process.js\n');
            return;
        }

        // Call the smart contract to verify the proof
        console.log('🔍 Verifying proof on-chain...\n');
        
        const accounts = await web3.eth.getAccounts();
        const fromAccount = accounts[0];

        // Verify using view function (no gas cost)
        const isValidView = await contract.methods.verifyMerkleProof(
            machineID.toString(),
            anchorIndex, // Use the found anchor index
            anomaly.leaf,
            proofHashes,
            proofPositions
        ).call();

        if (isValidView) {
            console.log('✅ PROOF VERIFIED (View Call)');
            console.log('   The anomalous reading is cryptographically proven to be');
            console.log('   part of the dataset represented by the Merkle root on-chain.\n');
        } else {
            console.log('❌ PROOF VERIFICATION FAILED (View Call)');
            console.log('   The reading does not match the stored Merkle root.\n');
        }

        // Optionally verify with transaction (costs gas but emits event)
        console.log('📝 Logging verification on-chain (emits event)...\n');
        
        const tx = await contract.methods.verifyAndLog(
            machineID.toString(),
            anchorIndex,
            anomaly.leaf,
            proofHashes,
            proofPositions
        ).send({ from: fromAccount, gas: 3000000 });

        console.log('Transaction Details:');
        console.log(`  Tx Hash: ${tx.transactionHash}`);
        console.log(`  Gas Used: ${tx.gasUsed}`);
        console.log(`  Block: ${tx.blockNumber}\n`);

        // Check for ProofVerified event
        if (tx.events.ProofVerified) {
            console.log('Event Emitted: ProofVerified');
            console.log(`  Machine ID: ${tx.events.ProofVerified.returnValues.machineID}`);
            console.log(`  Verified: ${tx.events.ProofVerified.returnValues.verified}`);
        }

        console.log('\n========================================');
        console.log('Benefits of Merkle Proof Verification:');
        console.log('========================================');
        console.log(`✓ Space Efficient: ${anomaly.proofLength} hashes vs ${machineProofs.totalRecords} records`);
        console.log(`✓ Time Efficient: O(log n) = ${anomaly.proofLength} operations`);
        console.log('✓ Cryptographically Secure: SHA-256 based');
        console.log('✓ Decentralized: Anyone can verify without trust');
        console.log('✓ Immutable: Proof anchored on blockchain');
        console.log('========================================\n');

    } catch (error) {
        console.error('Error verifying proof:', error.message);
        if (error.data) {
            console.error('Contract error:', error.data);
        }
    }
}

// Get machine ID from command line or use default
const machineID = process.argv[2] || '1';
const anomalyIndex = parseInt(process.argv[3]) || 0;

console.log(`\nVerifying Merkle proof for Machine ${machineID}, Anomaly ${anomalyIndex}...`);
verifyAnomalyProof(machineID, anomalyIndex);
