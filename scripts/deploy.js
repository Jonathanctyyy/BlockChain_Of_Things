async function main() {
  const AnomalyDetector = await ethers.getContractFactory('AnomalyDetector');
  const anomalyDetector = await AnomalyDetector.deploy();
  await anomalyDetector.deployed();

  console.log('AnomalyDetector deployed to:', anomalyDetector.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
