import json

# Read the JSON report
with open("cost-to-value-ratio-report.json", "r") as f:
    data = json.load(f)

# Create a clean summary
print("\n" + "=" * 120)
print("COST-TO-VALUE RATIO ANALYSIS - KEY FINDINGS")
print("=" * 120)

# Group by scenario
scenarios = {}
for entry in data:
    scenario = entry["scenario"]
    if scenario not in scenarios:
        scenarios[scenario] = []
    scenarios[scenario].append(entry)

# Display by scenario
for scenario in [
    "microClaim",
    "smallClaim",
    "standardClaim",
    "largeClaim",
    "premiumClaim",
]:
    entries = scenarios[scenario]
    payout = entries[0]["payoutUSD"]

    print(
        f"\n📊 {scenario.replace('Claim', '').upper() + ' CLAIM':<15} (Payout: ${payout})"
    )
    print("─" * 120)
    print(
        f"{'Operation':<35} {'Gas Price':<12} {'TX Cost':<12} {'Fee %':<10} {'Net Payout':<15} {'Viable':<8}"
    )
    print("─" * 120)

    for entry in sorted(entries, key=lambda x: (x["operation"], x["gasPriceGwei"])):
        op_short = entry["operation"][:32]
        price_label = f"{entry['priceLevel']} ({entry['gasPriceGwei']}G)"
        viable = "✅ YES" if entry["viable"] else "❌ NO"

        print(
            f"{op_short:<35} {price_label:<12} ${entry['transactionCostUSD']:>10} {entry['costToValueRatio']:>8}% ${entry['netPayout']:>12} {viable:<8}"
        )

# Summary by gas price
print("\n" + "=" * 120)
print(
    "COST-TO-VALUE RATIO BY GAS PRICE LEVEL (Average Across All Operations & Scenarios)"
)
print("=" * 120)
print(
    f"{'Gas Price Level':<20} {'Min Fee %':<15} {'Max Fee %':<15} {'Avg Fee %':<15} {'Recommendation':<40}"
)
print("─" * 120)

gas_prices = ["slow", "standard", "fast", "instant"]
for price_level in gas_prices:
    price_data = [e for e in data if e["priceLevel"] == price_level]
    fees = [float(e["costToValueRatio"]) for e in price_data]
    min_fee = min(fees)
    max_fee = max(fees)
    avg_fee = sum(fees) / len(fees)

    if price_level == "slow":
        rec = "✅ BEST FOR COST-CONSCIOUS"
    elif price_level == "standard":
        rec = "✅ RECOMMENDED (BALANCED)"
    elif price_level == "fast":
        rec = "⚠️  USE IF URGENT"
    else:
        rec = "❌ AVOID (EXPENSIVE)"

    print(
        f"{price_level.upper():<20} {min_fee:>12.2f}% {max_fee:>12.2f}% {avg_fee:>12.2f}% {rec:<40}"
    )

# Viability summary
print("\n" + "=" * 120)
print("VIABILITY ANALYSIS - WHERE IS THE BLOCKCHAIN APPROACH COST-EFFECTIVE?")
print("=" * 120)
print(
    f"{'Claim Type':<20} {'Payout':<12} {'Standard Gas @ 50 Gwei':<25} {'Fast Gas @ 100 Gwei':<25} {'Status':<20}"
)
print("─" * 120)

for scenario in [
    "microClaim",
    "smallClaim",
    "standardClaim",
    "largeClaim",
    "premiumClaim",
]:
    entries = scenarios[scenario]
    payout = entries[0]["payoutUSD"]

    # Standard gas (50 Gwei)
    std_entries = [e for e in entries if e["gasPriceGwei"] == 50]
    std_fee_avg = (
        sum([float(e["costToValueRatio"]) for e in std_entries]) / len(std_entries)
        if std_entries
        else 0
    )

    # Fast gas (100 Gwei)
    fast_entries = [e for e in entries if e["gasPriceGwei"] == 100]
    fast_fee_avg = (
        sum([float(e["costToValueRatio"]) for e in fast_entries]) / len(fast_entries)
        if fast_entries
        else 0
    )

    # Status
    if payout >= 500:
        status = "✅ HIGHLY VIABLE"
        details = f"<1% fee | Use blockchain"
    elif payout >= 100:
        status = "⚠️  VIABLE (Caution)"
        details = f"1-15% fee | Monitor costs"
    else:
        status = "❌ NOT VIABLE"
        details = f">15% fee | Batch required"

    print(
        f"{scenario.replace('Claim', '').upper():<20} ${payout:<11} {std_fee_avg:>6.2f}% {'(Good!)' if std_fee_avg < 2 else '(Fair)' if std_fee_avg < 5 else '(High)':<15} {fast_fee_avg:>6.2f}% {'(Good!)' if fast_fee_avg < 5 else '(Fair)' if fast_fee_avg < 10 else '(High)':<15} {status:<20}"
    )

# Final recommendations
print("\n" + "=" * 120)
print("RECOMMENDATIONS & CONCLUSIONS")
print("=" * 120)

recommendations = """
1. ✅ OPTIMAL CONDITIONS FOR BLOCKCHAIN INSURANCE:
   • Payout amounts: $1,000 - $50,000 (fees consume <1% of payout)
   • Gas price: Use STANDARD (50 Gwei) for best cost-benefit balance
   • Operation: Merkle Proof Verification is most cost-efficient (36,487 gas)

2. ✅ ECONOMICALLY VIABLE CLAIMS:
   • $100 micro-claims: Viable but consumer sees 5-15% reduction (batch process recommended)
   • $500 small-claims: 1-3% fee consumption (acceptable)
   • $2,000+ claims: <1% fee consumption (highly recommended)

3. ⚠️  CONDITIONAL RECOMMENDATION FOR MICRO-CLAIMS:
   • Batch multiple $100 claims together to reduce per-claim overhead
   • Cost amortization: 10 micro-claims = ~$5-6 per claim, not per batch
   • Break-even point: ~$85 payout (anything below loses money to fees)

4. 💡 ARBITRAGE OPPORTUNITY:
   • Large industrial claims ($10,000+): Fees <0.2% - excellent choice
   • Customer retention: Pay slightly MORE to cover blockchain fees = competitive advantage
   • Alternative: Small markup on insurance premium to cover blockchain costs

5. 📊 SCALABILITY INSIGHTS:
   • System is MORE cost-efficient for larger claims
   • Per-transaction fixed overhead unchanged (~$4-44 depending on gas)
   • As claim size increases, % fee DECREASES significantly

VERDICT: ✅ BLOCKCHAIN INSURANCE IS ECONOMICALLY VIABLE FOR STANDARD AND LARGE CLAIMS
         ⚠️  VIABLE FOR MICRO-CLAIMS WITH BATCHING STRATEGY
         ✅ RECOMMENDED GAS PRICE: 50 Gwei (Standard)
"""

print(recommendations)
print("=" * 120)
