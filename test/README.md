# Test Directory

This directory contains all test files for the BlockChain of Things project.

## Structure

```
test/
├── PredictiveMaintenance.test.js              # (Removed - incompatible)
├── Counter.ts                                  # Hardhat Viem tests
├── mocha/                                      # Standalone Mocha/Chai tests
│   ├── PredictiveMaintenance.mocha.test.js   # Tests for main contract
│   └── README.md                              # Instructions for running
└── echidna/                                    # Echidna property-based tests
    └── EchidnaPredictiveMaintenanceTest.sol   # Fuzzing tests for main contract
```

## Test Types

### 1. Mocha/Chai Tests (JavaScript)
- **Files**: `mocha/*.test.js`
- **Purpose**: Standalone tests using ethers.js directly
- **Requirements**: Hardhat node must be running
- **Run**: See `mocha/README.md` for detailed instructions

Quick start:
```bash
# Terminal 1: Start Hardhat node
npx hardhat node

# Terminal 2: Run tests
npm run compile
npm run test:mocha
```

### 2. Hardhat Tests (TypeScript)
- **Files**: `*.ts`
- **Purpose**: Integration tests using Hardhat's testing framework
- **Run**: `npm run test`

### 3. Echidna Tests (Solidity)
- **Directory**: `echidna/`
- **Purpose**: Property-based fuzzing to find edge cases
- **Run**: `npm run test:echidna:predictive`

## Running Tests

### Quick Start
```bash
# Install dependencies (if needed)
npm install

# For Mocha/Chai tests:
# Terminal 1:
npx hardhat node

# Terminal 2:
npm run compile
npm run test:mocha

# For Hardhat Viem tests:
npm run test
```

### Detailed Commands
See the [TESTING_GUIDE.md](../TESTING_GUIDE.md) in the root directory for complete instructions.

## Test Coverage

Current test coverage includes:
- ✅ Contract deployment
- ✅ Proof storage (with/without anomalies)
- ✅ Machine registration and management
- ✅ Signature verification
- ✅ Merkle proof verification
- ✅ Insurance claim validation
- ✅ Edge cases and error handling
- ✅ Event emissions
- ✅ Security properties

## Writing New Tests

### Mocha/Chai Test Template
```javascript
import { expect } from "chai";
import { ethers } from "hardhat";

describe("YourContract", function () {
  let contract;
  let owner;

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    const Contract = await ethers.getContractFactory("YourContract");
    contract = await Contract.deploy();
    await contract.waitForDeployment();
  });

  describe("Feature Name", function () {
    it("Should do something", async function () {
      // Your test here
      expect(await contract.someFunction()).to.equal(expectedValue);
    });
  });
});
```

**Note**: This project uses ES modules (`"type": "module"` in package.json), so use `import` instead of `require`.

### Echidna Property Template
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../contracts/YourContract.sol";

contract EchidnaYourContractTest {
    YourContract internal contract_;
    
    constructor() {
        contract_ = new YourContract();
    }
    
    // Property: something should never happen
    function echidna_property_name() public view returns (bool) {
        // Return true if property holds
        return someCondition;
    }
}
```

## Test Best Practices

1. **Isolate tests**: Each test should be independent
2. **Use descriptive names**: Clearly describe what is being tested
3. **Test edge cases**: Include boundary conditions
4. **Check events**: Verify that events are emitted correctly
5. **Test reverts**: Ensure errors are thrown when expected
6. **Mock when needed**: Use mocks for external dependencies
7. **Keep tests fast**: Optimize test execution time

## Continuous Integration

These tests are designed to run in CI/CD pipelines. See `.github/workflows/` for CI configuration examples.

## Troubleshooting

### Tests Fail Locally
1. Ensure all dependencies are installed: `npm install`
2. Compile contracts: `npm run compile`
3. Check Node.js version (should be 16+)
4. Clear cache: `npm run clean`

### Timeout Errors
Increase timeout:
```bash
npx mocha test/**/*.test.js --timeout 60000
```

### Import Errors
Make sure you're using the correct module type in hardhat.config.ts

## Additional Resources

- [Mocha Documentation](https://mochajs.org/)
- [Chai Assertions](https://www.chaijs.com/)
- [Hardhat Testing](https://hardhat.org/hardhat-runner/docs/guides/test-contracts)
- [Echidna Documentation](https://github.com/crytic/echidna)

---

For complete testing documentation, see [TESTING_GUIDE.md](../TESTING_GUIDE.md)
