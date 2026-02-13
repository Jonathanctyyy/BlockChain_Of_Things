const { ethers } = require('hardhat');
async function main() {
  const contract = await ethers.getContractAt('PredictiveMaintenance', '0x99e11a4A0cF1AbfDe6B5C391D8fcE45FC9A76e76');
  const functions = Object.keys(contract.interface.functions);
  console.log('Contract functions:', functions.filter(f => f.includes('Insurance') || f.includes('Policy')));
}
main();
