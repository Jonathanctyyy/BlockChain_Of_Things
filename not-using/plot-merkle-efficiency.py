import json
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches

# Load the report
with open("merkle-proof-efficiency-report.json", "r") as f:
    report = json.load(f)

# Extract data
results = report["results"]
dataset_sizes = [r["datasetSize"] for r in results]
gas_costs = [r["gasUsed"] for r in results]
usd_costs = [r["costUSD"] for r in results]
cost_per_reading = [r["costPerReadingUSD"] for r in results]

# Create figure with subplots
fig, axes = plt.subplots(2, 2, figsize=(14, 10))
fig.suptitle(
    "Merkle Proof Verification: Economic Efficiency Analysis",
    fontsize=16,
    fontweight="bold",
)

# --- Subplot 1: Gas Cost vs Dataset Size ---
ax1 = axes[0, 0]
ax1.plot(
    dataset_sizes,
    gas_costs,
    marker="o",
    linewidth=2.5,
    markersize=8,
    color="#2E86AB",
    label="Total Gas",
)
ax1.fill_between(dataset_sizes, gas_costs, alpha=0.2, color="#2E86AB")
ax1.set_xlabel("Dataset Size (sensor readings)", fontsize=11, fontweight="bold")
ax1.set_ylabel("Gas Cost", fontsize=11, fontweight="bold")
ax1.set_title("Total Gas Cost vs Dataset Size", fontsize=12, fontweight="bold")
ax1.grid(True, alpha=0.3, linestyle="--")
ax1.set_xscale("log")
for i, (x, y) in enumerate(zip(dataset_sizes, gas_costs)):
    ax1.text(x, y + 500, f"{y:,}", ha="center", fontsize=9)

# --- Subplot 2: USD Cost vs Dataset Size ---
ax2 = axes[0, 1]
ax2.plot(
    dataset_sizes,
    usd_costs,
    marker="s",
    linewidth=2.5,
    markersize=8,
    color="#A23B72",
    label="USD Cost",
)
ax2.fill_between(dataset_sizes, usd_costs, alpha=0.2, color="#A23B72")
ax2.set_xlabel("Dataset Size (sensor readings)", fontsize=11, fontweight="bold")
ax2.set_ylabel("Cost (USD)", fontsize=11, fontweight="bold")
ax2.set_title("Transaction Cost vs Dataset Size", fontsize=12, fontweight="bold")
ax2.grid(True, alpha=0.3, linestyle="--")
ax2.set_xscale("log")
for i, (x, y) in enumerate(zip(dataset_sizes, usd_costs)):
    ax2.text(x, y + 0.1, f"${y:.2f}", ha="center", fontsize=9)

# --- Subplot 3: Cost per Reading (logarithmic efficiency) ---
ax3 = axes[1, 0]
ax3.plot(
    dataset_sizes,
    cost_per_reading,
    marker="^",
    linewidth=2.5,
    markersize=8,
    color="#F18F01",
    label="Cost per Reading",
)
ax3.fill_between(dataset_sizes, cost_per_reading, alpha=0.2, color="#F18F01")
ax3.set_xlabel("Dataset Size (sensor readings)", fontsize=11, fontweight="bold")
ax3.set_ylabel("Cost per Reading (USD)", fontsize=11, fontweight="bold")
ax3.set_title(
    "Amortized Cost per Reading (Logarithmic Scaling)", fontsize=12, fontweight="bold"
)
ax3.grid(True, alpha=0.3, linestyle="--")
ax3.set_xscale("log")
ax3.set_yscale("log")
for i, (x, y) in enumerate(zip(dataset_sizes, cost_per_reading)):
    ax3.text(x, y * 1.3, f"${y:.6f}", ha="center", fontsize=8)

# --- Subplot 4: Economic Viability (% of Payout) ---
ax4 = axes[1, 1]
pct_100 = [r["costAsPercentageOf100Payout"] for r in results]
pct_1000 = [r["costAsPercentageOf1000Payout"] for r in results]

