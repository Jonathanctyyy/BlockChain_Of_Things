#!/usr/bin/env python3
"""
Operational Latency Stacked Bar Chart
Shows latency breakdown across different pipeline stages and scenarios
"""

import matplotlib.pyplot as plt
import numpy as np
import json

# Set style
plt.rcParams["font.family"] = "sans-serif"
plt.rcParams["font.sans-serif"] = ["Arial", "DejaVu Sans", "Helvetica"]
plt.rcParams["font.size"] = 10

# Load data from benchmark
with open("insurance-claim-benchmark.json", "r") as f:
    benchmark_data = json.load(f)

# Load latency data
with open("latency-report.json", "r") as f:
    latency_data = json.load(f)

# Extract actual measured latency components from insurance_claim_detailed test
# This test provides precise component-level breakdown
insurance_claim_detailed = None
insurance_claim_averaged = None

for result in latency_data["results"]:
    if result.get("test") == "insurance_claim_detailed":
        insurance_claim_detailed = result
    elif result.get("test") == "insurance_claim_averaged":
        insurance_claim_averaged = result

if not insurance_claim_detailed:
    # Fallback to old method if new test data not available
    storeProof_data = latency_data["results"][0]
    measured_tx_creation = storeProof_data["transactionCreation"]
    measured_network = storeProof_data["networkPropagation"]
    measured_blockchain = storeProof_data["blockConfirmation"]
    offchain_client = 8.0
    crypto_proof_generation = measured_tx_creation - offchain_client
    ipfs_upload = 5.0
else:
    # Use actual measured components from detailed insurance claim test
    components = insurance_claim_detailed["components"]

    # Extract measured values (in milliseconds)
    offchain_client = components["offchain"]["total"]
    crypto_proof_generation = components["cryptographicProof"]["total"]
    ipfs_upload = components["ipfsUpload"]["total"]
    blockchain_total = components["blockchainCommitment"]["total"]

    # For reporting
    measured_tx_creation = components["blockchainCommitment"]["breakdown"][
        "transactionSubmit"
    ]
    measured_network = components["blockchainCommitment"]["breakdown"][
        "networkPropagation"
    ]
    measured_blockchain = components["blockchainCommitment"]["breakdown"][
        "blockConfirmation"
    ]

# Calculate component breakdowns (in milliseconds)
# Scenario 1: Fully Automated (no human intervention)
scenario1_offchain = offchain_client
scenario1_crypto_proof = crypto_proof_generation
scenario1_ipfs = ipfs_upload
scenario1_blockchain = (
    blockchain_total
    if insurance_claim_detailed
    else (measured_blockchain + measured_network)
)
scenario1_human = 0  # No human intervention

# Scenario 2: Semi-automated with Lawyer Review
# Add human review time (2-4 hours typical, let's use 3 hours = 10,800,000 ms)
scenario2_offchain = offchain_client
scenario2_crypto_proof = crypto_proof_generation
scenario2_ipfs = ipfs_upload
scenario2_blockchain = scenario1_blockchain
scenario2_human = 3 * 3600 * 1000  # 3 hours in milliseconds

# Scenario 3: Manual Process with Multiple Review Steps
# Add extensive human verification (1-2 days typical, let's use 1.5 days)
scenario3_offchain = offchain_client
scenario3_crypto_proof = crypto_proof_generation
scenario3_ipfs = ipfs_upload
scenario3_blockchain = scenario1_blockchain
scenario3_human = 1.5 * 24 * 3600 * 1000  # 1.5 days in milliseconds


# For better visualization on log scale, convert to seconds
def ms_to_sec(ms):
    return ms / 1000.0


# Convert all to seconds
scenarios = [
    "Scenario 1:\nFully Automated\n(0 human steps)",
    "Scenario 2:\nWith Lawyer Review\n(1 manual step)",
    "Scenario 3:\nTraditional Process\n(8 manual steps)",
]

# Components for each scenario (in seconds)
offchain = [
    ms_to_sec(scenario1_offchain),
    ms_to_sec(scenario2_offchain),
    ms_to_sec(scenario3_offchain),
]
crypto_proof = [
    ms_to_sec(scenario1_crypto_proof),
    ms_to_sec(scenario2_crypto_proof),
    ms_to_sec(scenario3_crypto_proof),
]
ipfs = [ms_to_sec(scenario1_ipfs), ms_to_sec(scenario2_ipfs), ms_to_sec(scenario3_ipfs)]
blockchain = [
    ms_to_sec(scenario1_blockchain),
    ms_to_sec(scenario2_blockchain),
    ms_to_sec(scenario3_blockchain),
]
human = [
    ms_to_sec(scenario1_human),
    ms_to_sec(scenario2_human),
    ms_to_sec(scenario3_human),
]

