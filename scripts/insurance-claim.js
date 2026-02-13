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
 * INSURANCE CLAIM DOUBLE CONFIRMATION SYSTEM
 * 
 * Phase 1: Integrity Check - Verify Merkle proof
 * Phase 2: Policy Check - Verify values exceed thresholds
 * 
 * Both must pass for claim approval
 */

// Step 1: Set insurance policy thresholds
async function setInsurancePolicy(machineID) {
    try {
        console.log('\n========================================');
        console.log('   SETTING INSURANCE POLICY');
        console.log('========================================\n');

        const accounts = await web3.eth.getAccounts();
        const fromAccount = accounts[0];

        console.log(`Setting policy for Machine ${machineID}...`);
        console.log('Policy Thresholds:');
        console.log('  Voltage: 155.0V - 190.0V');
        console.log('  Vibration: < 50.0 mm/s');
        console.log('  Pressure: 80.0 - 120.0 PSI');
        console.log('  Rotation: 350 - 550 RPM\n');

        // Set thresholds (multiply by 10 to preserve one decimal place)
        const tx = await contract.methods.setInsurancePolicy(
            machineID.toString(),
            1550,  // voltageMin: 155.0V
            1900,  // voltageMax: 190.0V
            500,   // vibrationMax: 50.0 mm/s
            800,   // pressureMin: 80.0 PSI
            1200,  // pressureMax: 120.0 PSI
            350,   // rotationMin: 350 RPM
            550    // rotationMax: 550 RPM
        ).send({ from: fromAccount, gas: 3000000 });

        console.log('✅ Policy set successfully!');
        console.log(`   Tx Hash: ${tx.transactionHash}`);
        console.log(`   Gas Used: ${tx.gasUsed}\n`);

        if (tx.events.PolicySet) {
            console.log('Event: PolicySet');
            console.log(`  Machine ID: ${tx.events.PolicySet.returnValues.machineID}`);
            console.log(`  Set by: ${tx.events.PolicySet.returnValues.setter}\n`);
        }

    } catch (error) {
        console.error('Error setting policy:', error.message);
    }
}

