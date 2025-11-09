import fs from "fs";
import csvParser from "csv-parser";
import { ethers } from "ethers";

// Replace with your deployed contract address and ABI
const CONTRACT_ADDRESS = "0x73511669fd4dE447feD18BB79bAFeAC93aB7F31f";
const CONTRACT_ABI = [
  {
    "inputs": [{ "internalType": "string", "name": "machineID", "type": "string" }, { "internalType": "int256", "name": "data", "type": "int256" }],
    "name": "checkData",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function",
  },
  {
    "inputs": [],
    "name": "getAnomalyMachineIDs",
    "outputs": [{ "internalType": "string[]", "name": "", "type": "string[]" }],
    "stateMutability": "view",
    "type": "function",
  },
];

async function main() {
  const provider = new ethers.JsonRpcProvider("http://localhost:8545");
  const privateKey = "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e"; 
  const signer = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

  const filePath = "iot-data/factory_sensor_simulator_2040.csv";

  const anomalyMachineIDs = [];

  fs.createReadStream(filePath)
    .pipe(csvParser())
    .on("data", async (row) => {
      try {
        const machineID = row["Machine_ID"];
        let temperature = parseFloat(row["Temperature_C"]);

        // Only send data if the temperature is outside the range of 10 and 100
        if (!isNaN(temperature) && (temperature < 10 || temperature > 100)) {
          console.log(`Sending data: Machine_ID=${machineID}, Temperature=${temperature}`);
          anomalyMachineIDs.push(machineID); 
          const tx = await contract.checkData(machineID, temperature);
          await tx.wait();
          console.log(`Transaction successful for Machine_ID=${machineID}`);
        } else {
          console.log(`Temperature within range for Machine_ID=${machineID}, skipping...`);
        }
      } catch (error) {
        console.error(`Error processing row: ${error.message}`);
      }
    })
    .on("end", async () => {
      console.log("Finished processing CSV file.");

      // Print the list of machine IDs with anomalies
      console.log("Local list of machines with temperature anomalies:", anomalyMachineIDs);


      // Retrieve the list of anomaly machine IDs
      try {
        const anomalies = await contract.getAnomalyMachineIDs();
        console.log("Machines with temperature anomalies:", anomalies);
      } catch (error) {
        console.error("Error retrieving anomaly machine IDs:", error.message);
      }
    });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});