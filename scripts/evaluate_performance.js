import Web3 from 'web3';
import fs from 'fs';
import dotenv from 'dotenv';
import * as secp from '@noble/secp256k1';
import { hmac } from '@noble/hashes/hmac.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { concatBytes } from '@noble/hashes/utils.js';

secp.hashes.sha256 = sha256;
secp.hashes.hmacSha256 = (key, ...messages) => hmac(sha256, key, concatBytes(...messages));

dotenv.config();

// Initialize Web3
const web3 = new Web3('http://127.0.0.1:8545');

// Load contract address and ABI
const deploymentInfo = JSON.parse(fs.readFileSync('./contract-address.json', 'utf8'));
const contractAddress = deploymentInfo.contractAddress;
const contractABI = JSON.parse(fs.readFileSync('./artifacts/contracts/PredictiveMaintenance.sol/PredictiveMaintenance.json', 'utf8')).abi;

console.log('='.repeat(80));
console.log('📊 BLOCKCHAIN PERFORMANCE EVALUATION');
console.log('='.repeat(80));
console.log(`Contract: ${contractAddress}`);
console.log(`Deployed: ${deploymentInfo.deployedAt}`);
console.log('='.repeat(80));

// Evaluation Configuration
const TEST_SCENARIOS = [
    { name: 'Single Machine Registration', machineCount: 1 },
    { name: 'Batch Machine Registration (10)', machineCount: 10 },
    { name: 'Batch Machine Registration (50)', machineCount: 50 },
    { name: 'Batch Machine Registration (100)', machineCount: 100 }
];

const OPERATION_TYPES = {
    REGISTER_MACHINE: 'registerMachine',
    STORE_PROOF: 'storeProof',
    VERIFY_SIGNATURE: 'verifySignature'
};

// Performance metrics storage
const performanceMetrics = {
    gasMetrics: [],
    latencyMetrics: [],
    scalabilityMetrics: [],
    timestamp: new Date().toISOString(),
    contractAddress: contractAddress
};

// Utility: Generate test data
function generateTestData(machineID) {
    const testData = `2024-01-01 00:00:00,${machineID},170.5,45.2,NORMAL`;
    const dataHash = web3.utils.soliditySha3(testData);
    const merkleRoot = web3.utils.randomHex(32);
    return { testData, dataHash, merkleRoot };
}

// Utility: Create signature
function createSignature(dataHash, privateKey) {
    // Use web3's sign method which automatically adds EIP-191 prefix
    const signResult = web3.eth.accounts.sign(dataHash, privateKey);
    return signResult.signature;
}

// 1. GAS COST EVALUATION
async function evaluateGasCost(contract, accounts) {
    console.log('\n' + '='.repeat(80));
    console.log('⛽ GAS COST EVALUATION');
    console.log('='.repeat(80));

    const machinePrivateKey = process.env.MACHINE_PRIVATE_KEY;
    const machineAddress = web3.eth.accounts.privateKeyToAccount(machinePrivateKey).address;
    const fromAccount = accounts[0];

    // Test 1: Machine Registration Gas Cost
    console.log('\n📋 Test 1: Machine Registration Gas Cost');
    const machineID = `TEST_${Date.now()}`;
    const regTx = await contract.methods.registerMachine(machineID, machineAddress)
        .send({ from: fromAccount, gas: 3000000 });
    
    const regGasUsed = regTx.gasUsed;
    const regGasPrice = await web3.eth.getGasPrice();
    const regCostWei = BigInt(regGasUsed) * BigInt(regGasPrice);
    const regCostEth = web3.utils.fromWei(regCostWei.toString(), 'ether');

    console.log(`   Gas Used: ${regGasUsed}`);
    console.log(`   Gas Price: ${web3.utils.fromWei(regGasPrice, 'gwei')} Gwei`);
    console.log(`   Total Cost: ${regCostEth} ETH`);

    performanceMetrics.gasMetrics.push({
        operation: 'registerMachine',
        gasUsed: regGasUsed,
        gasPriceGwei: web3.utils.fromWei(regGasPrice, 'gwei'),
        costEth: regCostEth,
        txHash: regTx.transactionHash
    });

    // Test 2: Store Proof Gas Cost
    console.log('\n📋 Test 2: Store Proof Gas Cost');
    const { merkleRoot } = generateTestData(machineID);
    const storeTx = await contract.methods.storeProof(machineID, merkleRoot, false)
        .send({ from: fromAccount, gas: 3000000 });
    
    const storeGasUsed = storeTx.gasUsed;
    const storeCostWei = BigInt(storeGasUsed) * BigInt(regGasPrice);
    const storeCostEth = web3.utils.fromWei(storeCostWei.toString(), 'ether');

    console.log(`   Gas Used: ${storeGasUsed}`);
    console.log(`   Total Cost: ${storeCostEth} ETH`);

    performanceMetrics.gasMetrics.push({
        operation: 'storeProof',
        gasUsed: storeGasUsed,
        gasPriceGwei: web3.utils.fromWei(regGasPrice, 'gwei'),
        costEth: storeCostEth,
        txHash: storeTx.transactionHash
    });

    // Test 3: Verify Signature Gas Cost (view function - no gas consumed)
    console.log('\n📋 Test 3: Verify Signature Gas Cost (View Function)');
    const { dataHash } = generateTestData(machineID);
    const signature = createSignature(dataHash, machinePrivateKey);
    
    // View functions don't consume gas, but we can estimate
    const estimatedGas = await contract.methods.verifySignature(machineID, dataHash, signature)
        .estimateGas({ from: fromAccount });
    
    console.log(`   Estimated Gas: ${estimatedGas} (view function - no actual cost)`);

    performanceMetrics.gasMetrics.push({
        operation: 'verifySignature',
        gasUsed: 0,
        estimatedGas: estimatedGas,
        gasPriceGwei: 0,
        costEth: 0,
        note: 'View function - no gas consumed'
    });

    return { regGasUsed, storeGasUsed };
}

