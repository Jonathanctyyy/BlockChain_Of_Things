import { MerkleTree } from 'merkletreejs';
import SHA256 from 'crypto-js/sha256.js';
import csv from 'csv-parser';
import fs from 'fs';
import Web3 from 'web3';  // Add this import

// Initialize a dictionary to store records by machine ID
const machineRecords = {};
let anomalyDetectedInBatch = false;

// --- UPDATED ANOMALY DETECTION LOGIC ---
function checkAnomaly(data) {
    const vibration = parseFloat(data.vibration);
    const volt = parseFloat(data.volt);

    // Rule 1: Catch the spike at 21:00 (Value: 51.02)
    if (vibration > 50.0) {
        console.log(`[ALERT] High Vibration detected: ${vibration} at ${data.datetime}`);
        return true;
    }

    // Rule 2: Catch the voltage drop at 22:00 (Value: 151.33)
    if (volt < 155.0) {
        console.log(`[ALERT] Low Voltage detected: ${volt} at ${data.datetime}`);
        return true;
    }

    return false;
}

// Clear the data inside database_analyzed.json before writing new data
fs.writeFileSync('database_analyzed.json', JSON.stringify([], null, 2));

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

    // Create the string for hashing
    // We include the status so the 'CRITICAL' tag is cryptographically secured
    const rowString = `${data.datetime},${data.machineID},${data.volt},${data.vibration},${data.status}`;
    
    // Replace rows.push(data) with the following:
    if (!machineRecords[data.machineID]) {
        machineRecords[data.machineID] = [];
    }
    machineRecords[data.machineID].push(data);
  })
  .on('end', async () => {  // Make this async to await blockchain calls
    // After processing all data, generate Merkle Trees and store hashes per machine
    for (const [machineID, records] of Object.entries(machineRecords)) {
        const leaves = records.map(record => {
            const rowString = `${record.datetime},${record.machineID},${record.volt},${record.vibration},${record.status}`;
            return SHA256(rowString);
        });

        const tree = new MerkleTree(leaves, SHA256);
        const root = tree.getRoot().toString('hex');

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
            const web3 = new Web3('http://127.0.0.1:8545');
            const contractABI = JSON.parse(fs.readFileSync('./artifacts/contracts/PredictiveMaintenance.sol/PredictiveMaintenance.json', 'utf8')).abi;
            const contractAddress = '0xB581C9264f59BF0289fA76D61B2D0746dCE3C30D';
            const contract = new web3.eth.Contract(contractABI, contractAddress);
            const accounts = await web3.eth.getAccounts();
            const fromAccount = accounts[accounts.length - 1];
            const tx = await contract.methods.storeProof(
                blockchainAnchor.machineID.toString(),
                blockchainAnchor.merkleRoot,
                blockchainAnchor.hasAnomaly
            ).send({ from: fromAccount });

            console.log(`Transaction successful for Machine ${machineID}! Tx hash:`, tx.transactionHash);

            // Save transaction details to a file
            const transactionDetails = {
                machineID,
                transactionHash: tx.transactionHash,
                gasUsed: tx.gasUsed,
                from: fromAccount,
                to: contractAddress,
                timestamp: blockchainAnchor.timestamp
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