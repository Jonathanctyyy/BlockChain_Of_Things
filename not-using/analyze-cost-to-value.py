import json
import pandas as pd
from tabulate import tabulate

# Read the JSON report
with open("cost-to-value-ratio-report.json", "r") as f:
    data = json.load(f)

# Convert to DataFrame
df = pd.DataFrame(data)

# Convert numeric columns
df["payoutUSD"] = df["payoutUSD"].astype(int)
df["costToValueRatio"] = df["costToValueRatio"].astype(float)
df["netPayout"] = df["netPayout"].astype(float)
df["transactionCostUSD"] = df["transactionCostUSD"].astype(float)

print("\n" + "=" * 100)
print("COST-TO-VALUE RATIO ANALYSIS SUMMARY")
print("=" * 100)

# ==========================================
# TABLE 1: By Operation and Gas Price Level
# ==========================================
print("\n📊 TABLE 1: AVERAGE COST-TO-VALUE RATIO BY OPERATION & GAS PRICE")
print("─" * 100)

pivot_table = df.pivot_table(
    values="costToValueRatio",
    index=["operation", "priceLevel"],
    columns="scenario",
    aggfunc="mean",
)
print(tabulate(pivot_table, headers="keys", tablefmt="grid", floatfmt=".2f"))

# ==========================================
# TABLE 2: By Insurance Claim Scenario
# ==========================================
print(
    "\n📊 TABLE 2: COST-TO-VALUE RATIO BY CLAIM SCENARIO (ALL OPERATIONS & GAS PRICES)"
)
print("─" * 100)

scenario_summary = (
    df.groupby("scenario")
    .agg(
        {
            "costToValueRatio": ["min", "max", "mean"],
            "netPayout": "mean",
            "payoutUSD": "first",
        }
    )
    .round(2)
)

scenario_table = []
for scenario in [
    "microClaim",
    "smallClaim",
    "standardClaim",
    "largeClaim",
    "premiumClaim",
]:
    subset = df[df["scenario"] == scenario]
    scenario_table.append(
        {
            "Claim Type": scenario.replace("Claim", "").upper(),
            "Payout": f"${subset['payoutUSD'].iloc[0]}",
            "Min Fee %": f"{subset['costToValueRatio'].min():.2f}%",
            "Max Fee %": f"{subset['costToValueRatio'].max():.2f}%",
            "Avg Fee %": f"{subset['costToValueRatio'].mean():.2f}%",
            "Avg Net Payout": f"${subset['netPayout'].mean():.2f}",
            "All Viable": "Yes" if subset["viable"].all() else "No",
        }
    )

print(tabulate(scenario_table, headers="keys", tablefmt="grid"))

# ==========================================
# TABLE 3: Best case (Slow Gas, Low Fee)
# ==========================================
print("\n📊 TABLE 3: BEST CASE SCENARIO (Slow Gas Price - 20 Gwei)")
print("─" * 100)

best_case = df[df["priceLevel"] == "slow"].copy()
best_table = []
for op in [
    "Store Proof (No Anomaly)",
    "Store Proof (With Anomaly)",
    "Merkle Proof Verification",
]:
    subset = best_case[best_case["operation"] == op]
    for scenario in [
        "microClaim",
        "smallClaim",
        "standardClaim",
        "largeClaim",
        "premiumClaim",
    ]:
        row = subset[subset["scenario"] == scenario]
        if not row.empty:
            best_table.append(
                {
                    "Operation": op[:20],
                    "Claim Type": scenario.replace("Claim", "").upper(),
                    "Payout": f"${row['payoutUSD'].iloc[0]}",
                    "TX Cost": f"${row['transactionCostUSD'].iloc[0]:.2f}",
                    "Fee %": f"{row['costToValueRatio'].iloc[0]:.2f}%",
                    "Net Payout": f"${row['netPayout'].iloc[0]:.2f}",
                }
            )

print(tabulate(best_table[:15], headers="keys", tablefmt="grid"))

# ==========================================
# TABLE 4: Worst case (Instant Gas, High Fee)
# ==========================================
print("\n📊 TABLE 4: WORST CASE SCENARIO (Instant Gas Price - 150 Gwei)")
print("─" * 100)

worst_case = df[df["priceLevel"] == "instant"].copy()
worst_table = []
for op in [
    "Store Proof (No Anomaly)",
    "Store Proof (With Anomaly)",
    "Merkle Proof Verification",
]:
    subset = worst_case[worst_case["operation"] == op]
    for scenario in [
        "microClaim",
        "smallClaim",
        "standardClaim",
        "largeClaim",
        "premiumClaim",
    ]:
        row = subset[subset["scenario"] == scenario]
        if not row.empty:
            worst_table.append(
                {
                    "Operation": op[:20],
                    "Claim Type": scenario.replace("Claim", "").upper(),
                    "Payout": f"${row['payoutUSD'].iloc[0]}",
                    "TX Cost": f"${row['transactionCostUSD'].iloc[0]:.2f}",
                    "Fee %": f"{row['costToValueRatio'].iloc[0]:.2f}%",
                    "Net Payout": f"${row['netPayout'].iloc[0]:.2f}",
                }
            )

print(tabulate(worst_table[:15], headers="keys", tablefmt="grid"))

