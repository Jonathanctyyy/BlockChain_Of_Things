import { PinataSDK } from 'pinata'; // Correct import
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config(); // Load environment variables from .env file

// Initialize Pinata with JWT
const pinataClient = new PinataSDK({
    pinataJwt: process.env.PINATA_JWT, // Use correct key for JWT
    // Optional: pinataGateway: 'your-gateway.mypinata.cloud',
});

// Function to upload data to Pinata and get the CID
async function uploadToIPFSAndIncludeCID() {
    try {
        // Read the data from a file (e.g., database_analyzed.json)
        const data = fs.readFileSync('database_analyzed.json', 'utf8');
        // Parse the JSON data
        const jsonData = JSON.parse(data);
        // Upload the JSON data to Pinata (use public.json for public access)
        const result = await pinataClient.upload.public.json(jsonData);
        // Extract the CID (note: it's 'cid' in the new SDK, not 'IpfsHash')
        const cid = result.cid;
        console.log('Data stored in IPFS with CID:', cid);
        // Include the CID in transaction details
        const transactionDetails = {
            machineID: 123,
            transactionHash: '0xabc123',
            gasUsed: 21000,
            from: '0xYourAddress',
            to: '0xContractAddress',
            timestamp: Math.floor(Date.now() / 1000),
            ipfsCID: cid, // Include the CID here
        };
        console.log('Transaction Details:', transactionDetails);
        // Optionally, save the transaction details to a file
        fs.writeFileSync('transaction_log.json', JSON.stringify(transactionDetails, null, 2));
    } catch (error) {
        console.error('Error uploading data to IPFS or including CID:', error);
    }
}

// Call the function
uploadToIPFSAndIncludeCID();