import fs from "fs";
import csvParser from "csv-parser";
import { ethers } from "ethers";
import { spawn } from "child_process";
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
  {
    inputs: [],
    name: "minVoltage",
    outputs: [{ internalType: "int256", name: "", type: "int256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "maxVoltage",
    outputs: [{ internalType: "int256", name: "", type: "int256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "minRotation",
    outputs: [{ internalType: "int256", name: "", type: "int256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "maxRotation",
    outputs: [{ internalType: "int256", name: "", type: "int256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "minPressure",
    outputs: [{ internalType: "int256", name: "", type: "int256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "maxPressure",
    outputs: [{ internalType: "int256", name: "", type: "int256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "maxVibration",
    outputs: [{ internalType: "int256", name: "", type: "int256" }],
    stateMutability: "view",
    type: "function",
  },
];
async function main() {
  const rpcUrl = process.env.RPC_URL || "http://localhost:8545";
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const privateKey = process.env.PRIVATE_KEY || "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e";
  const signer = new ethers.Wallet(privateKey, provider);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  try {
    const network = await provider.getNetwork();
    console.log(`Connected to network: chainId=${network.chainId}, name=${network.name}`);
    const code = await provider.getCode(CONTRACT_ADDRESS);
    if (!code || code === "0x") {
      console.error(`No contract code at ${CONTRACT_ADDRESS} on this network.`);
      process.exit(1);
    }
    const address = await signer.getAddress();
    const balance = await provider.getBalance(address);
    console.log(`Using wallet address: ${address}`);
    console.log(`Wallet balance: ${ethers.formatEther(balance)} ETH`);
  } catch (err) {
    console.error("Provider/contract/wallet check failed:", err.message || err);
    process.exit(1);
  }
  const filePath = "iot-data/PdM_telemetry.csv";
  const anomalyMachineIDs = [];
  // === Gas aggregation variables (added) ===
  let totalTx = 0;
  let totalGas = 0n;
  let totalWei = 0n;
  const perTx = [];
  let anomalyGas = 0n;
  let anomalyWei = 0n;
  let anomalyCount = 0;
  // Flag to prevent multiple calls to handleEndOfProcessing
  let processed = false;
  // Function to handle end-of-processing logic
  const handleEndOfProcessing = async () => {
    if (processed) return; // Skip if already called
    processed = true;
    console.log("Finished processing first 100 rows of CSV file.");
    console.log("Local list of machines with anomalies:", anomalyMachineIDs);
    // Anomalies JSON
    const anomalyData = { localAnomalies: anomalyMachineIDs };
    fs.mkdirSync("frontend", { recursive: true });
    // Contract anomaly list
    try {
        const anomalies = await contract.getAnomalyMachineIDs();
        anomalyData.contractAnomalies = anomalies;
        console.log("Contract anomalies retrieved successfully.");
      } catch (error) {
        console.error("Error retrieving anomaly machine IDs:", error.message);
      }
    // Save once, after attempting to fetch contract data
    fs.writeFileSync("frontend/anomalies.json", JSON.stringify(anomalyData, null, 2));
    console.log("Anomalies saved to frontend/anomalies.json");
    // === Gas summary output & file (added) ===
    const summary = {
      totalSubmittedTx: totalTx,
      totalGasUsed: totalGas.toString(),
      totalEthSpent: ethers.formatEther(totalWei),
      anomaly: {
        count: anomalyCount,
        gasUsed: anomalyGas.toString(),
        ethSpent: ethers.formatEther(anomalyWei),
        avgGasPerTx: anomalyCount ? (anomalyGas / BigInt(anomalyCount)).toString() : "0",
      },
      overallAvgGasPerTx: totalTx ? (totalGas / BigInt(totalTx)).toString() : "0",
    };
    fs.writeFileSync(
      "frontend/iot-gas-report.json",
      JSON.stringify({ summary, perTx, generatedAt: new Date().toISOString() }, null, 2),
      "utf-8"
    );
    console.log("Gas summary:", summary);
    console.log("Saved frontend/iot-gas-report.json");
    // Serve frontend
    try {
      const servePort = process.env.SERVE_PORT || "8045";
      console.log(`Starting frontend server: npx http-server frontend -p ${servePort} --cors`);
      const serve = spawn("npx", ["http-server", "frontend", "-p", servePort, "--cors"], {
        stdio: "inherit",
        shell: true,
      });
      serve.on("error", (err) => console.error("http-server error:", err.message || err));
    } catch (err) {
      console.error("Failed to start http-server:", err.message || err);
    }
  };
  let rowCount = 0;
  // Fetch initial nonce (use 'pending' to include any unmined txs)
  let currentNonce = await provider.getTransactionCount(signer.address, 'pending');
  const stream = fs.createReadStream(filePath)
    .pipe(csvParser())
    .on("data", async function (row) {  // Use regular function for correct 'this'
      rowCount++;
      if (rowCount > 100) {
        this.destroy();
        await handleEndOfProcessing();
        return;
      }
      this.pause();  // Pause to process sequentially
      let retryCount = 0;
      const maxRetries = 3;
      while (retryCount <= maxRetries) {
        try {
          // Validate data before processing
          const machineID = row["machineID"];
          const voltage = parseFloat(row["voltage"]);
          const rotation = parseFloat(row["rotation"]);
          const pressure = parseFloat(row["pressure"]);
          const vibration = parseFloat(row["vibration"]);

          // Skip rows with invalid data
          if (isNaN(voltage) || isNaN(rotation) || isNaN(pressure) || isNaN(vibration)) {
            console.error(`Invalid data for Machine_ID=${machineID}, skipping row.`);
            this.resume();
            return;
          }

          // Fetch thresholds dynamically from the contract
          const minVoltage = await contract.minVoltage();
          const maxVoltage = await contract.maxVoltage();
          const minRotation = await contract.minRotation();
          const maxRotation = await contract.maxRotation();
          const minPressure = await contract.minPressure();
          const maxPressure = await contract.maxPressure();
          const maxVibration = await contract.maxVibration();
          console.log("Fetched thresholds:", {
              minVoltage, maxVoltage,
              minRotation, maxRotation,
              minPressure, maxPressure,
              maxVibration
          });

          // Check for anomalies using contract thresholds
          const isVoltageAnomaly = voltage < minVoltage || voltage > maxVoltage;
          const isRotationAnomaly = rotation < minRotation || rotation > maxRotation;
          const isPressureAnomaly = pressure < minPressure || pressure > maxPressure;
          const isVibrationAnomaly = vibration > maxVibration;

          if (isVoltageAnomaly || isRotationAnomaly || isPressureAnomaly || isVibrationAnomaly) {
            console.log(`Sending data: Machine_ID=${machineID}, Voltage=${voltage}, Rotation=${rotation}, Pressure=${pressure}, Vibration=${vibration}`);
            anomalyMachineIDs.push(machineID);
            const anomalyData = Math.round((voltage + rotation + pressure + vibration) * 100);

            // Send transaction
            console.log(`Using nonce: ${currentNonce} for Machine_ID=${machineID}`);
            const tx = await contract.checkData(machineID, anomalyData, { nonce: currentNonce });
            const receipt = await tx.wait();
            console.log(`Transaction successful: ${receipt.transactionHash}`);
            currentNonce++;
          } else {
            console.log(`All parameters within range for Machine_ID=${machineID}, skipping...`);
          }
        } catch (error) {
          console.error(`Error processing row (attempt ${retryCount + 1}): ${error.message}`);
          if (error.message.includes("nonce") && retryCount < maxRetries) {
            currentNonce = await provider.getTransactionCount(signer.address, 'pending');
            retryCount++;
          } else {
            break;
          }
        }
      }
      this.resume();  // Resume for next row
    })
    .on("end", async () => {
      // This may not trigger if destroyed early, but kept for completeness
      if (rowCount <= 100) {
        await handleEndOfProcessing();
      }
    });
}
main().catch((error) => {
  console.error(error);
  process.exit(1);
});