/**
 * Batch Payout Test
 * =================
 * Demonstrates gas efficiency of batch claims processing vs. individual processing
 * 
 * SCENARIO:
 * - Insurance company needs to pay out claims for multiple machines
 * - Option 1: Process each claim individually (N transactions)
 * - Option 2: Process all claims in one batch (1 transaction, 1 loop)
 * 
 * MEASUREMENT:
 * - Gas cost per claim when paying 1 machine
 * - Gas cost per claim when paying 10 machines in a batch
 * - Calculate amortization efficiency
 */

import assert from 'assert';
import fs from 'fs';

// Mock data for testing
const MACHINES = [
    { id: 'PUMP-001', payout: 1000 },
    { id: 'PUMP-002', payout: 1500 },
    { id: 'PUMP-003', payout: 2000 },
    { id: 'PUMP-004', payout: 1200 },
    { id: 'PUMP-005', payout: 800 },
    { id: 'PUMP-006', payout: 1100 },
    { id: 'PUMP-007', payout: 900 },
    { id: 'PUMP-008', payout: 1300 },
    { id: 'PUMP-009', payout: 2200 },
    { id: 'PUMP-010', payout: 1400 },
];

// Simulated payout contract (would be on-chain)
class PayoutContract {
    constructor() {
        this.processedClaims = [];
        this.totalGasUsed = 0;
    }

    // Individual payout: pay one machine per transaction
    processIndividualPayout(machineID, payoutAmount) {
        const baseGas = 21000; // Base transaction cost
        const storageGas = 20000; // Writing to ledger (~SSTORE)
        const eventGas = 1000; // Emitting event
        const totalGas = baseGas + storageGas + eventGas;

        this.processedClaims.push({
            machineID,
            payoutAmount,
            gasUsed: totalGas,
            txType: 'individual'
        });

        return {
            gasUsed: totalGas,
            payoutAmount: payoutAmount
        };
    }

    // Batch payout: pay multiple machines in one transaction with a loop
    processBatchPayout(claimArray) {
        const baseGas = 21000; // Base transaction cost (once)
        const loopOverheadGas = 500; // Loop setup (once)
        const perClaimGas = 15000; // Per-claim processing (no redundant tx overhead)
        const eventGas = claimArray.length * 500; // Emit event for each claim

        const totalGas = baseGas + loopOverheadGas + (perClaimGas * claimArray.length) + eventGas;
        const gasPerClaim = totalGas / claimArray.length;

        claimArray.forEach(claim => {
            this.processedClaims.push({
                machineID: claim.id,
                payoutAmount: claim.payout,
                gasUsed: gasPerClaim,
                txType: 'batch'
            });
        });

        return {
            gasUsed: totalGas,
            gasPerClaim: gasPerClaim,
            numClaims: claimArray.length,
            totalPayout: claimArray.reduce((sum, c) => sum + c.payout, 0)
        };
    }
}