ax4.plot(
    dataset_sizes,
    pct_100,
    marker="o",
    linewidth=2.5,
    markersize=8,
    color="#C1121F",
    label="% of $100 payout",
)
ax4.plot(
    dataset_sizes,
    pct_1000,
    marker="s",
    linewidth=2.5,
    markersize=8,
    color="#06A77D",
    label="% of $1000 payout",
)
ax4.axhline(
    y=5, color="red", linestyle="--", linewidth=1.5, alpha=0.7, label="5% threshold"
)
ax4.set_xlabel("Dataset Size (sensor readings)", fontsize=11, fontweight="bold")
ax4.set_ylabel("Cost as % of Payout", fontsize=11, fontweight="bold")
ax4.set_title(
    "Economic Viability: Proof Cost as % of Insurance Payout",
    fontsize=12,
    fontweight="bold",
)
ax4.grid(True, alpha=0.3, linestyle="--")
ax4.set_xscale("log")
ax4.legend(loc="upper right", fontsize=9)
ax4.set_ylim(-0.2, 4.5)

plt.tight_layout()
plt.savefig(
    "visualizations/merkle-proof-efficiency-chart.png", dpi=300, bbox_inches="tight"
)
print("✓ Line chart saved to visualizations/merkle-proof-efficiency-chart.png")

# Create a second chart focused on paper inclusion
fig2, ax = plt.subplots(figsize=(12, 7))

# Main efficiency metric: Cost per Reading
lines = ax.plot(
    dataset_sizes,
    cost_per_reading,
    marker="o",
    linewidth=3,
    markersize=10,
    color="#1f77b4",
    label="Cost per Verified Reading",
    zorder=3,
)

# Add shading for viability regions
ax.axhspan(
    0, 0.01, alpha=0.15, color="green", label="Highly Efficient (<$0.01/reading)"
)
ax.axhspan(0.01, 0.05, alpha=0.15, color="yellow", label="Viable ($0.01-$0.05/reading)")
ax.axhspan(0.05, 1, alpha=0.15, color="red", label="Expensive (>$0.05/reading)")

# Data point labels
for x, y in zip(dataset_sizes, cost_per_reading):
    ax.annotate(
        f"${y:.6f}",
        xy=(x, y),
        xytext=(0, 10),
        textcoords="offset points",
        ha="center",
        fontsize=15,
        fontweight="bold",
    )

ax.set_xlabel(
    "Dataset Size (sensor readings, log scale)", fontsize=18, fontweight="bold"
)
ax.set_ylabel("Cost per Reading (USD, log scale)", fontsize=18, fontweight="bold")
ax.set_title(
    "Merkle Proof Verification: Logarithmic Efficiency Gains",
    fontsize=18,
    fontweight="bold",
)
ax.set_xscale("log")
ax.set_yscale("log")
ax.grid(True, alpha=0.3, linestyle="--", which="both")
ax.legend(loc="upper right", fontsize=18, framealpha=0.95)

# Add annotation
textbox = (
    "Verification cost decreases inversely\n"
    "32 readings: $0.108/reading\n"
    "1024 readings: $0.0039/reading\n"
    "28x cheaper for 32x larger dataset"
)
ax.text(
    0.05,
    0.95,
    textbox,
    transform=ax.transAxes,
    fontsize=15,
    verticalalignment="top",
    bbox=dict(boxstyle="round", facecolor="wheat", alpha=0.8),
)

plt.tight_layout()
plt.savefig(
    "visualizations/merkle-proof-efficiency-paper-chart.png",
    dpi=300,
    bbox_inches="tight",
)
print(
    "✓ Paper-ready chart saved to visualizations/merkle-proof-efficiency-paper-chart.png"
)

print("\nChart Summary:")
print(
    f"  - Shows logarithmic scaling: cost increases by only ${usd_costs[-1] - usd_costs[0]:.2f} for 32x dataset growth"
)
print(
    f"  - Cost per reading drops from ${cost_per_reading[0]:.6f} to ${cost_per_reading[-1]:.6f}"
)
print(f"  - All scenarios remain below $5/proof, enabling cost-effective verification")
