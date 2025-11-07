# Blockchain of Things

This project integrates a Solidity smart contract with IoT data for anomaly detection.

## Folder Structure

- `contracts/`: Contains Solidity smart contracts.
- `scripts/`: Deployment scripts for the smart contract.
- `src/`: Backend server and utilities.
- `test/`: Test cases for the smart contract.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Compile the contract:
   ```bash
   npx hardhat compile
   ```

3. Deploy the contract:
   ```bash
   npx hardhat run scripts/deploy.js --network localhost
   ```

4. Start the server:
   ```bash
   node src/server/index.js
   ```

5. Test the contract:
   ```bash
   npx hardhat test
   ```
