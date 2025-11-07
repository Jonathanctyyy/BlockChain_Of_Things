import fs from "fs";
import csvParser from "csv-parser";
import { ethers } from "ethers";

// Replace with your deployed contract address and ABI
const CONTRACT_ADDRESS = "0xYourContractAddress";
const CONTRACT_ABI = [
  {
    "inputs": [{ "internalType": "int256", "name": "data", "type": "int256" }],
    "name": "checkData",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function",
  },
];

async function main() {
  // Connect to Ethereum provider
  const provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
  const signer = provider.getSigner(); // Use the first account
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

  // Read and parse the CSV file
  const filePath = "iot-data/factory_sensor_simulator_2040.csv";
  const dataColumnIndex = 4; // Replace with the correct column index for IoT data

  fs.createReadStream(filePath)
    .pipe(csvParser())
    .on("data", async (row) => {
      try {
        const data = parseFloat(row[dataColumnIndex]);
        console.log(`Sending data: ${data}`);
        const tx = await contract.checkData(data);
        await tx.wait();
        console.log(`Transaction successful: ${tx.hash}`);
      } catch (error) {
        console.error(`Error processing row: ${error.message}`);
      }
    })
    .on("end", () => {
      console.log("Finished processing CSV file.");
    });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});