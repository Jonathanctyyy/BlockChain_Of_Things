import fs from "fs";
import csvParser from "csv-parser";
import { ethers } from "ethers";
import http from "http";

// Replace with your deployed contract address and ABI
const CONTRACT_ADDRESS = "0xAbB12158488d9C9Bd52C14B9AE4C835eCE4A6e13";
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
  } catch (err) {
    console.error("Provider/contract check failed:", err.message || err);
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

      // Save the local list to a JSON file
      const anomalyData = { localAnomalies: anomalyMachineIDs };
      fs.writeFileSync("anomalies.json", JSON.stringify(anomalyData, null, 2));
      console.log("Local anomalies saved to anomalies.json");

      // Retrieve the list of anomaly machine IDs from the contract
      try {
        const anomalies = await contract.getAnomalyMachineIDs();
        anomalyData.contractAnomalies = anomalies;
        fs.writeFileSync("anomalies.json", JSON.stringify(anomalyData, null, 2));
        console.log("Contract anomalies saved to anomalies.json");
      } catch (error) {
        console.error("Error retrieving anomaly machine IDs:", error.message);
      }

            // Start an HTTP server to serve the anomaly data with CORS enabled
      const PORT = process.env.PORT || 3000;
      const server = http.createServer((req, res) => {
        // handle CORS preflight
        if (req.method === "OPTIONS") {
          res.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          });
          return res.end();
        }

        if (req.url === "/anomalies" && req.method === "GET") {
          fs.readFile("anomalies.json", "utf8", (err, data) => {
            if (err) {
            res.writeHead(500, {
            "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            });
            res.end(JSON.stringify({ error: "Failed to read anomalies.json" }));
            } else {
              res.writeHead(200, {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              });
              res.end(data);
            }
          });
      } else {
        res.writeHead(404, {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",          });
        res.end(JSON.stringify({ error: "Not Found" }));
      }
      });

      server.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}/anomalies`);
      });
    });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});