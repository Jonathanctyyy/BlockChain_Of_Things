import fs from "fs";
import csvParser from "csv-parser";
import { ethers } from "ethers";
import { spawn } from "child_process";
import http from "http";

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

  const filePath = "iot-data/factory_sensor_simulator_2040.csv";
  const anomalyMachineIDs = [];

  // === Gas aggregation variables (added) ===
  let totalTx = 0;
  let totalGas = 0n;
  let totalWei = 0n;
  const perTx = [];
  let anomalyGas = 0n;
  let anomalyWei = 0n;
  let anomalyCount = 0;

  fs.createReadStream(filePath)
    .pipe(csvParser())
    .on("data", async (row) => {
      // Pause stream to avoid too many pending tx (optional)
      this?.pause?.();
      try {
        const machineID = row["Machine_ID"];
        let temperature = parseFloat(row["Temperature_C"]);

        if (!isNaN(temperature) && (temperature < 10 || temperature > 100)) {
          console.log(`Sending data: Machine_ID=${machineID}, Temperature=${temperature}`);
          anomalyMachineIDs.push(machineID);

          // Gas estimate (robust fallback)
          let estimatedGas = 0n;
            try {
              estimatedGas = await contract.estimateGas.checkData(machineID, temperature);
            } catch {
              try {
                const dataCalldata = contract.interface.encodeFunctionData("checkData", [machineID, temperature]);
                estimatedGas = await provider.estimateGas({ to: CONTRACT_ADDRESS, data: dataCalldata });
              } catch {}
            }

          const tx = await contract.checkData(machineID, temperature);
          const receipt = await tx.wait();
          console.log(`Transaction successful: ${receipt.transactionHash}`);

          const gasUsed = receipt.gasUsed ?? 0n;
          const effectiveGasPrice = receipt.effectiveGasPrice ?? receipt.gasPrice ?? 0n;
          const weiCost = gasUsed * effectiveGasPrice;

          // Aggregate anomaly (only anomalies are sent)
          totalTx++;
          totalGas += gasUsed;
          totalWei += weiCost;
          anomalyCount++;
          anomalyGas += gasUsed;
          anomalyWei += weiCost;

          perTx.push({
            machineID,
            temperature,
            estimatedGas: estimatedGas.toString(),
            gasUsed: gasUsed.toString(),
            effectiveGasPriceWei: effectiveGasPrice.toString(),
            totalWei: weiCost.toString(),
            totalEth: ethers.formatEther(weiCost),
            txHash: receipt.hash,
          });

          console.log(
            `[GAS] machine=${machineID} temp=${temperature} est=${estimatedGas} used=${gasUsed} costEth=${ethers.formatEther(
              weiCost
            )}`
          );
          console.log(`Transaction successful for Machine_ID=${machineID}`);
        } else {
          console.log(`Temperature within range for Machine_ID=${machineID}, skipping...`);
        }
      } catch (error) {
        console.error(`Error processing row: ${error.message}`);
      } finally {
        this?.resume?.();
      }
    })
    .on("end", async () => {
      console.log("Finished processing CSV file.");
      console.log("Local list of machines with temperature anomalies:", anomalyMachineIDs);

      // Anomalies JSON
      const anomalyData = { localAnomalies: anomalyMachineIDs };
      fs.mkdirSync("frontend", { recursive: true });
      fs.writeFileSync("frontend/anomalies.json", JSON.stringify(anomalyData, null, 2));
      console.log("Local anomalies saved to frontend/anomalies.json");

      // Contract anomaly list
      try {
        const anomalies = await contract.getAnomalyMachineIDs();
        anomalyData.contractAnomalies = anomalies;
        fs.writeFileSync("frontend/anomalies.json", JSON.stringify(anomalyData, null, 2));
        console.log("Contract anomalies saved to frontend/anomalies.json");
      } catch (error) {
        console.error("Error retrieving anomaly machine IDs:", error.message);
      }

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
    });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});