// 2. LATENCY EVALUATION
async function evaluateLatency(contract, accounts) {
    console.log('\n' + '='.repeat(80));
    console.log('⏱️  LATENCY EVALUATION');
    console.log('='.repeat(80));

    const machinePrivateKey = process.env.MACHINE_PRIVATE_KEY;
    const machineAddress = web3.eth.accounts.privateKeyToAccount(machinePrivateKey).address;
    const fromAccount = accounts[0];
    const iterations = 10;

    // Test 1: Registration Latency
    console.log(`\n📋 Test 1: Machine Registration Latency (${iterations} iterations)`);
    const regLatencies = [];
    
    for (let i = 0; i < iterations; i++) {
        const machineID = `LATENCY_TEST_${Date.now()}_${i}`;
        const startTime = Date.now();
        
        await contract.methods.registerMachine(machineID, machineAddress)
            .send({ from: fromAccount, gas: 3000000 });
        
        const endTime = Date.now();
        const latency = endTime - startTime;
        regLatencies.push(latency);
    }

    const avgRegLatency = regLatencies.reduce((a, b) => a + b, 0) / regLatencies.length;
    const minRegLatency = Math.min(...regLatencies);
    const maxRegLatency = Math.max(...regLatencies);

    console.log(`   Average Latency: ${avgRegLatency.toFixed(2)} ms`);
    console.log(`   Min Latency: ${minRegLatency} ms`);
    console.log(`   Max Latency: ${maxRegLatency} ms`);

    performanceMetrics.latencyMetrics.push({
        operation: 'registerMachine',
        iterations: iterations,
        avgLatencyMs: avgRegLatency,
        minLatencyMs: minRegLatency,
        maxLatencyMs: maxRegLatency,
        samples: regLatencies
    });

    // Test 2: Store Proof Latency
    console.log(`\n📋 Test 2: Store Proof Latency (${iterations} iterations)`);
    const storeLatencies = [];
    
    for (let i = 0; i < iterations; i++) {
        const machineID = `LATENCY_TEST_${Date.now()}_${i}`;
        const { merkleRoot } = generateTestData(machineID);
        const startTime = Date.now();
        
        await contract.methods.storeProof(machineID, merkleRoot, false)
            .send({ from: fromAccount, gas: 3000000 });
        
        const endTime = Date.now();
        const latency = endTime - startTime;
        storeLatencies.push(latency);
    }

    const avgStoreLatency = storeLatencies.reduce((a, b) => a + b, 0) / storeLatencies.length;
    const minStoreLatency = Math.min(...storeLatencies);
    const maxStoreLatency = Math.max(...storeLatencies);

    console.log(`   Average Latency: ${avgStoreLatency.toFixed(2)} ms`);
    console.log(`   Min Latency: ${minStoreLatency} ms`);
    console.log(`   Max Latency: ${maxStoreLatency} ms`);

    performanceMetrics.latencyMetrics.push({
        operation: 'storeProof',
        iterations: iterations,
        avgLatencyMs: avgStoreLatency,
        minLatencyMs: minStoreLatency,
        maxLatencyMs: maxStoreLatency,
        samples: storeLatencies
    });

    // Test 3: Verify Signature Latency (view function)
    console.log(`\n📋 Test 3: Verify Signature Latency (${iterations} iterations)`);
    const verifyLatencies = [];
    const machineID = `VERIFY_TEST`;
    const { dataHash } = generateTestData(machineID);
    const signature = createSignature(dataHash, machinePrivateKey);
    
    for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        
        await contract.methods.verifySignature(machineID, dataHash, signature).call();
        
        const endTime = Date.now();
        const latency = endTime - startTime;
        verifyLatencies.push(latency);
    }

    const avgVerifyLatency = verifyLatencies.reduce((a, b) => a + b, 0) / verifyLatencies.length;
    const minVerifyLatency = Math.min(...verifyLatencies);
    const maxVerifyLatency = Math.max(...verifyLatencies);

    console.log(`   Average Latency: ${avgVerifyLatency.toFixed(2)} ms`);
    console.log(`   Min Latency: ${minVerifyLatency} ms`);
    console.log(`   Max Latency: ${maxVerifyLatency} ms`);

    performanceMetrics.latencyMetrics.push({
        operation: 'verifySignature',
        iterations: iterations,
        avgLatencyMs: avgVerifyLatency,
        minLatencyMs: minVerifyLatency,
        maxLatencyMs: maxVerifyLatency,
        samples: verifyLatencies,
        note: 'View function - no transaction'
    });
}

