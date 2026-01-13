import { MerkleTree } from 'merkletreejs';
import SHA256 from 'crypto-js/sha256.js';
import csv from 'csv-parser';
import fs from 'fs';
import Web3 from 'web3';  // Add this import

const rows = [];
const leaves = [];
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
    
    rows.push(data);
    leaves.push(SHA256(rowString));
  })
  .on('end', async () => {  // Make this async to await blockchain calls
    // 2. GENERATE MERKLE TREE
    const tree = new MerkleTree(leaves, SHA256);
    const root = tree.getRoot().toString('hex');

    // 3. SAVE OFF-CHAIN DATA
    fs.writeFileSync('database_analyzed.json', JSON.stringify(rows, null, 2));
    
    // 4. PREPARE BLOCKCHAIN PAYLOAD
    const blockchainAnchor = {
        timestamp: Math.floor(new Date().getTime() / 1000),  // Use Unix timestamp for solidity uint
        merkleRoot: `0x${root}`,
        machineID: parseInt(rows[0].machineID),  // Ensure it's a number
        hasAnomaly: anomalyDetectedInBatch  // Boolean
    };

    console.log("\n--- BATCH PROCESSING COMPLETE ---");
    console.log("Blockchain Payload:", blockchainAnchor);
    
    if(anomalyDetectedInBatch) {
        console.log("Status: ⚠️ MAINTENANCE TRIGGERED (Anomaly logged on Blockchain)");
    } else {
        console.log("Status: ✅ ALL SYSTEMS NORMAL");
    }

    // 5. STORE ON BLOCKCHAIN (NEW CODE)
    try {
        const web3 = new Web3('http://127.0.0.1:8545');  // Instantiate Web3 here
        const contractABI = JSON.parse(fs.readFileSync('./artifacts/contracts/PredictiveMaintenance.sol/PredictiveMaintenance.json', 'utf8')).abi;  // Load ABI using fs instead of import
        const contractAddress = '0xB581C9264f59BF0289fA76D61B2D0746dCE3C30D';
        const contract = new web3.eth.Contract(contractABI, contractAddress); // smart contract address instance
        const accounts = await web3.eth.getAccounts();
        const fromAccount = accounts[accounts.length - 1];  // Use the last Hardhat account address
        const tx = await contract.methods.storeProof(
        blockchainAnchor.machineID.toString(), // Convert machineID to string as required by Solidity
        blockchainAnchor.merkleRoot,
        blockchainAnchor.hasAnomaly
        ).send({ from: fromAccount });
        console.log('Transaction successful! Hash stored on blockchain. Tx hash:', tx.transactionHash);
        console.log(accounts);
    } catch (error) {
        console.error('Error storing on blockchain:', error);
    }
  });