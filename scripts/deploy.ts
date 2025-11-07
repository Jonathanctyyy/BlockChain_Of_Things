import hre from "hardhat";

async function main() {
  console.log("Deploying AnomalyDetection...");

  // This will now work
  const AnomalyDetector = await hre.ethers.getContractFactory("AnomalyDetection");
  const contract = await AnomalyDetector.deploy();

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log("AnomalyDetection deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});