# Create figure
fig, ax = plt.subplots(figsize=(12, 7))

# Define colors for each component
colors = {
    "offchain": "#3498db",  # Blue
    "crypto": "#2ecc71",  # Green
    "ipfs": "#f39c12",  # Orange
    "blockchain": "#9b59b6",  # Purple
    "human": "#e74c3c",  # Red
}

# Bar width and positions
bar_width = 0.6
y_pos = np.arange(len(scenarios))

# Create horizontal stacked bars
# Start with off-chain
bars1 = ax.barh(
    y_pos,
    offchain,
    bar_width,
    label="Off-chain Processing",
    color=colors["offchain"],
    edgecolor="white",
    linewidth=1.5,
)

# Add cryptographic proof on top of off-chain
bars2 = ax.barh(
    y_pos,
    crypto_proof,
    bar_width,
    left=offchain,
    label="Cryptographic Proof Generation",
    color=colors["crypto"],
    edgecolor="white",
    linewidth=1.5,
)

# Add IPFS
left_so_far = [offchain[i] + crypto_proof[i] for i in range(len(scenarios))]
bars3 = ax.barh(
    y_pos,
    ipfs,
    bar_width,
    left=left_so_far,
    label="IPFS Upload",
    color=colors["ipfs"],
    edgecolor="white",
    linewidth=1.5,
)

# Add blockchain commitment
left_so_far = [left_so_far[i] + ipfs[i] for i in range(len(scenarios))]
bars4 = ax.barh(
    y_pos,
    blockchain,
    bar_width,
    left=left_so_far,
    label="Blockchain Commitment",
    color=colors["blockchain"],
    edgecolor="white",
    linewidth=1.5,
)

# Add human intervention (only for scenarios 2 and 3)
left_so_far = [left_so_far[i] + blockchain[i] for i in range(len(scenarios))]
bars5 = ax.barh(
    y_pos,
    human,
    bar_width,
    left=left_so_far,
    label="Human Intervention",
    color=colors["human"],
    edgecolor="white",
    linewidth=1.5,
)

# Set logarithmic scale for x-axis (since human intervention is orders of magnitude larger)
ax.set_xscale("log")

# Labels and title
ax.set_ylabel("Scenario", fontsize=12, fontweight="bold")
ax.set_xlabel("Latency (seconds, log scale)", fontsize=12, fontweight="bold")
ax.set_title(
    "Operational Latency Analysis: Automated vs Manual Insurance Claims\nPipeline Breakdown by Component",
    fontsize=14,
    fontweight="bold",
    pad=20,
)

# Set y-axis
ax.set_yticks(y_pos)
ax.set_yticklabels(scenarios, fontsize=11)
ax.invert_yaxis()  # Top to bottom

# Add grid for readability
ax.grid(axis="x", alpha=0.3, linestyle="--", linewidth=0.7)
ax.set_axisbelow(True)

# Legend
ax.legend(loc="upper right", fontsize=10, framealpha=0.95, edgecolor="black")

# Add total time annotations on the right side
totals = [
    sum([offchain[i], crypto_proof[i], ipfs[i], blockchain[i], human[i]])
    for i in range(len(scenarios))
]
for i, (total, scenario) in enumerate(zip(totals, scenarios)):
    if total < 1:
        time_str = f"{total*1000:.1f} ms"
    elif total < 60:
        time_str = f"{total:.2f} s"
    elif total < 3600:
        time_str = f"{total/60:.1f} min"
    elif total < 86400:
        time_str = f"{total/3600:.1f} hrs"
    else:
        time_str = f"{total/86400:.1f} days"

    ax.text(
        total * 1.15,
        i,
        f"Total: {time_str}",
        va="center",
        ha="left",
        fontsize=10,
        fontweight="bold",
        bbox=dict(
            boxstyle="round,pad=0.4", facecolor="white", edgecolor="gray", alpha=0.8
        ),
    )

# Add algorithmic latency annotation (constant across scenarios)
algorithmic_latency = offchain[0] + crypto_proof[0] + ipfs[0] + blockchain[0]
fig.text(
    0.15,
    0.02,
    f"Key Insight: Algorithmic latency is constant ({algorithmic_latency*1000:.1f} ms across all scenarios)\n"
    + f"Human intervention is the bottleneck, not blockchain technology",
    ha="left",
    fontsize=10,
    style="italic",
    bbox=dict(
        boxstyle="round,pad=0.8", facecolor="lightyellow", edgecolor="orange", alpha=0.9
    ),
)

# Adjust layout
plt.tight_layout(rect=[0, 0.05, 1, 1])

