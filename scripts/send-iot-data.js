import fs from "fs";
import csvParser from "csv-parser";
import { ethers } from "ethers";
import { spawn } from "child_process";
import http from "http";

// Replace with your deployed contract address and ABI
const CONTRACT_ADDRESS = "0x73511669fd4dE447feD18BB79bAFeAC93aB7F31f";
const CONTRACT_ABI = [
  {
    inputs: [{ internalType: "string", name: "machineID", type: "string" }, { internalType: "int256", name: "data", type: "int256" }],
    name: "checkData",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getAnomalyMachineIDs",
    outputs: [{ internalType: "string[]", name: "", type: "string[]" }],
    stateMutability: "view",
    type: "function",
  },
];

async function main() {
  const rpcUrl = process.env.RPC_URL || "http://localhost:8545";
  const provider = new ethers.JsonRpcProvider(rpcUrl);

  // Use environment private key if provided, otherwise fallback to the example (for local dev only)
  const privateKey = process.env.PRIVATE_KEY || "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e";
  const signer = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

  try {
    const network = await provider.getNetwork();
    console.log(`Connected to network: chainId=${network.chainId}, name=${network.name}`);

    const code = await provider.getCode(CONTRACT_ADDRESS);
    if (!code || code === "0x") {
      console.error(`No contract code at ${CONTRACT_ADDRESS} on this network. Redeploy or update CONTRACT_ADDRESS.`);
      process.exit(1);
    } else {
      console.log(`Contract code present at ${CONTRACT_ADDRESS} (size ${code.length / 2 - 1} bytes)`);
    }

    // Verify wallet connectivity
    const address = await signer.getAddress();
    const balance = await provider.getBalance(address);
    console.log(`Using wallet address: ${address}`);
    console.log(`Wallet balance: ${ethers.formatEther(balance)} ETH`);
  } catch (err) {
    console.error("Provider/contract/wallet check failed:", err.message || err);
    process.exit(1);
  }

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

            // Save the local list to a JSON file (write into frontend so http-server serves it)
      const anomalyData = { localAnomalies: anomalyMachineIDs };
      fs.writeFileSync("frontend/anomalies.json", JSON.stringify(anomalyData, null, 2));
      console.log("Local anomalies saved to frontend/anomalies.json");

      // Retrieve the list of anomaly machine IDs from the contract
      try {
        const anomalies = await contract.getAnomalyMachineIDs();
        anomalyData.contractAnomalies = anomalies;
        fs.writeFileSync("frontend/anomalies.json", JSON.stringify(anomalyData, null, 2));
        console.log("Contract anomalies saved to frontend/anomalies.json");
      } catch (error) {
        console.error("Error retrieving anomaly machine IDs:", error.message);
      }

      // Serve frontend using npx http-server on port 8080
      try {
          const servePort = process.env.SERVE_PORT || "8045"; // default to 8045
          console.log(`Starting frontend server with: npx http-server frontend -p ${servePort}`);
          const serve = spawn("npx", ["http-server", "frontend", "-p", servePort], {
            stdio: "inherit",
            shell: true,
          });

        serve.on("error", (err) => {
          console.error("Failed to start http-server:", err.message || err);
        });

        serve.on("close", (code, signal) => {
          if (code !== null) {
            console.log(`http-server exited with code ${code}`);
          } else {
            console.log(`http-server terminated due to signal ${signal}`);
          }
        });
      } catch (err) {
        console.error("Failed to spawn http-server process:", err.message || err);
      }
    });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});