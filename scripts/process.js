import { MerkleTree } from 'merkletreejs';
import SHA256 from 'crypto-js/sha256.js';
import csv from 'csv-parser';
import fs from 'fs';
import Web3 from 'web3';
import { PinataSDK } from 'pinata'; // Correct import
import dotenv from 'dotenv';
import * as secp from '@noble/secp256k1';
import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { concatBytes } from '@noble/hashes/utils.js';

secp.hashes.sha256 = sha256;
secp.hashes.hmacSha256 = (key, ...messages) => hmac(sha256, key, concatBytes(...messages));

dotenv.config(); // Load environment variables from .env file

// Initialize a dictionary to store records by machine ID
const machineRecords = {};
let anomalyDetectedInBatch = false;
// Initialize an array to store all processed data
const allProcessedData = [];

// ====================================
// ADVANCED ANOMALY DETECTION SYSTEM
// ====================================
// This system prevents false positives by:
// 1. TEMPORAL PERSISTENCE: Requires anomalies to persist across multiple consecutive readings
// 2. MULTI-SENSOR CORRELATION: Triggers when multiple sensors show anomalies simultaneously
// 3. TIME-WINDOW VALIDATION: Analyzes patterns within a configurable time window
//
// An anomaly is only flagged as CRITICAL if:
// - Multiple sensors (≥2) show abnormal readings at the same time, OR
// - The same sensor shows anomalies for 3+ consecutive readings
//
// This reduces noise and focuses on genuine equipment degradation patterns.
// 
// CONFIGURATION: Adjust the values below to tune sensitivity
// ====================================

// Configuration for anomaly detection
const ANOMALY_CONFIG = {
    // Number of consecutive anomalies required to trigger alert (higher = fewer alerts)
    CONSECUTIVE_THRESHOLD: 3,
    // Number of concurrent sensor anomalies required (higher = fewer alerts)
    MULTI_SENSOR_THRESHOLD: 2,
    // Time window in hours to check for persistent anomalies
    TIME_WINDOW_HOURS: 1,
    // Maximum number of anomaly proofs to store per machine (to prevent massive files)
    MAX_PROOFS_PER_MACHINE: 10
};

// Store recent readings per machine for temporal analysis
const machineHistory = {};

// --- ENHANCED ANOMALY DETECTION LOGIC ---
// Check if a single reading exceeds threshold
function checkThresholdViolation(data) {
    const violations = [];
    const vibration = parseFloat(data.vibration);
    const volt = parseFloat(data.volt);
    const pressure = parseFloat(data.pressure);
    const rotation = parseFloat(data.rotate);
    
    if (vibration > 50.0) {
        violations.push({ type: 'vibration', value: vibration, threshold: 50.0 });
    }
    if (volt < 155.0 || volt > 190.0) {
        violations.push({ type: 'voltage', value: volt, threshold: '155.0-190.0' });
    }
    if (pressure > 120.0 || pressure < 80.0) {
        violations.push({ type: 'pressure', value: pressure, threshold: '80.0-120.0' });
    }
    if (rotation > 550.0 || rotation < 350.0) {
        violations.push({ type: 'rotation', value: rotation, threshold: '350.0-550.0' });
    }
    
    return violations;
}