// 3. SCALABILITY EVALUATION
async function evaluateScalability(contract, accounts) {
    console.log('\n' + '='.repeat(80));
    console.log('📈 SCALABILITY EVALUATION');
    console.log('='.repeat(80));

    const machinePrivateKey = process.env.MACHINE_PRIVATE_KEY;
    const machineAddress = web3.eth.accounts.privateKeyToAccount(machinePrivateKey).address;
    const fromAccount = accounts[0];

    for (const scenario of TEST_SCENARIOS) {
        console.log(`\n📋 ${scenario.name}`);
        const startTime = Date.now();
        const gasUsed = [];

        for (let i = 0; i < scenario.machineCount; i++) {
            const machineID = `SCALE_TEST_${Date.now()}_${i}`;
            
            // Register machine
            const regTx = await contract.methods.registerMachine(machineID, machineAddress)
                .send({ from: fromAccount, gas: 3000000 });
            
            // Store proof
            const { merkleRoot } = generateTestData(machineID);
            const storeTx = await contract.methods.storeProof(machineID, merkleRoot, false)
                .send({ from: fromAccount, gas: 3000000 });
            
            gasUsed.push({
                register: regTx.gasUsed,
                store: storeTx.gasUsed
            });

            // Progress indicator
            if ((i + 1) % 10 === 0) {
                console.log(`   Progress: ${i + 1}/${scenario.machineCount} machines`);
            }
        }

        const endTime = Date.now();
        const totalTime = endTime - startTime;
        const throughput = (scenario.machineCount / (totalTime / 1000)).toFixed(2);

        // Convert BigInt to Number for calculations
        const avgRegGas = gasUsed.reduce((sum, g) => sum + Number(g.register), 0) / gasUsed.length;
        const avgStoreGas = gasUsed.reduce((sum, g) => sum + Number(g.store), 0) / gasUsed.length;
        const totalGas = gasUsed.reduce((sum, g) => sum + Number(g.register) + Number(g.store), 0);

        console.log(`   ✅ Completed in ${(totalTime / 1000).toFixed(2)} seconds`);
        console.log(`   Throughput: ${throughput} transactions/second`);
        console.log(`   Average Gas per Registration: ${avgRegGas.toFixed(0)}`);
        console.log(`   Average Gas per Store Proof: ${avgStoreGas.toFixed(0)}`);
        console.log(`   Total Gas Used: ${totalGas}`);

        performanceMetrics.scalabilityMetrics.push({
            scenario: scenario.name,
            machineCount: scenario.machineCount,
            totalTimeMs: totalTime,
            totalTimeSec: (totalTime / 1000).toFixed(2),
            throughputTxPerSec: throughput,
            avgRegGas: avgRegGas.toFixed(0),
            avgStoreGas: avgStoreGas.toFixed(0),
            totalGas: totalGas
        });
    }
}

// SUMMARY AND REPORT GENERATION
function generateSummary() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 PERFORMANCE SUMMARY');
    console.log('='.repeat(80));

    // Gas Cost Summary
    console.log('\n⛽ Gas Cost Summary:');
    performanceMetrics.gasMetrics.forEach(metric => {
        if (metric.operation === 'verifySignature') {
            console.log(`   ${metric.operation}: ${metric.estimatedGas} gas (estimated, no cost)`);
        } else {
            console.log(`   ${metric.operation}: ${metric.gasUsed} gas (~${metric.costEth} ETH)`);
        }
    });

    // Latency Summary
    console.log('\n⏱️  Latency Summary:');
    performanceMetrics.latencyMetrics.forEach(metric => {
        console.log(`   ${metric.operation}: ${metric.avgLatencyMs.toFixed(2)} ms (avg)`);
    });

    // Scalability Summary
    console.log('\n📈 Scalability Summary:');
    performanceMetrics.scalabilityMetrics.forEach(metric => {
        console.log(`   ${metric.scenario}: ${metric.throughputTxPerSec} tx/sec`);
    });

    // Save to file with BigInt handling
    fs.writeFileSync(
        './performance-evaluation.json',
        JSON.stringify(performanceMetrics, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        , 2),
        'utf8'
    );

    console.log('\n✅ Performance evaluation complete!');
    console.log('📄 Results saved to: performance-evaluation.json');
}

// MAIN EXECUTION
async function main() {
    try {
        const contract = new web3.eth.Contract(contractABI, contractAddress);
        const accounts = await web3.eth.getAccounts();

        console.log(`\n🔗 Connected to blockchain`);
        console.log(`📝 Using account: ${accounts[0]}\n`);

        // Run evaluations
        await evaluateGasCost(contract, accounts);
        await evaluateLatency(contract, accounts);
        await evaluateScalability(contract, accounts);

        // Generate summary
        generateSummary();

    } catch (error) {
        console.error('❌ Error during evaluation:', error);
        process.exit(1);
    }
}

main();