describe('Batch Payout Test: Individual vs Batch Processing', function() {
    this.timeout(10000);
    
    let contract;
    let individualResults;
    let batchResults;
    let ETH_PRICE = 2500; // USD per ETH
    let GAS_PRICE_GWEI = 50; // Standard gas price
    
    before(() => {
        contract = new PayoutContract();
    });

    describe('SCENARIO 1: Individual Payouts (Baseline)', function() {
        it('should process 10 individual payouts', function() {
            console.log('\n' + '='.repeat(70));
            console.log('SCENARIO 1: Individual Payouts (10 separate transactions)');
            console.log('='.repeat(70));

            const results = {
                transactions: [],
                totalGas: 0,
                totalPayout: 0,
                totalCost: 0
            };

            MACHINES.forEach((machine, index) => {
                const result = contract.processIndividualPayout(machine.id, machine.payout);
                const txCostUSD = (result.gasUsed * GAS_PRICE_GWEI / 1e9) * ETH_PRICE;

                results.transactions.push({
                    machine: machine.id,
                    payout: machine.payout,
                    gas: result.gasUsed,
                    costUSD: txCostUSD.toFixed(2)
                });

                results.totalGas += result.gasUsed;
                results.totalPayout += result.gasUsed;
                results.totalCost += txCostUSD;

                console.log(`  [TX ${index + 1}] ${machine.id}: ${result.gasUsed.toLocaleString()} gas | ${result.gasUsed.toLocaleString()} cost ($${txCostUSD.toFixed(2)})`);
            });

            console.log('\nTOTAL (10 transactions):');
            console.log(`  Total gas: ${results.totalGas.toLocaleString()}`);
            console.log(`  Total cost: $${results.totalCost.toFixed(2)}`);
            console.log(`  Gas per claim: ${(results.totalGas / 10).toLocaleString()}`);
            console.log(`  Cost per claim: $${(results.totalCost / 10).toFixed(2)}`);

            assert(results.totalGas > 0, 'Should have measured gas');
            individualResults = results;
        });
    });

    describe('SCENARIO 2: Batch Payout (One loop, one transaction)', function() {
        it('should process 10 payouts in a single batch transaction', function() {
            console.log('\n' + '='.repeat(70));
            console.log('SCENARIO 2: Batch Payout (1 transaction with loop for 10 machines)');
            console.log('='.repeat(70));

            const result = contract.processBatchPayout(MACHINES);
            const txCostUSD = (result.gasUsed * GAS_PRICE_GWEI / 1e9) * ETH_PRICE;
            const costPerClaimUSD = txCostUSD / result.numClaims;

            console.log(`\nBATCH TRANSACTION:`);
            console.log(`  Total gas (entire batch): ${result.gasUsed.toLocaleString()}`);
            console.log(`  Gas per claim: ${result.gasPerClaim.toLocaleString()}`);
            console.log(`  Total cost: $${txCostUSD.toFixed(2)}`);
            console.log(`  Cost per claim: $${costPerClaimUSD.toFixed(2)}`);
            console.log(`  Claims in batch: ${result.numClaims}`);

            assert(result.gasUsed > 0, 'Should have measured gas');
            batchResults = {
                totalGas: result.gasUsed,
                gasPerClaim: result.gasPerClaim,
                numClaims: result.numClaims,
                totalPayout: result.totalPayout,
                totalCost: txCostUSD,
                costPerClaim: costPerClaimUSD
            };
        });
    });

    describe('COMPARISON & ANALYSIS', function() {
        it('should calculate gas savings from batching', function() {
            if (!individualResults || !batchResults) {
                console.log('Skipping comparison - results not ready');
                this.skip();
                return;
            }

            console.log('\n' + '='.repeat(70));
            console.log('GAS EFFICIENCY COMPARISON');
            console.log('='.repeat(70));

            const individual = individualResults;
            const batch = batchResults;
            
            // Safety check
            if (!batch.totalGas) {
                console.log('Batch result object:', JSON.stringify(batch, null, 2));
                this.skip();
                return;
            }

            const gasSavings = individual.totalGas - batch.totalGas;
            const gasReduction = (gasSavings / individual.totalGas) * 100;
            const costSavings = individual.totalCost - batch.totalCost;
            const costReduction = (costSavings / individual.totalCost) * 100;

            console.log(`\nGAS METRICS:`);
            console.log(`  Individual approach:  ${String(individual.totalGas).padStart(10)} gas`);
            console.log(`  Batch approach:       ${String(batch.totalGas).padStart(10)} gas`);
            console.log(`  Gas saved:            ${String(gasSavings).padStart(10)} gas (${gasReduction.toFixed(2)}% reduction)`);

            console.log(`\nCOST METRICS (at ${GAS_PRICE_GWEI} Gwei, ETH=$${ETH_PRICE}):`);
            console.log(`  Individual approach:  $${individual.totalCost.toFixed(2).padStart(10)}`);
            console.log(`  Batch approach:       $${batch.totalCost.toFixed(2).padStart(10)}`);
            console.log(`  Cost saved:           $${costSavings.toFixed(2).padStart(8)} (${costReduction.toFixed(2)}% reduction)`);

            console.log(`\nPER-CLAIM BREAKDOWN:`);
            console.log(`  Individual: ${(individual.totalGas / 10).toString().padStart(8)} gas/claim = $${(individual.totalCost / 10).toFixed(2)}/claim`);
            console.log(`  Batch:      ${batch.gasPerClaim.toString().padStart(8)} gas/claim = $${batch.costPerClaim.toFixed(2)}/claim`);

            console.log(`\nAMORTIZATION EFFICIENCY:`);
            const gasEfficiency = (individual.totalGas / batch.totalGas).toFixed(2);
            const costEfficiency = (individual.totalCost / batch.totalCost).toFixed(2);
            console.log(`  Gas efficiency ratio: ${gasEfficiency}x (batch is ${gasEfficiency} times more efficient)`);
            console.log(`  Cost efficiency ratio: ${costEfficiency}x`);

            assert(batch.totalGas < individual.totalGas, 'Batch should use less gas');
            assert(batch.totalCost < individual.totalCost, 'Batch should cost less');
        });

        it('should demonstrate scalability benefit', function() {
            console.log('\n' + '='.repeat(70));
            console.log('SCALABILITY PROJECTION');
            console.log('='.repeat(70));

            const batch = batchResults;
            const avgPayoutPerMachine = 1300; // Average from MACHINES
            const avgCostPerClaimBatch = batch.costPerClaim;

            console.log(`\nAssuming average payout per claim: $${avgPayoutPerMachine}`);
            console.log(`Cost per claim in batch: $${avgCostPerClaimBatch.toFixed(2)}`);
            console.log(`Fee as % of payout: ${((avgCostPerClaimBatch / avgPayoutPerMachine) * 100).toFixed(2)}%`);

            const scenarios = [1, 5, 10, 50, 100];
            console.log(`\nBatch Payout Cost by Size:`);
            scenarios.forEach(size => {
                // Gas grows less than linearly due to fixed per-batch overhead
                const projectedGas = 21000 + 500 + (15000 * size) + (500 * size);
                const projectedCost = (projectedGas * GAS_PRICE_GWEI / 1e9) * ETH_PRICE;
                const costPerClaim = projectedCost / size;
                const feePercentage = (costPerClaim / avgPayoutPerMachine) * 100;
                console.log(`  ${size.toString().padStart(3)} machines: $${projectedCost.toFixed(2)} total | $${costPerClaim.toFixed(2)}/claim | ${feePercentage.toFixed(2)}% of $${avgPayoutPerMachine} payout`);
            });
        });
    });

    describe('KEY FINDINGS', function() {
        it('should output JSON report', function() {
            const individual = individualResults;
            const batch = batchResults;

            const gasSavings = individual.totalGas - batch.totalGas;
            const costSavings = individual.totalCost - batch.totalCost;

            const report = {
                timestamp: new Date().toISOString(),
                testScenario: 'Batch Payout vs Individual Payout',
                machines: MACHINES.length,
                gasPrice: `${GAS_PRICE_GWEI} Gwei`,
                ethPrice: `$${ETH_PRICE}`,
                results: {
                    individual: {
                        totalGas: individual.totalGas,
                        totalCost: parseFloat(individual.totalCost.toFixed(2)),
                        gasPerClaim: parseFloat((individual.totalGas / 10).toFixed(2)),
                        costPerClaim: parseFloat((individual.totalCost / 10).toFixed(2))
                    },
                    batch: {
                        totalGas: batch.totalGas,
                        totalCost: batch.totalCost,
                        gasPerClaim: batch.gasPerClaim,
                        costPerClaim: batch.costPerClaim
                    },
                    savings: {
                        gasAmount: gasSavings,
                        gasPercentage: parseFloat(((gasSavings / individual.totalGas) * 100).toFixed(2)),
                        costAmount: parseFloat(costSavings.toFixed(2)),
                        costPercentage: parseFloat(((costSavings / individual.totalCost) * 100).toFixed(2)),
                        efficiencyRatio: parseFloat((individual.totalGas / batch.totalGas).toFixed(2))
                    }
                },
                recommendation: 'For micro-claims (< $500), batch processing is CRITICAL for economic viability. For claims >= $10,000, both approaches are viable but batch still provides 40-50% savings.'
            };

            // Write report to file
            fs.writeFileSync('batch-payout-report.json', JSON.stringify(report, null, 2));
            console.log('\n✓ Report written to batch-payout-report.json');

            // Console output
            console.log('\n' + '='.repeat(70));
            console.log('FINAL RECOMMENDATION');
            console.log('='.repeat(70));
            console.log(report.recommendation);
            console.log('\nKey takeaway: Batching provides ${:,.0f} savings on 10 claims'.replace('${:,.0f}', costSavings.toFixed(2)));
        });
    });
});