# Save as high-resolution PNG and PDF
plt.savefig(
    "visualizations/operational-latency-stacked.png", dpi=300, bbox_inches="tight"
)
plt.savefig("visualizations/operational-latency-stacked.pdf", bbox_inches="tight")
print("✓ Saved: visualizations/operational-latency-stacked.png (300 DPI)")
print("✓ Saved: visualizations/operational-latency-stacked.pdf (vector)")

# Print statistics
print("\n" + "=" * 70)
print("OPERATIONAL LATENCY BREAKDOWN (Using Detailed Insurance Claim Data)")
print("=" * 70)

if insurance_claim_detailed:
    print(f"\nData Source: insurance_claim_detailed test from latency-report.json")
    print(f"  Measured Off-chain Processing:  {offchain_client:.2f} ms")
    print(
        f"    ├─ Data Retrieval:             {components['offchain']['breakdown']['dataRetrieval']:.4f} ms"
    )
    print(
        f"    └─ Account Setup:              {components['offchain']['breakdown']['accountSetup']:.2f} ms"
    )
    print(f"  Measured Cryptographic Proof:   {crypto_proof_generation:.2f} ms")
    print(
        f"    ├─ Merkle Tree Generation:     {components['cryptographicProof']['breakdown']['merkleTreeGeneration']:.2f} ms"
    )
    print(
        f"    ├─ Proof Extraction:           {components['cryptographicProof']['breakdown']['proofExtraction']:.2f} ms"
    )
    print(
        f"    └─ Digital Signature:          {components['cryptographicProof']['breakdown']['digitalSignature']:.2f} ms"
    )
    print(f"  Measured IPFS Upload:           {ipfs_upload:.2f} ms")
    print(
        f"    ├─ Metadata Preparation:       {components['ipfsUpload']['breakdown']['metadataPreparation']:.4f} ms"
    )
    print(
        f"    └─ Network Upload:             {components['ipfsUpload']['breakdown']['networkUpload']:.2f} ms"
    )
    print(f"  Measured Blockchain Commitment: {blockchain_total:.2f} ms")
    print(
        f"    ├─ Transaction Preparation:    {components['blockchainCommitment']['breakdown']['transactionPreparation']:.4f} ms"
    )
    print(f"    ├─ Transaction Submit:         {measured_tx_creation:.2f} ms")
    print(f"    ├─ Network Propagation:        {measured_network:.4f} ms")
    print(f"    └─ Block Confirmation:         {measured_blockchain:.2f} ms")
    print(
        f"  Total Measured E2E Latency:     {insurance_claim_detailed['totalLatency']:.2f} ms"
    )
    print(f"\n  Component Percentages:")
    for component, percentage in insurance_claim_detailed["percentages"].items():
        print(f"    {component}: {percentage}")
else:
    print(f"\nData Source: storeProof test from latency-report.json (fallback)")
    print(f"  Measured Transaction Creation: {measured_tx_creation:.2f} ms")
    print(f"  Measured Network Propagation:  {measured_network:.4f} ms")
    print(f"  Measured Block Confirmation:   {measured_blockchain:.2f} ms")

print(f"\nScenario 1 (Fully Automated):")
print(f"  Off-chain (client):  {offchain[0]*1000:.2f} ms")
print(f"  Crypto Proof:        {crypto_proof[0]*1000:.2f} ms")
print(f"  IPFS Upload:         {ipfs[0]*1000:.2f} ms")
print(f"  Blockchain:          {blockchain[0]*1000:.2f} ms")
print(f"  Human:               {human[0]:.2f} s")
print(f"  TOTAL:               {totals[0]*1000:.2f} ms")

print(f"\nScenario 2 (With Lawyer Review - 3 hours):")
print(
    f"  Algorithmic:         {(offchain[1] + crypto_proof[1] + ipfs[1] + blockchain[1])*1000:.2f} ms"
)
print(f"  Human:               {human[1]/3600:.2f} hours")
print(f"  TOTAL:               {totals[1]/3600:.2f} hours")
print(f"  Speedup vs Scenario 1: {totals[1]/totals[0]:.0f}x SLOWER")

print(f"\nScenario 3 (Traditional - 1.5 days):")
print(
    f"  Algorithmic:         {(offchain[2] + crypto_proof[2] + ipfs[2] + blockchain[2])*1000:.2f} ms"
)
print(f"  Human:               {human[2]/86400:.2f} days")
print(f"  TOTAL:               {totals[2]/86400:.2f} days")
print(f"  Speedup vs Scenario 1: {totals[2]/totals[0]:.0f}x SLOWER")

print(f"\n" + "=" * 70)
print(f"CONCLUSION:")
print(f"  Blockchain is NOT the bottleneck!")
print(f"  Algorithmic latency: {algorithmic_latency*1000:.1f} ms (constant)")
print(f"  Human intervention adds: 3 hours to 1.5 days")
print(f"  Automation eliminates the bottleneck entirely")
print("=" * 70)

plt.show()
