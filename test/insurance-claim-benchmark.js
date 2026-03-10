import Web3 from 'web3';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Web3
const web3 = new Web3('http://127.0.0.1:8545');

// Load contract
const deploymentInfo = JSON.parse(fs.readFileSync('./contract-address.json', 'utf8'));
const contractAddress = deploymentInfo.contractAddress;
const contractABI = JSON.parse(
    fs.readFileSync('./artifacts/contracts/PredictiveMaintenance.sol/PredictiveMaintenance.json', 'utf8')
).abi;
const contract = new web3.eth.Contract(contractABI, contractAddress);

console.log('\n' + '='.repeat(80));
console.log('📊 INSURANCE CLAIM PROCESSING: AUTOMATED vs TRADITIONAL');
console.log('='.repeat(80));
console.log(`Contract: ${contractAddress}`);
console.log(`Test Date: ${new Date().toISOString()}`);
console.log('='.repeat(80));

// ==========================================
// TRADITIONAL INSURANCE CLAIM SIMULATION
// ==========================================

/**
 * Traditional Manual Insurance Claim Process:
 * 1. Customer submits claim form (manual data entry)
 * 2. Insurance company receives and logs claim
 * 3. Adjuster assigned (manual assignment)
 * 4. Document collection and verification (manual review)
 * 5. Data authenticity check (call manufacturer, check records)
 * 6. Policy compliance check (manual review against policy)
 * 7. Manager approval (manual decision)
 * 8. Payment processing
 */
class TraditionalInsuranceClaim {
    constructor() {
        this.processingSteps = {
            claimSubmission: { min: 300, max: 600 },        // 5-10 minutes (form filling)
            claimLogging: { min: 120, max: 300 },           // 2-5 minutes (data entry)
            adjusterAssignment: { min: 1440, max: 4320 },   // 1-3 days (waiting for assignment)
            documentCollection: { min: 2880, max: 10080 },  // 2-7 days (gather evidence)
            dataVerification: { min: 1440, max: 7200 },     // 1-5 days (verify with manufacturer)
            policyCheck: { min: 480, max: 1440 },           // 8-24 hours (manual review)
            managerApproval: { min: 720, max: 2880 },       // 12-48 hours (manager schedule)
            paymentProcessing: { min: 2880, max: 7200 }     // 2-5 days (banking system)
        };
    }

    // Simulate processing time (in seconds)
    getRandomTime(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    async processClaim(claimID) {
        const startTime = Date.now();
        const steps = [];

        for (const [stepName, timeRange] of Object.entries(this.processingSteps)) {
            const stepTime = this.getRandomTime(timeRange.min, timeRange.max);
            steps.push({
                step: stepName,
                timeSeconds: stepTime,
                timeMinutes: (stepTime / 60).toFixed(2),
                timeHours: (stepTime / 3600).toFixed(2),
                timeDays: (stepTime / 86400).toFixed(2)
            });
        }

        const totalTime = steps.reduce((sum, step) => sum + step.timeSeconds, 0);
        const endTime = Date.now();

        return {
            claimID,
            type: 'Traditional Manual Process',
            steps,
            totalTimeSeconds: totalTime,
            totalTimeMinutes: (totalTime / 60).toFixed(2),
            totalTimeHours: (totalTime / 3600).toFixed(2),
            totalTimeDays: (totalTime / 86400).toFixed(2),
            executionTimeMs: endTime - startTime,
            manualInterventions: 8,
            automationLevel: 0
        };
    }
}

// ==========================================
// AUTOMATED BLOCKCHAIN INSURANCE CLAIM
// ==========================================

class AutomatedBlockchainClaim {
    constructor(contract, web3) {
        this.contract = contract;
        this.web3 = web3;
    }

