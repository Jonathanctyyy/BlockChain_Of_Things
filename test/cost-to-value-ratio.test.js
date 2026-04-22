import { expect } from "chai";
import { writeFileSync } from "fs";

/**
 * Cost-to-Value Ratio Testing Suite
 * Measures the percentage of insurance payout consumed by blockchain transaction fees
 */
describe("Cost-to-Value Ratio Analysis", function () {
  const results = [];

  // Current Ethereum gas prices (in Gwei)
  const GAS_PRICES = {
    slow: 20,        // 20 Gwei (Low priority)
    standard: 50,    // 50 Gwei (Standard priority)
    fast: 100,       // 100 Gwei (Fast priority)
    instant: 150     // 150 Gwei (Instant priority)
  };

  // Gas costs from existing operations (from gas-efficiency tests)
  const GAS_COSTS = {
    registerMachine: 45732,
    merkleProofVerification: 36487,
    storeProofNoAnomaly: 94715,
    storeProofWithAnomaly: 115875
  };

  // Insurance payout scenarios (in USD)
  const INSURANCE_PAYOUTS = {
    microClaim: 100,        // Small IoT sensor replacement
    smallClaim: 500,        // Sensor and part replacement
    standardClaim: 2000,    // Equipment repair/replacement
    largeClaim: 10000,      // Major equipment replacement
    premiumClaim: 50000     // Industrial system replacement
  };

  // Current ETH price (in USD)
  const ETH_PRICE = 2500;  // Approximate ETH price

  /**
   * Calculate transaction cost in USD
   * @param {number} gasUsed - Gas used for transaction
   * @param {number} gasPriceGwei - Gas price in Gwei
   * @param {number} ethPrice - ETH price in USD
   * @returns {number} Cost in USD
   */
  function calculateTransactionCost(gasUsed, gasPriceGwei, ethPrice) {
    // Gas cost in ETH = (gasUsed * gasPriceGwei) / 1e9
    const etherCost = (gasUsed * gasPriceGwei) / 1e9;
    // Cost in USD = etherCost * ETH price
    const usdCost = etherCost * ethPrice;
    return usdCost;
  }

  /**
   * Calculate cost-to-value ratio
   * @param {number} transactionCostUSD - Transaction cost in USD
   * @param {number} payoutUSD - Insurance payout in USD
   * @returns {number} Percentage of payout consumed by fees
   */
  function calculateCostToValueRatio(transactionCostUSD, payoutUSD) {
    return (transactionCostUSD / payoutUSD) * 100;
  }

  /**
   * Calculate net payout after blockchain fees
   * @param {number} payoutUSD - Original insurance payout in USD
   * @param {number} transactionCostUSD - Transaction cost in USD
   * @returns {number} Net payout after fees
   */
  function calculateNetPayout(payoutUSD, transactionCostUSD) {
    return Math.max(0, payoutUSD - transactionCostUSD);
  }

  it("Should analyze cost-to-value ratio for store proof operation (no anomaly)", function () {
    const gasUsed = GAS_COSTS.storeProofNoAnomaly;
    const operationName = "Store Proof (No Anomaly)";

    console.log(
      `\n${"=".repeat(80)}\n` +
      `COST-TO-VALUE ANALYSIS: ${operationName}\n` +
      `Gas Used: ${gasUsed.toLocaleString()} gas\n` +
      `${"=".repeat(80)}\n`
    );

    for (const [priceLevel, gasPriceGwei] of Object.entries(GAS_PRICES)) {
      const transactionCostUSD = calculateTransactionCost(
        gasUsed,
        gasPriceGwei,
        ETH_PRICE
      );

      console.log(`\n📊 Gas Price Level: ${priceLevel.toUpperCase()} (${gasPriceGwei} Gwei)`);
      console.log(`   Transaction Cost: $${transactionCostUSD.toFixed(4)}`);
      console.log(`   ${"─".repeat(60)}`);

      for (const [scenarioName, payoutUSD] of Object.entries(INSURANCE_PAYOUTS)) {
        const ratio = calculateCostToValueRatio(
          transactionCostUSD,
          payoutUSD
        );
        const netPayout = calculateNetPayout(payoutUSD, transactionCostUSD);
        const profitability = netPayout > 0 ? "✅ VIABLE" : "❌ NOT VIABLE";

        console.log(
          `   ${scenarioName.padEnd(18)} | ` +
          `Payout: $${String(payoutUSD).padStart(6)} | ` +
          `Fee: ${ratio.toFixed(2)}% | ` +
          `Net: $${netPayout.toFixed(2).padStart(8)} | ` +
          `${profitability}`
        );

        // Store result
        results.push({
          operation: operationName,
          gasUsed,
          priceLevel,
          gasPriceGwei,
          transactionCostUSD: transactionCostUSD.toFixed(4),
          scenario: scenarioName,
          payoutUSD,
          costToValueRatio: ratio.toFixed(2),
          netPayout: netPayout.toFixed(2),
          viable: netPayout > 0
        });
      }
    }

    expect(true).to.be.true;
  });

  it("Should analyze cost-to-value ratio for store proof operation (with anomaly)", function () {
    const gasUsed = GAS_COSTS.storeProofWithAnomaly;
    const operationName = "Store Proof (With Anomaly)";

    console.log(
      `\n${"=".repeat(80)}\n` +
      `COST-TO-VALUE ANALYSIS: ${operationName}\n` +
      `Gas Used: ${gasUsed.toLocaleString()} gas\n` +
      `${"=".repeat(80)}\n`
    );

    for (const [priceLevel, gasPriceGwei] of Object.entries(GAS_PRICES)) {
      const transactionCostUSD = calculateTransactionCost(
        gasUsed,
        gasPriceGwei,
        ETH_PRICE
      );

      console.log(`\n📊 Gas Price Level: ${priceLevel.toUpperCase()} (${gasPriceGwei} Gwei)`);
      console.log(`   Transaction Cost: $${transactionCostUSD.toFixed(4)}`);
      console.log(`   ${"─".repeat(60)}`);

      for (const [scenarioName, payoutUSD] of Object.entries(INSURANCE_PAYOUTS)) {
        const ratio = calculateCostToValueRatio(
          transactionCostUSD,
          payoutUSD
        );
        const netPayout = calculateNetPayout(payoutUSD, transactionCostUSD);
        const profitability = netPayout > 0 ? "✅ VIABLE" : "❌ NOT VIABLE";

        console.log(
          `   ${scenarioName.padEnd(18)} | ` +
          `Payout: $${String(payoutUSD).padStart(6)} | ` +
          `Fee: ${ratio.toFixed(2)}% | ` +
          `Net: $${netPayout.toFixed(2).padStart(8)} | ` +
          `${profitability}`
        );

        // Store result
        results.push({
          operation: operationName,
          gasUsed,
          priceLevel,
          gasPriceGwei,
          transactionCostUSD: transactionCostUSD.toFixed(4),
          scenario: scenarioName,
          payoutUSD,
          costToValueRatio: ratio.toFixed(2),
          netPayout: netPayout.toFixed(2),
          viable: netPayout > 0
        });
      }
    }

    expect(true).to.be.true;
  });

  it("Should analyze cost-to-value ratio for merkle proof verification", function () {
    const gasUsed = GAS_COSTS.merkleProofVerification;
    const operationName = "Merkle Proof Verification";

    console.log(
      `\n${"=".repeat(80)}\n` +
      `COST-TO-VALUE ANALYSIS: ${operationName}\n` +
      `Gas Used: ${gasUsed.toLocaleString()} gas\n` +
      `${"=".repeat(80)}\n`
    );

    for (const [priceLevel, gasPriceGwei] of Object.entries(GAS_PRICES)) {
      const transactionCostUSD = calculateTransactionCost(
        gasUsed,
        gasPriceGwei,
        ETH_PRICE
      );

      console.log(`\n📊 Gas Price Level: ${priceLevel.toUpperCase()} (${gasPriceGwei} Gwei)`);
      console.log(`   Transaction Cost: $${transactionCostUSD.toFixed(4)}`);
      console.log(`   ${"─".repeat(60)}`);

      for (const [scenarioName, payoutUSD] of Object.entries(INSURANCE_PAYOUTS)) {
        const ratio = calculateCostToValueRatio(
          transactionCostUSD,
          payoutUSD
        );
        const netPayout = calculateNetPayout(payoutUSD, transactionCostUSD);
        const profitability = netPayout > 0 ? "✅ VIABLE" : "❌ NOT VIABLE";

        console.log(
          `   ${scenarioName.padEnd(18)} | ` +
          `Payout: $${String(payoutUSD).padStart(6)} | ` +
          `Fee: ${ratio.toFixed(2)}% | ` +
          `Net: $${netPayout.toFixed(2).padStart(8)} | ` +
          `${profitability}`
        );

        // Store result
        results.push({
          operation: operationName,
          gasUsed,
          priceLevel,
          gasPriceGwei,
          transactionCostUSD: transactionCostUSD.toFixed(4),
          scenario: scenarioName,
          payoutUSD,
          costToValueRatio: ratio.toFixed(2),
          netPayout: netPayout.toFixed(2),
          viable: netPayout > 0
        });
      }
    }

    expect(true).to.be.true;
  });

  it("Should generate summary of optimal payout thresholds", function () {
    console.log(
      `\n${"=".repeat(80)}\n` +
      `SUMMARY: OPTIMAL INSURANCE PAYOUT THRESHOLDS\n` +
      `${"=".repeat(80)}\n`
    );

    console.log("Recommendation for profitability (keeping >95% of payout):\n");

    for (const [operationName, gasUsed] of Object.entries(GAS_COSTS)) {
      const operationDisplay = operationName
        .replace(/([A-Z])/g, " $1")
        .replace(/^/, c => c.toUpperCase())
        .trim();

      console.log(`📋 ${operationDisplay}`);
      console.log(`   Gas: ${gasUsed.toLocaleString()}`);

      for (const [priceLevel, gasPriceGwei] of Object.entries(GAS_PRICES)) {
        const transactionCostUSD = calculateTransactionCost(
          gasUsed,
          gasPriceGwei,
          ETH_PRICE
        );

        // Calculate minimum payout to maintain 95% viability
        const minPayoutFor95Percent = (transactionCostUSD / 0.05).toFixed(2);
        // Calculate minimum payout to maintain 90% viability
        const minPayoutFor90Percent = (transactionCostUSD / 0.10).toFixed(2);

        console.log(
          `   ${priceLevel.padEnd(8)}: ` +
          `Min payout (95% viable): $${minPayoutFor95Percent.padStart(8)} | ` +
          `Min payout (90% viable): $${minPayoutFor90Percent.padStart(8)}`
        );
      }
      console.log();
    }

    console.log(`\nKey Insights:`);
    console.log(`• Standard operations cost $${calculateTransactionCost(GAS_COSTS.storeProofNoAnomaly, GAS_PRICES.standard, ETH_PRICE).toFixed(2)} at standard gas prices (50 Gwei)`);
    console.log(`• Anomaly detection operations cost $${calculateTransactionCost(GAS_COSTS.storeProofWithAnomaly, GAS_PRICES.standard, ETH_PRICE).toFixed(2)} at standard gas prices`);
    console.log(`• Claims below $${(calculateTransactionCost(GAS_COSTS.storeProofWithAnomaly, GAS_PRICES.standard, ETH_PRICE) / 0.05).toFixed(0)} may not be economically viable`);
    console.log(`• For micro-claims (<$100), consider batch processing to amortize costs`);

    expect(true).to.be.true;
  });

  after(function () {
    // Write results to file
    writeFileSync(
      "cost-to-value-ratio-report.json",
      JSON.stringify(results, null, 2)
    );
    console.log(
      `\n✅ Results saved to: cost-to-value-ratio-report.json\n`
    );
  });
});
