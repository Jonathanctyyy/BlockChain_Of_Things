import fs from "fs";
import { ethers } from "ethers";

// Deployed contract config
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || "0x73511669fd4dE447feD18BB79bAFeAC93aB7F31f";
const CONTRACT_ABI = [
  // checkData(string,int256)
  {
    inputs: [
      { internalType: "string", name: "machineID", type: "string" },
      { internalType: "int256", name: "data", type: "int256" },
    ],
    name: "checkData",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // thresholds (optional)
  { inputs: [], name: "minThreshold", outputs: [{ internalType: "int256", name: "", type: "int256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "maxThreshold", outputs: [{ internalType: "int256", name: "", type: "int256" }], stateMutability: "view", type: "function" },
  // heuristic estimator (if you added it in Solidity)
  {
    inputs: [
      { internalType: "string", name: "machineID", type: "string" },
      { internalType: "int256", name: "data", type: "int256" },
    ],
    name: "approximateCheckDataGas",
    outputs: [
      { internalType: "uint256", name: "estimatedGas", type: "uint256" },
      { internalType: "bool", name: "willBeAnomaly", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
];

// Env/config
const RPC_URL = process.env.RPC_URL || "http://127.0.0.1:8545";
let PRIVATE_KEY =
  process.env.PRIVATE_KEY ||
  "0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e"; // Hardhat local key (dev only)
const RUNS = parseInt(process.env.RUNS || "1", 10);
const DRY_RUN = (process.env.DRY_RUN || "false").toLowerCase() === "true";

// Helpers
async function resolveEffectiveGasPrice(provider, receipt, tx) {
  const egp =
    receipt.effectiveGasPrice ??
    tx.gasPrice ??
    tx.maxFeePerGas ??
    null;

  if (egp != null) return egp;

  if (receipt.blockNumber != null && tx.maxPriorityFeePerGas != null) {
    const block = await provider.getBlock(receipt.blockNumber);
    const base = block?.baseFeePerGas ?? 0n;
    return base + tx.maxPriorityFeePerGas;
  }
  return 0n;
}

async function measureOnce({ provider, signer, contract, iface, machineID, value }) {
  // Optional on-chain heuristic
  let heuristicEstimated = "n/a";
  let willBeAnomaly = null;
  if (typeof contract.approximateCheckDataGas === "function") {
    try {
      const r = await contract.approximateCheckDataGas(machineID, value);
      heuristicEstimated = (r.estimatedGas ?? r[0]).toString();
      willBeAnomaly = (r.willBeAnomaly ?? r[1]);
    } catch {}
  }

  // Robust off-chain estimation via provider (no contract helpers)
  const data = iface.encodeFunctionData("checkData", [machineID, value]);
  const from = await signer.getAddress();
  let estimated = 0n;
  try {
    estimated = await provider.estimateGas({ from, to: CONTRACT_ADDRESS, data });
  } catch (e) {
    console.error("estimateGas failed:", e.message || e);
  }

  if (DRY_RUN) {
    return {
      machineID,
      value,
      heuristicEstimated,
      willBeAnomaly,
      estimated: estimated.toString(),
      sent: false,
      gasUsed: "0",
      totalWei: "0",
      totalEth: "0",
      txHash: null,
    };
  }

  // Send tx
  const tx = await contract.checkData(machineID, value);
  const receipt = await tx.wait();

  const gasUsed = receipt.gasUsed ?? 0n;
  const egp = await resolveEffectiveGasPrice(provider, receipt, tx);
  const totalWei = gasUsed * egp;

  return {
    machineID,
    value,
    heuristicEstimated,
    willBeAnomaly,
    estimated: estimated.toString(),
    sent: true,
    gasUsed: gasUsed.toString(),
    effectiveGasPriceWei: egp.toString(),
    totalWei: totalWei.toString(),
    totalEth: ethers.formatEther(totalWei),
    txHash: receipt.hash,
  };
}

async function main() {
  if (!PRIVATE_KEY.startsWith("0x")) PRIVATE_KEY = `0x${PRIVATE_KEY}`;

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);
  const iface = new ethers.Interface(CONTRACT_ABI);
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

  // Connectivity checks
  const network = await provider.getNetwork();
  console.log(`Connected to chainId=${network.chainId} (${network.name})`);
  const code = await provider.getCode(CONTRACT_ADDRESS);
  if (!code || code === "0x") {
    throw new Error(`No contract at ${CONTRACT_ADDRESS} on this RPC. Check address/network.`);
  }
  const addr = await signer.getAddress();
  const bal = await provider.getBalance(addr);
  console.log(`Wallet: ${addr} (${ethers.formatEther(bal)} ETH)`);

  // Build sample inputs using thresholds if available
  let min = 10n, max = 100n;
  try { min = await contract.minThreshold(); max = await contract.maxThreshold(); } catch {}
  const mid = min + (max - min) / 2n;
  const out = max + 10n;

  const tests = [
    { machineID: "MC_020001", value: Number(mid) },
    { machineID: "MC_000567", value: Number(out) },
  ];

  const allResults = [];
  for (const t of tests) {
    console.log(`\nTesting checkData(machineID="${t.machineID}", value=${t.value})`);
    let gasSum = 0n, weiSum = 0n;

    for (let i = 0; i < RUNS; i++) {
      const r = await measureOnce({ provider, signer, contract, iface, machineID: t.machineID, value: t.value });
      allResults.push(r);
      gasSum += BigInt(r.gasUsed || "0");
      weiSum += BigInt(r.totalWei || "0");
      console.log(
        `Run ${i + 1}: heuristic=${r.heuristicEstimated} anomaly=${r.willBeAnomaly} estimated=${r.estimated} gasUsed=${r.gasUsed} totalEth=${r.totalEth}`
      );
    }

    if (!DRY_RUN && RUNS > 0) {
      const avgGas = gasSum / BigInt(RUNS);
      const avgWei = weiSum / BigInt(RUNS);
      console.log(`Average: gasUsed=${avgGas} totalEth=${ethers.formatEther(avgWei)}`);
    }
  }

  // Optional: write report
  fs.mkdirSync("frontend", { recursive: true });
  fs.writeFileSync(
    "frontend/gas-report.json",
    JSON.stringify(
      { network: { chainId: Number(network.chainId), name: network.name }, contract: CONTRACT_ADDRESS, runs: RUNS, dryRun: DRY_RUN, results: allResults, generatedAt: new Date().toISOString() },
      null,
      2
    ),
    "utf-8"
  );
  console.log("\nGas report saved to frontend/gas-report.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});