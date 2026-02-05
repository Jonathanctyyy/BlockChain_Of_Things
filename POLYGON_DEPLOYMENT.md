# 🟣 DEPLOYING TO POLYGON NETWORK

## Prerequisites

### 1. Get Your Private Key
1. Open MetaMask
2. Click on your account menu (3 dots)
3. Account Details → Show Private Key
4. Copy your private key
5. Add to `.env` file: `POLYGON_PRIVATE_KEY=your_private_key_here`

⚠️ **NEVER share or commit your real private key!**

### 2. Get Test MATIC (for Testnet)
For **Polygon Amoy Testnet** (recommended):
- Faucet: https://faucet.polygon.technology/
- Select "Polygon Amoy"
- Paste your wallet address
- Request test MATIC

### 3. Get MATIC (for Mainnet)
For **Polygon Mainnet**:
- Buy MATIC on exchanges (Binance, Coinbase, etc.)
- Bridge from Ethereum: https://wallet.polygon.technology/
- You'll need ~0.1 MATIC for deployment

---

## Network Options

### 🧪 Polygon Amoy Testnet (Recommended for Testing)
```bash
# Set network in .env or use default
POLYGON_NETWORK=polygonAmoy
```
- Chain ID: 80002
- Free test MATIC
- Explorer: https://amoy.polygonscan.com

### 🟣 Polygon Mainnet (Production)
```bash
POLYGON_NETWORK=polygon
```
- Chain ID: 137
- Requires real MATIC
- Explorer: https://polygonscan.com

### 🔵 Polygon Mumbai Testnet (Deprecated)
```bash
POLYGON_NETWORK=polygonMumbai
```
- Chain ID: 80001
- Legacy testnet

---

## Step-by-Step Deployment

### Step 1: Configure Environment
Edit `.env` file:
```env
# Required: Your wallet private key
POLYGON_PRIVATE_KEY=0xYOUR_PRIVATE_KEY_HERE

# Optional: Choose network (default: polygonAmoy)
POLYGON_NETWORK=polygonAmoy

# Optional: Custom RPC endpoints (for better performance)
# Get free API keys from https://www.alchemy.com or https://infura.io
POLYGON_RPC_URL=https://polygon-mainnet.g.alchemy.com/v2/YOUR_API_KEY
POLYGON_AMOY_RPC_URL=https://polygon-amoy.g.alchemy.com/v2/YOUR_API_KEY
```

### Step 2: Deploy Contract
```bash
# Deploy to Polygon Amoy Testnet (default)
node scripts/deploy-polygon.js

# Or deploy to Polygon Mainnet
POLYGON_NETWORK=polygon node scripts/deploy-polygon.js
```

### Step 3: Update Your Scripts
The deployment script automatically updates `contract-address.json`, so your scripts (`process.js`, `evaluate_performance.js`) will use the new Polygon contract.

However, you need to update the Web3 provider URLs:

**In `process.js`:**
```javascript
// Change from local Hardhat
const web3 = new Web3('http://127.0.0.1:8545');

// To Polygon
const web3 = new Web3(process.env.POLYGON_RPC_URL || 'https://rpc-amoy.polygon.technology');
```

### Step 4: Update Frontend
**Update MetaMask Network:**
1. Open MetaMask
2. Click network dropdown
3. Select "Polygon Amoy" or "Polygon Mainnet"

**Frontend will automatically:**
- Load contract address from `contract-address.json`
- Connect to the network you selected in MetaMask

---

## Testing on Polygon

### Run Process Script on Polygon
```bash
# Make sure POLYGON_RPC_URL is set in scripts
node scripts/process.js
```

### Verify Transactions
Check transactions on PolygonScan:
- Testnet: https://amoy.polygonscan.com
- Mainnet: https://polygonscan.com

---

## Cost Comparison

| Operation | Polygon (MATIC) | Ethereum (ETH) |
|-----------|----------------|----------------|
| Register Machine | ~0.0001 MATIC (~$0.0001) | ~0.002 ETH (~$5) |
| Store Proof | ~0.0002 MATIC (~$0.0002) | ~0.003 ETH (~$7.50) |
| **100 Machines** | **~0.03 MATIC (~$0.03)** | **~0.5 ETH (~$1,250)** |

**💰 Polygon is ~40,000x cheaper than Ethereum mainnet!**

---

## Troubleshooting

### ❌ "Insufficient funds for gas"
- Get test MATIC from faucet: https://faucet.polygon.technology/
- For mainnet, ensure you have at least 0.1 MATIC

### ❌ "Transaction underpriced"
- Increase gas price in deployment script
- Try again in a few minutes

### ❌ "Nonce too low"
- Reset MetaMask: Settings → Advanced → Reset Account

### ❌ "Cannot connect to RPC"
- Check your internet connection
- Try a different RPC endpoint (Alchemy, Infura)

---

## Optional: Verify Contract on PolygonScan

After deployment, verify your contract for transparency:

```bash
# Install verification plugin
npm install --save-dev @nomicfoundation/hardhat-verify

# Verify on Polygon
npx hardhat verify --network polygonAmoy YOUR_CONTRACT_ADDRESS

# Or for mainnet
npx hardhat verify --network polygon YOUR_CONTRACT_ADDRESS
```

Get API key from: https://polygonscan.com/apis

---

## Production Checklist

Before deploying to Polygon Mainnet:

- [ ] Tested thoroughly on Polygon Amoy Testnet
- [ ] All functions work correctly
- [ ] Gas costs estimated
- [ ] Private key secured (use hardware wallet for production)
- [ ] Sufficient MATIC balance (~0.2 MATIC recommended)
- [ ] Contract verified on PolygonScan
- [ ] Frontend connected to correct network
- [ ] Backup of deployment info saved

---

## Benefits of Polygon

✅ **Low Gas Fees**: 40,000x cheaper than Ethereum  
✅ **Fast Transactions**: 2-3 second block time  
✅ **EVM Compatible**: Same Solidity contracts work  
✅ **High Throughput**: 7,000+ TPS  
✅ **Ethereum Security**: Secured by Ethereum mainnet  
✅ **Large Ecosystem**: DeFi, NFTs, Gaming

---

## Support

- Polygon Docs: https://docs.polygon.technology/
- Polygon Discord: https://discord.gg/polygon
- Faucet: https://faucet.polygon.technology/
- Explorer: https://polygonscan.com/