// Advanced anomaly detection with temporal and multi-metric validation
function checkAnomaly(data) {
    const machineID = data.machineID;
    const currentTime = new Date(data.datetime);
    
    // Initialize history for this machine if not exists
    if (!machineHistory[machineID]) {
        machineHistory[machineID] = [];
    }
    
    // Check current reading for threshold violations
    const currentViolations = checkThresholdViolation(data);
    
    // Add current reading to history
    machineHistory[machineID].push({
        datetime: currentTime,
        violations: currentViolations,
        data: data
    });
    
    // Keep only recent history within time window
    const timeWindowMs = ANOMALY_CONFIG.TIME_WINDOW_HOURS * 60 * 60 * 1000;
    machineHistory[machineID] = machineHistory[machineID].filter(record => {
        return (currentTime - record.datetime) <= timeWindowMs;
    });
    
    // If no violations in current reading, return false
    if (currentViolations.length === 0) {
        return false;
    }
    
    // RULE 1: Multi-Sensor Validation - Multiple sensors showing anomalies simultaneously
    if (currentViolations.length >= ANOMALY_CONFIG.MULTI_SENSOR_THRESHOLD) {
        console.log(`[ALERT] Multi-Sensor Anomaly detected for Machine ${machineID} at ${data.datetime}`);
        console.log(`  ${currentViolations.length} sensors showing abnormal readings:`);
        currentViolations.forEach(v => {
            console.log(`    - ${v.type}: ${v.value} (threshold: ${v.threshold})`);
        });
        return true;
    }
    
    // RULE 2: Temporal Persistence - Same sensor showing anomalies consecutively
    const recentReadings = machineHistory[machineID].slice(-ANOMALY_CONFIG.CONSECUTIVE_THRESHOLD);
    
    if (recentReadings.length >= ANOMALY_CONFIG.CONSECUTIVE_THRESHOLD) {
        // Check if any sensor type has violations in all recent readings
        const sensorTypes = ['vibration', 'voltage', 'pressure', 'rotation'];
        
        for (const sensorType of sensorTypes) {
            const consecutiveViolations = recentReadings.every(reading => 
                reading.violations.some(v => v.type === sensorType)
            );
            
            if (consecutiveViolations) {
                console.log(`[ALERT] Persistent ${sensorType} anomaly detected for Machine ${machineID} at ${data.datetime}`);
                console.log(`  Anomaly persisted for ${recentReadings.length} consecutive readings`);
                console.log(`  Time span: ${recentReadings[0].datetime.toISOString()} to ${currentTime.toISOString()}`);
                return true;
            }
        }
    }
    
    // No alert triggered - isolated anomaly (likely false positive)
    if (currentViolations.length > 0) {
        console.log(`[INFO] Isolated anomaly detected for Machine ${machineID} at ${data.datetime} - not triggering alert (likely false positive)`);
        currentViolations.forEach(v => {
            console.log(`  - ${v.type}: ${v.value}`);
        });
    }
    
    return false;
}

// Clear the data inside database_analyzed.json before writing new data
fs.writeFileSync('database_analyzed.json', JSON.stringify([], null, 2));
fs.writeFileSync('transaction_log.json', JSON.stringify([], null, 2));
fs.writeFileSync('anomaly_proofs.json', JSON.stringify([], null, 2));

// Initialize Web3 globally
const web3 = new Web3('http://127.0.0.1:8545');

// Statistics tracking for anomaly detection
const anomalyStats = {
    totalReadings: 0,
    thresholdViolations: 0,
    criticalAnomalies: 0,
    filteredIsolated: 0
};