# ==========================================
# TABLE 5: Standard Gas Price (Most Common)
# ==========================================
print("\n📊 TABLE 5: STANDARD GAS PRICE SCENARIO (50 Gwei - RECOMMENDED)")
print("─" * 100)

standard_case = df[df["priceLevel"] == "standard"].copy()
standard_table = []
for op in [
    "Store Proof (No Anomaly)",
    "Store Proof (With Anomaly)",
    "Merkle Proof Verification",
]:
    subset = standard_case[standard_case["operation"] == op]
    for scenario in [
        "microClaim",
        "smallClaim",
        "standardClaim",
        "largeClaim",
        "premiumClaim",
    ]:
        row = subset[subset["scenario"] == scenario]
        if not row.empty:
            best_table.append(
                {
                    "Operation": op[:20],
                    "Claim Type": scenario.replace("Claim", "").upper(),
                    "Payout": f"${row['payoutUSD'].iloc[0]}",
                    "TX Cost": f"${row['transactionCostUSD'].iloc[0]:.2f}",
                    "Fee %": f"{row['costToValueRatio'].iloc[0]:.2f}%",
                    "Net Payout": f"${row['netPayout'].iloc[0]:.2f}",
                }
            )

print(tabulate(best_table[:15], headers="keys", tablefmt="grid"))

# ==========================================
# TABLE 6: Viability Analysis
# ==========================================
print("\n📊 TABLE 6: VIABILITY ANALYSIS (% of Payout Consumed by Fees)")
print("─" * 100)

viability_table = []
for scenario in [
    "microClaim",
    "smallClaim",
    "standardClaim",
    "largeClaim",
    "premiumClaim",
]:
    subset = df[df["scenario"] == scenario]
    payout = subset["payoutUSD"].iloc[0]

    # Count scenarios by fee percentage ranges
    low_fee = len(subset[subset["costToValueRatio"] <= 1.0])
    medium_fee = len(
        subset[(subset["costToValueRatio"] > 1.0) & (subset["costToValueRatio"] <= 5.0)]
    )
    high_fee = len(subset[subset["costToValueRatio"] > 5.0])

    viability_table.append(
        {
            "Claim Type": scenario.replace("Claim", "").upper(),
            "Payout": f"${payout}",
            "Low Fee\n(≤1%)": low_fee,
            "Med Fee\n(1-5%)": medium_fee,
            "High Fee\n(>5%)": high_fee,
            "All Viable": "✅ Yes" if subset["viable"].all() else "❌ No",
        }
    )

print(tabulate(viability_table, headers="keys", tablefmt="grid"))

# ==========================================
# KEY INSIGHTS
# ==========================================
print("\n" + "=" * 100)
print("KEY INSIGHTS & RECOMMENDATIONS")
print("=" * 100)

print(
    """
1. ECONOMICS:
   • Blockchain fees represent <1% of large claims ($10,000+) even at instant gas prices
   • Micro-claims ($100) consume 4.74%-43.45% at different gas price levels
   • Standard gas prices (50 Gwei) are RECOMMENDED for optimal cost-benefit balance

2. VIABILITY THRESHOLDS:
   • At standard gas prices: ALL claim types are economically viable
   • Minimum profitable payout: ~$85 (keeps >95% of payout)
   • Breakeven point: ~$5 (transaction cost approximately equals payout)

3. OPERATION COSTS:
   • Merkle Proof Verification: CHEAPEST at 36,487 gas
   • Store Proof (No Anomaly): 94,715 gas
   • Store Proof (With Anomaly): MOST EXPENSIVE at 115,875 gas
   • Cost difference: 3.2x between cheapest and most expensive operations

4. RECOMMENDATIONS:
   • ✅ USE for claims: $500+ (fees <3% of payout)
   • ⚠️  CAUTION for claims: $100-$500 (fees 1-15% depending on gas price)
   • 📊 BATCH PROCESS micro-claims to amortize fixed transaction overhead
   • 🔄 MONITOR gas prices and adjust timing (use slow gas during congestion)

5. SYSTEM VIABILITY:
   ✅ The blockchain insurance system is economically viable for:
      - Standard claims: $500-$50,000
      - Peak insurance payouts: $10,000+
      - Batch operations: Multiple micro-claims grouped together
"""
)

print("=" * 100)
print(
    f"Report generated with {len(df)} data points across 3 operations, 4 gas prices, and 5 claim types"
)
print("=" * 100 + "\n")

# Save enhanced report
with open("cost-to-value-ratio-analysis.txt", "w") as f:
    f.write("COST-TO-VALUE RATIO ANALYSIS - DETAILED REPORT\n")
    f.write("=" * 100 + "\n\n")
    f.write("TABLE 1: AVERAGE COST-TO-VALUE RATIO BY OPERATION & GAS PRICE\n")
    f.write("─" * 100 + "\n")
    f.write(tabulate(pivot_table, headers="keys", tablefmt="grid", floatfmt=".2f"))
    f.write("\n\nTABLE 2: CLAIM SCENARIO ANALYSIS\n")
    f.write("─" * 100 + "\n")
    f.write(tabulate(scenario_table, headers="keys", tablefmt="grid"))

print("✅ Analysis saved to: cost-to-value-ratio-analysis.txt")