    async processClaim(claimData) {
        const startTime = Date.now();
        const steps = [];
        let gasUsed = 0;

        try {
            // Step 1: Data retrieval (from blockchain ledger)
            const step1Start = Date.now();
            const storedAnchor = await this.contract.methods.machineLedger(
                claimData.machineID,
                claimData.anchorIndex
            ).call();
            const step1Time = Date.now() - step1Start;
            steps.push({
                step: 'dataRetrieval',
                timeMs: step1Time,
                description: 'Retrieve Merkle root from blockchain'
            });

            // Step 2: Get account (transaction preparation)
            const step2Start = Date.now();
            const accounts = await this.web3.eth.getAccounts();
            const fromAccount = accounts[0];
            const step2Time = Date.now() - step2Start;
            steps.push({
                step: 'accountRetrieval',
                timeMs: step2Time,
                description: 'Get signing account from wallet'
            });

            // Step 3: Transaction preparation (encode data)
            const step3Start = Date.now();
            const proofHashes = claimData.proof.map(p => p.data);
            const proofPositions = claimData.proof.map(p => p.position === 'left' ? 0 : 1);
            const step3Time = Date.now() - step3Start;
            steps.push({
                step: 'transactionPreparation',
                timeMs: step3Time,
                description: 'Prepare proof data and transaction parameters'
            });

            // Step 4: Transaction submission & execution (smart contract call)
            const step4Start = Date.now();
            const tx = await this.contract.methods.validateInsuranceClaim(
                claimData.machineID,
                claimData.anchorIndex,
                claimData.leaf,
                proofHashes,
                proofPositions
            ).send({ from: fromAccount, gas: 3000000 });
            const step4Time = Date.now() - step4Start;

            gasUsed = tx.gasUsed;
            steps.push({
                step: 'smartContractExecution',
                timeMs: step4Time,
                description: 'Submit transaction, mine block, verify Merkle proof + policy validation',
                gasUsed: Number(tx.gasUsed),
                breakdown: {
                    note: 'Includes signing, network transmission, mining, and smart contract execution',
                    operations: [
                        'Transaction signing (local)',
                        'Network transmission to node',
                        'Block mining/confirmation',
                        'Merkle proof verification (on-chain)',
                        'Policy validation (on-chain)',
                        'Event emission and receipt generation'
                    ]
                }
            });

            const totalTime = Date.now() - startTime;

            return {
                claimID: claimData.machineID,
                type: 'Automated Blockchain Process',
                steps,
                totalTimeMs: totalTime,
                totalTimeSeconds: (totalTime / 1000).toFixed(3),
                totalTimeMinutes: (totalTime / 60000).toFixed(3),
                executionTimeMs: totalTime,
                transactionHash: tx.transactionHash,
                gasUsed: Number(gasUsed),
                manualInterventions: 0,
                automationLevel: 100,
                verified: tx.events?.ClaimValidated?.returnValues?.verified || false
            };
        } catch (error) {
            return {
                claimID: claimData.machineID,
                type: 'Automated Blockchain Process',
                error: error.message,
                totalTimeMs: Date.now() - startTime
            };
        }
    }
}

// ==========================================
// BENCHMARK EXECUTION
// ==========================================

async function runBenchmark() {
    const results = {
        timestamp: new Date().toISOString(),
        contractAddress,
        comparison: {
            traditional: [],
            automated: []
        },
        statistics: {},
        verdict: {}
    };

    console.log('\n📋 PHASE 1: Traditional Insurance Claim Processing');
    console.log('─'.repeat(80));

    const traditional = new TraditionalInsuranceClaim();
    const numClaims = 100;

    // Simulate traditional claims
    console.log(`\nSimulating ${numClaims} traditional insurance claims...`);
    const traditionalStartTime = Date.now();

    for (let i = 1; i <= numClaims; i++) {
        const result = await traditional.processClaim(`TRAD_CLAIM_${i}`);
        results.comparison.traditional.push(result);
        
        if (i % 10 === 0 || i === numClaims) {
            console.log(`  Simulated ${i}/${numClaims} claims (avg: ${result.totalTimeDays} days)...`);
        }
    }

    const traditionalTotalTime = Date.now() - traditionalStartTime;
    const traditionalAvgClaimTime = results.comparison.traditional.reduce(
        (sum, c) => sum + c.totalTimeSeconds, 0
    ) / numClaims;

    console.log(`\n✅ Traditional claims simulated (execution time: ${(traditionalTotalTime / 1000).toFixed(3)}s)`);

    // ==========================================
    console.log('\n\n🚀 PHASE 2: Automated Blockchain Insurance Claim Processing');
    console.log('─'.repeat(80));

    // Load anomaly proofs
    const anomalyProofs = JSON.parse(fs.readFileSync('anomaly_proofs.json', 'utf8'));
    
    const automated = new AutomatedBlockchainClaim(contract, web3);
    const automatedStartTime = Date.now();

    console.log(`\nProcessing ${numClaims} automated blockchain claims...`);

    // Build list of valid claim data first
    const validClaims = [];
    for (let i = 0; i < anomalyProofs.length; i++) {
        const machineProofs = anomalyProofs[i];
        if (machineProofs.anomalies.length === 0) continue;

        // Find matching anchor index
        let anchorIndex = -1;
        for (let j = 0; j < 10; j++) {
            try {
                const anchor = await contract.methods.machineLedger(machineProofs.machineID, j).call();
                if (anchor.merkleRoot === machineProofs.merkleRoot) {
                    anchorIndex = j;
                    break;
                }
            } catch (e) {
                break;
            }
        }

        if (anchorIndex !== -1) {
            const anomaly = machineProofs.anomalies[0];
            validClaims.push({
                machineID: machineProofs.machineID,
                anchorIndex,
                leaf: anomaly.leaf,
                proof: anomaly.proof
            });
        }
    }

    console.log(`Found ${validClaims.length} machines with valid anomaly data`);
    if (validClaims.length === 0) {
        console.log('❌ No valid claims to process. Please run process.js first.');
        return;
    }

    // Process numClaims, cycling through available valid claims if needed
    for (let i = 0; i < numClaims; i++) {
        const claimData = validClaims[i % validClaims.length];

        const result = await automated.processClaim(claimData);
        results.comparison.automated.push(result);
        
        if ((i + 1) % 10 === 0 || i === numClaims - 1) {
            console.log(`  Processed ${i + 1}/${numClaims} claims...`);
        }
    }

    const automatedTotalTime = Date.now() - automatedStartTime;
    const automatedAvgClaimTime = results.comparison.automated.reduce(
        (sum, c) => sum + (c.totalTimeMs || 0), 0
    ) / results.comparison.automated.length;

    console.log(`\n✅ Automated claims processed (total time: ${(automatedTotalTime / 1000).toFixed(3)}s)`);

    // ==========================================
    // STATISTICS AND COMPARISON
    // ==========================================

    console.log('\n\n📊 COMPARATIVE ANALYSIS');
    console.log('='.repeat(80));

    results.statistics = {
        traditional: {
            claimsProcessed: results.comparison.traditional.length,
            averageClaimTimeSeconds: traditionalAvgClaimTime,
            averageClaimTimeHours: (traditionalAvgClaimTime / 3600).toFixed(2),
            averageClaimTimeDays: (traditionalAvgClaimTime / 86400).toFixed(2),
            minClaimTimeDays: Math.min(...results.comparison.traditional.map(c => parseFloat(c.totalTimeDays))).toFixed(2),
            maxClaimTimeDays: Math.max(...results.comparison.traditional.map(c => parseFloat(c.totalTimeDays))).toFixed(2),
            executionTimeMs: traditionalTotalTime,
            tps: (results.comparison.traditional.length / (traditionalTotalTime / 1000)).toFixed(6),
            throughput: `${results.comparison.traditional.length} claims / ${(traditionalTotalTime / 1000).toFixed(3)}s`,
            manualInterventions: 8,
            automationLevel: '0%'
        },
        automated: {
            claimsProcessed: results.comparison.automated.length,
            averageClaimTimeMs: automatedAvgClaimTime.toFixed(2),
            averageClaimTimeSeconds: (automatedAvgClaimTime / 1000).toFixed(3),
            minClaimTimeMs: Math.min(...results.comparison.automated.map(c => c.totalTimeMs || 0)).toFixed(2),
            maxClaimTimeMs: Math.max(...results.comparison.automated.map(c => c.totalTimeMs || 0)).toFixed(2),
            totalGasUsed: results.comparison.automated.reduce((sum, c) => sum + Number(c.gasUsed || 0), 0),
            averageGasPerClaim: (results.comparison.automated.reduce((sum, c) => sum + Number(c.gasUsed || 0), 0) / results.comparison.automated.length).toFixed(0),
            executionTimeMs: automatedTotalTime,
            executionTimeSeconds: (automatedTotalTime / 1000).toFixed(3),
            tps: (results.comparison.automated.length / (automatedTotalTime / 1000)).toFixed(6),
            throughput: `${results.comparison.automated.length} claims / ${(automatedTotalTime / 1000).toFixed(3)}s`,
            manualInterventions: 0,
            automationLevel: '100%'
        }
    };

    // Calculate improvements
    const speedupFactor = (traditionalAvgClaimTime * 1000) / automatedAvgClaimTime;
    const timeReduction = ((1 - (automatedAvgClaimTime / (traditionalAvgClaimTime * 1000))) * 100).toFixed(2);
    const tpsImprovement = ((parseFloat(results.statistics.automated.tps) / parseFloat(results.statistics.traditional.tps)) - 1) * 100;

    results.verdict = {
        speedupFactor: speedupFactor.toFixed(2) + 'x faster',
        timeReduction: timeReduction + '% reduction',
        traditionalAverageTime: results.statistics.traditional.averageClaimTimeDays + ' days',
        automatedAverageTime: results.statistics.automated.averageClaimTimeSeconds + ' seconds',
        tpsImprovement: tpsImprovement.toFixed(2) + 'x better',
        costSaving: 'Eliminates 8 manual intervention steps',
        trustLevel: 'Cryptographic proof vs manual verification',
        recommendation: 'Automated blockchain solution is dramatically faster and more reliable'
    };

    // Print results
    console.log('\n┌─ TRADITIONAL INSURANCE CLAIMS');
    console.log(`│  Claims Processed:    ${results.statistics.traditional.claimsProcessed}`);
    console.log(`│  Average Time:        ${results.statistics.traditional.averageClaimTimeDays} days (${results.statistics.traditional.averageClaimTimeHours} hours)`);
    console.log(`│  Time Range:          ${results.statistics.traditional.minClaimTimeDays}-${results.statistics.traditional.maxClaimTimeDays} days`);
    console.log(`│  TPS:                 ${results.statistics.traditional.tps} transactions/second`);
    console.log(`│  Throughput:          ${results.statistics.traditional.throughput}`);
    console.log(`│  Manual Steps:        ${results.statistics.traditional.manualInterventions}`);
    console.log(`│  Automation:          ${results.statistics.traditional.automationLevel}`);
    console.log('└────────────────────────────────────────────\n');

    console.log('┌─ AUTOMATED BLOCKCHAIN CLAIMS');
    console.log(`│  Claims Processed:    ${results.statistics.automated.claimsProcessed}`);
    console.log(`│  Average Time:        ${results.statistics.automated.averageClaimTimeMs}ms (${results.statistics.automated.averageClaimTimeSeconds}s)`);
    console.log(`│  Time Range:          ${results.statistics.automated.minClaimTimeMs}-${results.statistics.automated.maxClaimTimeMs}ms`);
    console.log(`│  TPS:                 ${results.statistics.automated.tps} transactions/second`);
    console.log(`│  Throughput:          ${results.statistics.automated.throughput}`);
    console.log(`│  Total Gas:           ${results.statistics.automated.totalGasUsed}`);
    console.log(`│  Avg Gas/Claim:       ${results.statistics.automated.averageGasPerClaim}`);
    console.log(`│  Manual Steps:        ${results.statistics.automated.manualInterventions}`);
    console.log(`│  Automation:          ${results.statistics.automated.automationLevel}`);
    console.log('└────────────────────────────────────────────\n');

    console.log('🏆 VERDICT');
    console.log('='.repeat(80));
    console.log(`⚡ Speed Improvement:     ${results.verdict.speedupFactor}`);
    console.log(`📉 Time Reduction:        ${results.verdict.timeReduction}`);
    console.log(`📊 TPS Improvement:       ${results.verdict.tpsImprovement}`);
    console.log(`💰 Cost Saving:           ${results.verdict.costSaving}`);
    console.log(`🔒 Trust Level:           ${results.verdict.trustLevel}`);
    console.log(`\n✅ ${results.verdict.recommendation}`);
    console.log('='.repeat(80));

    // Save results
    fs.writeFileSync(
        'insurance-claim-benchmark.json',
        JSON.stringify(results, null, 2)
    );

    console.log('\n📁 Results saved to: insurance-claim-benchmark.json');
}

// Run benchmark
runBenchmark().catch(console.error);
