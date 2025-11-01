# My Hardhat Project

This project is a simple Ethereum smart contract application built using Hardhat. It includes a basic smart contract, deployment scripts, and tests.

## Project Structure

```
my-hardhat-project
├── contracts
│   └── Greeter.sol          # Solidity smart contract for greeting messages
├── scripts
│   └── deploy.ts            # Script to deploy the Greeter contract
├── test
│   └── sample-test.ts       # Test cases for the Greeter contract
├── tasks
│   └── accounts.ts          # Task to display available accounts
├── hardhat.config.ts        # Hardhat configuration file
├── package.json             # npm configuration file
├── tsconfig.json            # TypeScript configuration file
├── .env                     # Environment variables for deployment
└── README.md                # Project documentation
```

## Installation

1. Clone the repository:
   ```
   git clone <repository-url>
   cd my-hardhat-project
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file in the root directory and add your environment variables.

## Usage

### Deploying the Contract

To deploy the `Greeter` contract, run the following command:
```
npx hardhat run scripts/deploy.ts --network <network-name>
```

### Running Tests

To run the tests for the `Greeter` contract, use:
```
npx hardhat test
```

### Available Tasks

To see the available tasks, run:
```
npx hardhat help
```

## License

This project is licensed under the MIT License.