// Step 2: Validate insurance claim with double confirmation
async function validateClaim(machineID, anomalyIndex = 0) {
    try {
        console.log('\n========================================');
        console.log('   INSURANCE CLAIM VALIDATION');
        console.log('   (DOUBLE CONFIRMATION SYSTEM)');
        console.log('========================================\n');

        // Load anomaly proofs
        const anomalyProofs = JSON.parse(fs.readFileSync('anomaly_proofs.json', 'utf8'));
        const machineProofs = anomalyProofs.find(p => p.machineID === machineID.toString());
        
        if (!machineProofs || machineProofs.anomalies.length === 0) {
            console.log(`❌ No anomalies found for Machine ${machineID}`);
            return;
        }

        const anomaly = machineProofs.anomalies[anomalyIndex];
        
        console.log('📋 CLAIM DETAILS:');
        console.log(`   Machine ID: ${machineID}`);
        console.log(`   Date/Time: ${anomaly.datetime}`);
        console.log(`   Record Index: ${anomaly.recordIndex}\n`);

        console.log('📊 SENSOR READINGS:');
        console.log(`   Voltage: ${anomaly.data.volt}V`);
        console.log(`   Vibration: ${anomaly.data.vibration} mm/s`);
        console.log(`   Pressure: ${anomaly.data.pressure} PSI`);
        console.log(`   Rotation: ${anomaly.data.rotation} RPM`);
        console.log(`   Status: ${anomaly.data.status}\n`);

        // Prepare values (multiply by 10 for decimals)
        const voltage = Math.round(parseFloat(anomaly.data.volt) * 10);
        const vibration = Math.round(parseFloat(anomaly.data.vibration) * 10);
        const pressure = Math.round(parseFloat(anomaly.data.pressure) * 10);
        const rotation = parseInt(anomaly.data.rotation);

        console.log('═══════════════════════════════════════');
        console.log('   PHASE 1: INTEGRITY CHECK');
        console.log('═══════════════════════════════════════\n');

        // Prepare proof
        const proofHashes = anomaly.proof.map(p => p.data);
        const proofPositions = anomaly.proof.map(p => p.position === 'left' ? 0 : 1);

        console.log('🔍 Verifying Merkle proof...');
        console.log(`   Merkle Root: ${machineProofs.merkleRoot}`);
        console.log(`   Leaf Hash: ${anomaly.leaf}`);
        console.log(`   Proof Length: ${anomaly.proofLength} hashes\n`);

        const accounts = await web3.eth.getAccounts();
        const fromAccount = accounts[0];

        // Call the double confirmation function
        console.log('═══════════════════════════════════════');
        console.log('   PHASE 2: POLICY CHECK');
        console.log('═══════════════════════════════════════\n');

        console.log('🔍 Checking against insurance thresholds...\n');

        // First check eligibility (view function, no gas)
        const eligibility = await contract.methods.checkClaimEligibility(
            machineID.toString(),
            voltage,
            vibration,
            pressure,
            rotation
        ).call();

        console.log('Pre-Check Result:');
        console.log(`   Eligible: ${eligibility.eligible ? '✅ YES' : '❌ NO'}`);
        console.log(`   Reason: ${eligibility.reason}\n`);

        // Now perform the full validation (with transaction)
        console.log('📝 Executing double confirmation on-chain...\n');

        const tx = await contract.methods.validateInsuranceClaim(
            machineID.toString(),
            0, // anchor index
            anomaly.leaf,
            proofHashes,
            proofPositions,
            voltage,
            vibration,
            pressure,
            rotation
        ).send({ from: fromAccount, gas: 5000000 });

        console.log('═══════════════════════════════════════');
        console.log('   VALIDATION RESULT');
        console.log('═══════════════════════════════════════\n');

        const result = tx.events.ClaimValidated?.returnValues || {};
        const approved = tx.events.ClaimApproved;
        const rejected = tx.events.ClaimRejected;

        console.log('Transaction Details:');
        console.log(`   Tx Hash: ${tx.transactionHash}`);
        console.log(`   Gas Used: ${tx.gasUsed}`);
        console.log(`   Block: ${tx.blockNumber}\n`);

        console.log('Validation Results:');
        console.log(`   ✅ Phase 1 (Integrity): ${result.proofValid ? 'PASSED' : 'FAILED'}`);
        console.log(`   ${result.policyMet ? '✅' : '❌'} Phase 2 (Policy): ${result.policyMet ? 'PASSED' : 'FAILED'}`);
        console.log(`   Reason: ${result.reason}\n`);

        if (approved) {
            console.log('═══════════════════════════════════════');
            console.log('   🎉 CLAIM APPROVED');
            console.log('═══════════════════════════════════════\n');
            console.log(`   Machine: ${approved.returnValues.machineID}`);
            console.log(`   Claim Type: ${approved.returnValues.claimType}`);
            console.log(`   Timestamp: ${new Date(parseInt(approved.returnValues.timestamp) * 1000).toLocaleString()}\n`);
            console.log('Next Steps:');
            console.log('   • Evidence verified on blockchain');
            console.log('   • Policy violation confirmed');
            console.log('   • Ready for insurance payout processing\n');
        } else if (rejected) {
            console.log('═══════════════════════════════════════');
            console.log('   ❌ CLAIM REJECTED');
            console.log('═══════════════════════════════════════\n');
            console.log(`   Machine: ${rejected.returnValues.machineID}`);
            console.log(`   Reason: ${rejected.returnValues.reason}`);
            console.log(`   Timestamp: ${new Date(parseInt(rejected.returnValues.timestamp) * 1000).toLocaleString()}\n`);
        }

        console.log('═══════════════════════════════════════');
        console.log('   WHY DOUBLE CONFIRMATION?');
        console.log('═══════════════════════════════════════\n');
        console.log('✓ Integrity Check: Ensures data hasn\'t been tampered with');
        console.log('✓ Policy Check: Ensures claim meets contractual requirements');
        console.log('✓ Prevents Fraud: Both checks must pass');
        console.log('✓ Transparent: All validation on-chain with events');
        console.log('✓ Auditable: Immutable record of claim decision\n');

    } catch (error) {
        console.error('Error validating claim:', error.message);
        if (error.data) {
            console.error('Contract error:', error.data);
        }
    }
}

// Main execution
const command = process.argv[2] || 'validate';
const machineID = process.argv[3] || '1';
const anomalyIndex = parseInt(process.argv[4]) || 0;

async function main() {
    if (command === 'set-policy') {
        await setInsurancePolicy(machineID);
    } else if (command === 'validate') {
        console.log('\n🏥 INSURANCE CLAIM VALIDATION SYSTEM');
        console.log('   Double Confirmation: Proof + Policy\n');
        await validateClaim(machineID, anomalyIndex);
    } else if (command === 'full') {
        // Full workflow
        await setInsurancePolicy(machineID);
        await validateClaim(machineID, anomalyIndex);
    } else {
        console.log('Usage:');
        console.log('  node scripts/insurance-claim.js set-policy [machineID]');
        console.log('  node scripts/insurance-claim.js validate [machineID] [anomalyIndex]');
        console.log('  node scripts/insurance-claim.js full [machineID] [anomalyIndex]');
    }
}

main();