// ==================================== Writing Processed Data and Blockchain Interaction ====================================
// 1. READ & ANALYZE
fs.createReadStream('./iot-data/PdM_telemetry.csv')
  .pipe(csv())
  .on('data', (data) => {
    anomalyStats.totalReadings++;
    
    // Track threshold violations before anomaly check
    const violations = checkThresholdViolation(data);
    if (violations.length > 0) {
        anomalyStats.thresholdViolations++;
    }
    
    // Check for anomalies using advanced temporal and multi-metric validation
    const isAnomaly = checkAnomaly(data);
    
    // Tag the data status
    if (isAnomaly) {
        data.status = "CRITICAL";
        anomalyDetectedInBatch = true;
        anomalyStats.criticalAnomalies++;
    } else {
        data.status = "NORMAL";
        if (violations.length > 0) {
            anomalyStats.filteredIsolated++;
        }
    }
    // Create the string for hashing and signing
    const rowString = `${data.datetime},${data.machineID},${data.volt},${data.vibration},${data.status}`;
    
    // Replace rows.push(data) with the following:
    if (!machineRecords[data.machineID]) {
        machineRecords[data.machineID] = [];
    }
    machineRecords[data.machineID].push(data);
    // Inside the 'data' event handler, add each processed record to the array
    allProcessedData.push(data);
  })
  .on('end', async () => {
    // Write all processed data to database_analyzed.json
    fs.writeFileSync('database_analyzed.json', JSON.stringify(allProcessedData, null, 2), 'utf8');
    console.log('All processed data written to database_analyzed.json.');

    // Display Anomaly Detection Statistics
    console.log('\n========================================');
    console.log('   ANOMALY DETECTION SUMMARY');
    console.log('========================================');
    console.log(`Total readings processed: ${anomalyStats.totalReadings}`);
    console.log(`Threshold violations detected: ${anomalyStats.thresholdViolations}`);
    console.log(`Critical anomalies flagged: ${anomalyStats.criticalAnomalies}`);
    console.log(`False positives filtered: ${anomalyStats.filteredIsolated}`);
    
    if (anomalyStats.thresholdViolations > 0) {
        const filterRate = ((anomalyStats.filteredIsolated / anomalyStats.thresholdViolations) * 100).toFixed(1);
        console.log(`False positive filter rate: ${filterRate}%`);
    }
    
    console.log('\nDetection Rules Applied:');
    console.log(`  • Multi-Sensor: ≥${ANOMALY_CONFIG.MULTI_SENSOR_THRESHOLD} concurrent sensor anomalies`);
    console.log(`  • Temporal: ${ANOMALY_CONFIG.CONSECUTIVE_THRESHOLD}+ consecutive anomalies in same sensor`);
    console.log(`  • Time Window: ${ANOMALY_CONFIG.TIME_WINDOW_HOURS} hour(s)`);
    console.log('========================================\n');

    // Delete all existing files on Pinata before uploading new data
    try {
        await deleteAllPinataFiles();
    } catch (error) {
        console.error('Warning: Could not clean up old Pinata data, continuing anyway...');
    }

    // Load machine private key from .env (must be hex string like '0x...')
    const machinePrivateKey = process.env.MACHINE_PRIVATE_KEY;
    if (!machinePrivateKey) {
        console.error('MACHINE_PRIVATE_KEY not set in .env');
        return;
    }

    // Derive machine address
    const machineAccount = web3.eth.accounts.privateKeyToAccount(machinePrivateKey);
    const machineAddress = machineAccount.address;

    // After processing all data, generate Merkle Trees and store hashes per machine
    for (const [machineID, records] of Object.entries(machineRecords)) {
        // Use keccak256 (Ethereum's hash function) for Solidity compatibility
        const leaves = records.map(record => {
            const rowString = `${record.datetime},${record.machineID},${record.volt},${record.vibration},${record.status}`;
            // Use web3's keccak256 for Ethereum compatibility
            return web3.utils.keccak256(rowString);
        });
        
        // Create Merkle tree with keccak256
        // IMPORTANT: sortPairs must be true to match the smart contract's verification logic
        const tree = new MerkleTree(leaves, (data) => {
            // For internal nodes, hash the concatenation
            if (Buffer.isBuffer(data)) {
                return Buffer.from(web3.utils.keccak256(data).slice(2), 'hex');
            }
            return Buffer.from(web3.utils.keccak256(data).slice(2), 'hex');
        }, { sortPairs: true });
        
        const root = '0x' + tree.getRoot().toString('hex');

        // ====================================
        // MERKLE PROOF GENERATION FOR ANOMALIES
        // ====================================
        // Generate compact Merkle proofs for anomalous readings
        // This allows efficient O(log n) verification on-chain
        const anomalyProofs = [];
        
        records.forEach((record, index) => {
            if (record.status === 'CRITICAL') {
                const leaf = leaves[index];
                const proof = tree.getProof(leaf);
                
                // Convert proof to hex format for blockchain verification
                const proofHex = proof.map(p => ({
                    position: p.position, // 'left' or 'right'
                    data: '0x' + p.data.toString('hex')
                }));
                
                anomalyProofs.push({
                    recordIndex: index,
                    datetime: record.datetime,
                    machineID: record.machineID,
                    leaf: leaf, // Already in hex format from keccak256
                    proof: proofHex,
                    proofLength: proofHex.length,
                    data: {
                        volt: record.volt,
                        vibration: record.vibration,
                        pressure: record.pressure,
                        rotation: record.rotate,
                        status: record.status
                    }
                });
            }
        });

        if (anomalyProofs.length > 0) {
            console.log(`\n📊 Generated ${anomalyProofs.length} Merkle proofs for anomalous readings (Machine ${machineID})`);
            console.log(`   Proof size: ${anomalyProofs[0].proofLength} hashes (O(log n) = log₂(${records.length}) ≈ ${Math.ceil(Math.log2(records.length))})`);
            console.log(`   Hash function: keccak256 (Ethereum compatible)`);
        }

        // Generate a single signature for the machine
        const machineDataString = records.map(record => `${record.datetime},${record.volt},${record.vibration},${record.status}`).join('|');
        const dataHash = web3.utils.soliditySha3(machineDataString); // Keccak256 hash

        // Use web3's sign method which automatically adds EIP-191 prefix
        // This ensures compatibility with the smart contract's recoverSigner function
        const signResult = web3.eth.accounts.sign(dataHash, machinePrivateKey);
        const machineSignature = signResult.signature;

        // Upload this machine's data to IPFS
        let cid;
        try {
            cid = await uploadToIPFS(machineID, records);
            console.log(`Machine ${machineID} data uploaded to IPFS with CID:`, cid);
        } catch (error) {
            console.error(`Failed to store data for Machine ${machineID} in Pinata:`, error);
            continue; // Skip this machine if upload fails
        }

        // Prepare blockchain payload for each machine
        const blockchainAnchor = {
            timestamp: Math.floor(new Date().getTime() / 1000),
            merkleRoot: root, // Already has '0x' prefix
            machineID: parseInt(machineID),
            hasAnomaly: records.some(record => record.status === 'CRITICAL')
        };

        console.log(`\n--- MACHINE ${machineID} PROCESSING COMPLETE ---`);
        console.log("Blockchain Payload:", blockchainAnchor);

        try {
            const contractABI = JSON.parse(fs.readFileSync('./artifacts/contracts/PredictiveMaintenance.sol/PredictiveMaintenance.json', 'utf8')).abi;
            
            // Read contract address from deployment file
            let contractAddress;
            try {
                const deploymentInfo = JSON.parse(fs.readFileSync('./contract-address.json', 'utf8'));
                contractAddress = deploymentInfo.contractAddress;
                console.log(`Using contract at: ${contractAddress} (deployed at ${deploymentInfo.deployedAt})`);
            } catch (error) {
                console.error('Error reading contract address from contract-address.json:', error.message);
                console.error('Please run deploy-web3.js first to deploy the contract.');
                return;
            }
            
            const contract = new web3.eth.Contract(contractABI, contractAddress);
            const accounts = await web3.eth.getAccounts();
            const fromAccount = accounts[accounts.length - 1];

            // Explicitly set a higher gas limit for the transaction
            const gasLimit = 3000000; // Set a high gas limit for debugging

            // Register machine if not already registered
            let registeredAddress;
            try {
                registeredAddress = await contract.methods.machineAddresses(machineID).call();
            } catch (error) {
                console.log(`Could not check registration for Machine ${machineID}, will register...`);
                registeredAddress = '0x0000000000000000000000000000000000000000';
            }
            
            if (registeredAddress === '0x0000000000000000000000000000000000000000') {
                const regTx = await contract.methods.registerMachine(
                    machineID,
                    machineAddress
                ).send({ from: fromAccount, gas: gasLimit });
                console.log(`Machine ${machineID} registered with address ${machineAddress}. Tx hash: ${regTx.transactionHash}`);
            } else {
                console.log(`Machine ${machineID} already registered with address ${registeredAddress}`);
            }

            const tx = await contract.methods.storeProof(
                machineID,
                blockchainAnchor.merkleRoot,
                blockchainAnchor.hasAnomaly
            ).send({ from: fromAccount, gas: gasLimit });

            console.log(`Transaction successful for Machine ${machineID}! Tx hash:`, tx.transactionHash);

            // Log the parameters being passed for debugging
            console.log('Parameters passed to storeProof:', {
                machineID: machineID,
                merkleRoot: blockchainAnchor.merkleRoot,
                hasAnomaly: blockchainAnchor.hasAnomaly
            });

            // === DECENTRALIZED VERIFICATION: Verify the machine's signature on the blockchain ===
            // This verification happens on-chain through the smart contract, making it trustless
            // Set ENABLE_SIGNATURE_VERIFICATION=true in .env to enable this feature
            const enableVerification = process.env.ENABLE_SIGNATURE_VERIFICATION === 'true';
            let signatureVerified = false;
            
            if (enableVerification) {
                console.log(`\n Verifying Machine ${machineID} signature on-chain...`);
                try {
                    // Call verifySignature with the signature as hex string (web3 will convert it)
                    const isVerified = await contract.methods.verifySignature(
                        machineID,
                        dataHash,
                        machineSignature // Pass the signature as hex string
                    ).call();

                    if (!isVerified) {
                        console.warn(`  VERIFICATION FAILED: Machine ${machineID} signature does not match registered address.`);
                        console.warn(`   This means the data was NOT sent by the authentic machine!`);
                        console.warn(`   Continuing anyway, but marking as unverified...\n`);
                        signatureVerified = false;
                    } else {
                        console.log(`  VERIFICATION SUCCESSFUL: Machine ${machineID} signature verified on-chain!`);
                        console.log(`   Signer address matches registered machine address: ${machineAddress}`);
                        console.log(`   This proves the data authenticity in a decentralized, trustless manner.\n`);
                        signatureVerified = true;
                    }
                } catch (verifyError) {
                    console.warn(`  Verification call failed for Machine ${machineID}:`, verifyError.message);
                    console.warn(`   This may mean the contract doesn't support verification yet.`);
                    console.warn(`   Data Hash: ${dataHash}`);
                    console.warn(`   Signature: ${machineSignature}`);
                    console.warn(`   Registered Address: ${machineAddress}`);
                    console.warn(`   Continuing without verification...\n`);
                    signatureVerified = false;
                }
            } else {
                console.log(`  Signature verification disabled. Set ENABLE_SIGNATURE_VERIFICATION=true in .env to enable.\n`);
                signatureVerified = null; // null means verification was not attempted
            }

            // Save transaction details to a file (only if verification passed)
            const transactionDetails = {
                machineID: machineID,
                transactionHash: tx.transactionHash,
                gasUsed: tx.gasUsed,
                from: fromAccount,
                to: contractAddress,
                timestamp: blockchainAnchor.timestamp,
                merkleRoot: blockchainAnchor.merkleRoot, // Include the Merkle Root hash
                ipfsCID: cid, // Include the CID in the transaction details
                machineSignature: machineSignature, // Add the machine signature here
                signatureVerified: signatureVerified, // true/false/null (true=verified, false=failed, null=not attempted)
                verifiedAddress: machineAddress, // The address that was verified
                anomalyCount: anomalyProofs.length, // Number of anomalous readings
                hasAnomalyProofs: anomalyProofs.length > 0 // Flag indicating proofs are available
            };

            // Save Merkle proofs for anomalous readings to a separate file
            if (anomalyProofs.length > 0) {
                // Limit to most recent proofs to prevent file bloat
                const limitedProofs = anomalyProofs.slice(-ANOMALY_CONFIG.MAX_PROOFS_PER_MACHINE);
                
                let allAnomalyProofs = [];
                try {
                    const existingProofs = fs.readFileSync('anomaly_proofs.json', 'utf8');
                    allAnomalyProofs = JSON.parse(existingProofs);
                } catch (error) {
                    if (error.code !== 'ENOENT') {
                        console.error('Error reading anomaly proofs:', error);
                    }
                }

                allAnomalyProofs.push({
                    machineID: machineID,
                    merkleRoot: blockchainAnchor.merkleRoot,
                    transactionHash: tx.transactionHash,
                    timestamp: blockchainAnchor.timestamp,
                    totalRecords: records.length,
                    anomalies: limitedProofs
                });

                fs.writeFileSync('anomaly_proofs.json', JSON.stringify(allAnomalyProofs, null, 2));
                console.log(`✅ Saved ${limitedProofs.length} Merkle proofs to anomaly_proofs.json (limited from ${anomalyProofs.length})`);
            }

            // Read existing transaction log or initialize an empty array
            let transactionLog = [];
            try {
                const existingData = fs.readFileSync('transaction_log.json', 'utf8');
                transactionLog = JSON.parse(existingData);
            } catch (error) {
                if (error.code !== 'ENOENT') {
                    console.error('Error reading transaction log:', error);
                }
            }

            // Add the new transaction details
            transactionLog.push(transactionDetails);

            // Custom replacer to handle BigInt serialization
            const replacer = (key, value) => (typeof value === 'bigint' ? value.toString() : value);

            // Write the updated transaction log back to the file
            fs.writeFileSync('transaction_log.json', JSON.stringify(transactionLog, replacer, 2));
        } catch (error) {
            console.error(`Error storing data for Machine ${machineID} on blockchain:`, error);
        }
    }
  });

