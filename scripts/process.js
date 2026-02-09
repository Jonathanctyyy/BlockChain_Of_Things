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

// --- UPDATED ANOMALY DETECTION LOGIC ---
function checkAnomaly(data) {
    const vibration = parseFloat(data.vibration);
    const volt = parseFloat(data.volt);
    const pressure = parseFloat(data.pressure);
    const rotation = parseFloat(data.rotate);
    
    // Rule 1: High vibration - indicates mechanical issues
    if (vibration > 50.0) {
        console.log(`[ALERT] High Vibration detected: ${vibration} at ${data.datetime}`);
        return true;
    }
    // Rule 2: Low voltage - indicates electrical issues
    if (volt < 155.0 || volt > 190.0) {
        console.log(`[ALERT] Abnormal Voltage detected: ${volt} at ${data.datetime}`);
        return true;
    }
    // Rule 3: Abnormal pressure - too high or too low
    if (pressure > 120.0 || pressure < 80.0) {
        console.log(`[ALERT] Abnormal Pressure detected: ${pressure} at ${data.datetime}`);
        return true;
    }
    // Rule 4: Abnormal rotation - too high or too low RPM
    if (rotation > 550.0 || rotation < 350.0) {
        console.log(`[ALERT] Abnormal Rotation detected: ${rotation} at ${data.datetime}`);
        return true;
    }
    return false;
}

// Clear the data inside database_analyzed.json before writing new data
fs.writeFileSync('database_analyzed.json', JSON.stringify([], null, 2));
fs.writeFileSync('transaction_log.json', JSON.stringify([], null, 2));

// Initialize Web3 globally
const web3 = new Web3('http://127.0.0.1:8545');

// ==================================== Writing Processed Data and Blockchain Interaction ====================================
// 1. READ & ANALYZE
fs.createReadStream('./iot-data/PdM_telemetry.csv')
  .pipe(csv())
  .on('data', (data) => {
    
    // Check for anomalies using your custom thresholds
    const isAnomaly = checkAnomaly(data);
    
    // Tag the data status
    if (isAnomaly) {
        data.status = "CRITICAL";
        anomalyDetectedInBatch = true;
    } else {
        data.status = "NORMAL";
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
        const leaves = records.map(record => {
            const rowString = `${record.datetime},${record.machineID},${record.volt},${record.vibration},${record.status}`;
            return SHA256(rowString);
        });
        const tree = new MerkleTree(leaves, SHA256);
        const root = tree.getRoot().toString('hex');

        // Generate a single signature for the machine
        const machineDataString = records.map(record => `${record.datetime},${record.volt},${record.vibration},${record.status}`).join('|');
        const dataHash = web3.utils.soliditySha3(machineDataString); // Keccak256 hash

        // Use Buffer for hex-to-bytes conversion
        const hashBytes = Buffer.from(dataHash.slice(2), 'hex');
        const privBytes = Buffer.from(machinePrivateKey.slice(2), 'hex');

        // Sign with recovery - returns 65 bytes: recovery (1 byte) || r (32 bytes) || s (32 bytes)
        const sig65 = secp.sign(hashBytes, privBytes, { format: 'recovered', prehash: false });

        // Extract recovery bit (first byte) and compact signature (remaining 64 bytes: r || s)
        const recovery = sig65[0];
        const signature = sig65.slice(1);

        // Compute Ethereum-style v
        const v = recovery + 27;

        // Build the full signature Uint8Array (65 bytes: r || s || v)
        const fullSig = new Uint8Array(65);
        fullSig.set(signature);
        fullSig[64] = v;

        // Use Buffer for bytes-to-hex conversion
        const machineSignature = '0x' + Buffer.from(fullSig).toString('hex');

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
            merkleRoot: `0x${root}`,
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
                ipfsCID: cid, // Include the CID in the transaction details
                machineSignature: machineSignature, // Add the machine signature here
                signatureVerified: signatureVerified, // true/false/null (true=verified, false=failed, null=not attempted)
                verifiedAddress: machineAddress // The address that was verified
            };

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