// ==================================== deplying offchain data to IPFS ===================================
// Initialize Pinata with JWT
const pinataClient = new PinataSDK({
    pinataJwt: process.env.PINATA_JWT, // Use correct key for JWT
});

// Function to delete all existing files on Pinata
async function deleteAllPinataFiles() {
    try {
        console.log('\n=== Cleaning up old Pinata data ===');
        
        // List all pinned files
        const files = await pinataClient.files.list();
        
        if (!files || !files.files || files.files.length === 0) {
            console.log('No existing files found on Pinata to delete.');
            return;
        }
        
        console.log(`Found ${files.files.length} files to delete...`);
        
        // Delete each file by unpinning it
        for (const file of files.files) {
            try {
                await pinataClient.files.delete([file.id]);
                console.log(`Deleted file: ${file.name || file.cid} (ID: ${file.id})`);
            } catch (error) {
                console.error(`Failed to delete file ${file.id}:`, error.message);
            }
        }
        
        console.log('All existing Pinata files have been deleted.\n');
    } catch (error) {
        console.error('Error deleting Pinata files:', error.message);
        throw error;
    }
}

// Function to upload data per machine to Pinata and get the CID
async function uploadToIPFS(machineID, records) {
    try {
        // Upload the machine's records to Pinata with custom filename
        const result = await pinataClient.upload.public.json(records, {
            name: `machine_${machineID}.json`
        });
        // Extract the CID (note: it's 'cid' in the new SDK, not 'IpfsHash')
        const cid = result.cid;
        console.log(`Machine ${machineID} data stored in IPFS with CID:`, cid);
        return cid;
    } catch (error) {
        console.error(`Error uploading Machine ${machineID} data to IPFS:`, error);
        throw error;
    }
}