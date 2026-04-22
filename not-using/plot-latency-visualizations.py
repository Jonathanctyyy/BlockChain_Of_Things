#!/usr/bin/env python3
"""
Generate Multiple Latency Visualizations from Breakdown Data
Creates: Pie Chart, Waterfall Chart, Nested Bar Chart, Treemap
"""

import json
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import Rectangle
import numpy as np

# Academic styling
plt.rcParams["font.family"] = "sans-serif"
plt.rcParams["font.sans-serif"] = ["Arial", "Helvetica", "DejaVu Sans"]
plt.rcParams["font.size"] = 10
plt.rcParams["axes.labelsize"] = 11
plt.rcParams["axes.titlesize"] = 12
plt.rcParams["xtick.labelsize"] = 9
plt.rcParams["ytick.labelsize"] = 9
plt.rcParams["legend.fontsize"] = 9

# Color palette
COLORS = {
    "offchain": "#2E86AB",  # Blue
    "crypto": "#A23B72",  # Purple
    "ipfs": "#F18F01",  # Orange
    "blockchain": "#C73E1D",  # Red
}


def load_data():
    """Load latency data"""
    with open("latency-report.json", "r") as f:
        data = json.load(f)

    for result in data["results"]:
        if result.get("test") == "insurance_claim_detailed":
            return result

    raise ValueError("insurance_claim_detailed not found")


def plot_pie_chart(data):
    """Generate pie chart showing percentage breakdown"""
    fig, ax = plt.subplots(figsize=(8, 6))

    components = data["components"]

    # Main components only
    labels = [
        "Off-chain\nProcessing",
        "Cryptographic\nProof",
        "IPFS\nUpload",
        "Blockchain\nCommitment",
    ]
    sizes = [
        components["offchain"]["total"],
        components["cryptographicProof"]["total"],
        components["ipfsUpload"]["total"],
        components["blockchainCommitment"]["total"],
    ]
    colors = [
        COLORS["offchain"],
        COLORS["crypto"],
        COLORS["ipfs"],
        COLORS["blockchain"],
    ]

    # Calculate percentages
    total = sum(sizes)
    percentages = [f"{(s/total*100):.1f}%" for s in sizes]

    # Create pie chart with custom styling
    wedges, texts, autotexts = ax.pie(
        sizes,
        labels=None,  # We'll add custom labels
        colors=colors,
        autopct="%1.1f%%",
        startangle=90,
        textprops={"fontsize": 10, "weight": "bold", "color": "white"},
        pctdistance=0.75,
        explode=(0.05, 0.05, 0.05, 0.05),  # Slightly separate all slices
    )

    # Add legend with labels and actual times
    legend_labels = [f"{label}\n{size:.2f}ms" for label, size in zip(labels, sizes)]
    ax.legend(
        legend_labels,
        loc="center left",
        bbox_to_anchor=(1, 0.5),
        frameon=False,
        fontsize=9,
    )

    ax.set_title(
        f"Insurance Claim E2E Latency Distribution\nTotal: {total:.2f}ms",
        fontsize=12,
        weight="bold",
        pad=20,
    )

    plt.tight_layout()

    # Save
    plt.savefig("visualizations/latency-pie-chart.png", dpi=300, bbox_inches="tight")
    plt.savefig("visualizations/latency-pie-chart.pdf", bbox_inches="tight")
    plt.close()

    print("✓ Saved: visualizations/latency-pie-chart.png/pdf")


def plot_waterfall_chart(data):
    """Generate waterfall chart showing cumulative latency"""
    fig, ax = plt.subplots(figsize=(10, 6))

    components = data["components"]

    # Define stages
    stages = [
        ("Off-chain", components["offchain"]["total"]),
        ("Crypto Proof", components["cryptographicProof"]["total"]),
        ("IPFS Upload", components["ipfsUpload"]["total"]),
        ("Blockchain", components["blockchainCommitment"]["total"]),
    ]

    # Calculate positions
    x_positions = np.arange(len(stages))
    cumulative = 0
    bars = []
    bottoms = []
    heights = []
    colors_list = [
        COLORS["offchain"],
        COLORS["crypto"],
        COLORS["ipfs"],
        COLORS["blockchain"],
    ]

    for i, (label, value) in enumerate(stages):
        bottoms.append(cumulative)
        heights.append(value)
        cumulative += value

    # Draw bars
    for i, (label, value) in enumerate(stages):
        bar = ax.bar(
            x_positions[i],
            heights[i],
            bottom=bottoms[i],
            color=colors_list[i],
            edgecolor="black",
            linewidth=1,
            width=0.6,
        )

        # Add value labels on bars
        ax.text(
            x_positions[i],
            bottoms[i] + heights[i] / 2,
            f"{value:.2f}ms\n({value/cumulative*100:.1f}%)",
            ha="center",
            va="center",
            color="white",
            fontsize=9,
            weight="bold",
        )

    # Add connecting lines
    for i in range(len(stages) - 1):
        y_level = bottoms[i + 1]
        ax.plot(
            [x_positions[i] + 0.3, x_positions[i + 1] - 0.3],
            [y_level, y_level],
            "k--",
            linewidth=1,
            alpha=0.5,
        )

    # Add total line
    ax.axhline(y=cumulative, color="red", linestyle="--", linewidth=2, alpha=0.7)
    ax.text(
        len(stages) - 0.5,
        cumulative + 5,
        f"Total: {cumulative:.2f}ms",
        fontsize=10,
        weight="bold",
        color="red",
    )

    # Formatting
    ax.set_ylabel("Cumulative Latency (ms)", fontsize=11, weight="bold")
    ax.set_xlabel("Pipeline Stage", fontsize=11, weight="bold")
    ax.set_title(
        "Insurance Claim Processing Pipeline - Waterfall View",
        fontsize=12,
        weight="bold",
        pad=15,
    )
    ax.set_xticks(x_positions)
    ax.set_xticklabels([label for label, _ in stages], rotation=0)
    ax.set_ylim(0, cumulative * 1.1)
    ax.grid(axis="y", alpha=0.3, linestyle="--")
    ax.set_axisbelow(True)

    plt.tight_layout()

    # Save
    plt.savefig(
        "visualizations/latency-waterfall-chart.png", dpi=300, bbox_inches="tight"
    )
    plt.savefig("visualizations/latency-waterfall-chart.pdf", bbox_inches="tight")
    plt.close()

    print("✓ Saved: visualizations/latency-waterfall-chart.png/pdf")


def plot_nested_bar_chart(data):
    """Generate nested bar chart showing components and sub-components"""
    fig, ax = plt.subplots(figsize=(12, 8))

    components = data["components"]

    # Prepare hierarchical data
    hierarchy = [
        {
            "name": "Off-chain",
            "total": components["offchain"]["total"],
            "color": COLORS["offchain"],
            "children": [
                (
                    "Data Retrieval",
                    components["offchain"]["breakdown"]["dataRetrieval"],
                ),
                ("Account Setup", components["offchain"]["breakdown"]["accountSetup"]),
            ],
        },
        {
            "name": "Crypto Proof",
            "total": components["cryptographicProof"]["total"],
            "color": COLORS["crypto"],
            "children": [
                (
                    "Merkle Tree",
                    components["cryptographicProof"]["breakdown"][
                        "merkleTreeGeneration"
                    ],
                ),
                (
                    "Proof Extract",
                    components["cryptographicProof"]["breakdown"]["proofExtraction"],
                ),
                (
                    "Signature",
                    components["cryptographicProof"]["breakdown"]["digitalSignature"],
                ),
            ],
        },
        {
            "name": "IPFS Upload",
            "total": components["ipfsUpload"]["total"],
            "color": COLORS["ipfs"],
            "children": [
                (
                    "Metadata Prep",
                    components["ipfsUpload"]["breakdown"]["metadataPreparation"],
                ),
                (
                    "Network Upload",
                    components["ipfsUpload"]["breakdown"]["networkUpload"],
                ),
            ],
        },
        {
            "name": "Blockchain",
            "total": components["blockchainCommitment"]["total"],
            "color": COLORS["blockchain"],
            "children": [
                (
                    "TX Prep",
                    components["blockchainCommitment"]["breakdown"][
                        "transactionPreparation"
                    ],
                ),
                (
                    "TX Submit",
                    components["blockchainCommitment"]["breakdown"][
                        "transactionSubmit"
                    ],
                ),
                (
                    "Network Prop",
                    components["blockchainCommitment"]["breakdown"][
                        "networkPropagation"
                    ],
                ),
                (
                    "Block Confirm",
                    components["blockchainCommitment"]["breakdown"][
                        "blockConfirmation"
                    ],
                ),
            ],
        },
    ]

    y_pos = 0
    y_positions = []
    y_labels = []

    total_e2e = data["totalLatency"]

    for stage in hierarchy:
        # Main component bar
        main_bar = ax.barh(
            y_pos,
            stage["total"],
            height=0.8,
            color=stage["color"],
            edgecolor="black",
            linewidth=1.5,
            label=stage["name"],
        )

        # Add label with percentage
        percentage = (stage["total"] / total_e2e) * 100
        ax.text(
            stage["total"] + 2,
            y_pos,
            f"{stage['total']:.2f}ms ({percentage:.1f}%)",
            va="center",
            fontsize=10,
            weight="bold",
        )

        y_positions.append(y_pos)
        y_labels.append(f"{stage['name']}")
        y_pos -= 1

        # Sub-component bars (indented)
        for child_name, child_value in stage["children"]:
            if child_value > 0.01:  # Only show if > 0.01ms
                ax.barh(
                    y_pos,
                    child_value,
                    height=0.5,
                    color=stage["color"],
                    alpha=0.5,
                    edgecolor="gray",
                    linewidth=0.5,
                )

                # Add sub-component label
                ax.text(
                    child_value + 1,
                    y_pos,
                    f"  {child_name}: {child_value:.2f}ms",
                    va="center",
                    fontsize=8,
                    style="italic",
                    color="gray",
                )

                y_positions.append(y_pos)
                y_labels.append(f"  └─ {child_name}")
                y_pos -= 0.6

        y_pos -= 0.4  # Extra spacing between stages

    # Formatting
    ax.set_xlabel("Latency (ms)", fontsize=11, weight="bold")
    ax.set_title(
        f"Insurance Claim Component Breakdown (Total: {total_e2e:.2f}ms)",
        fontsize=12,
        weight="bold",
        pad=15,
    )
    ax.set_yticks(y_positions)
    ax.set_yticklabels(y_labels, fontsize=9)
    ax.set_xlim(0, total_e2e * 0.8)
    ax.grid(axis="x", alpha=0.3, linestyle="--")
    ax.set_axisbelow(True)
    ax.invert_yaxis()

    plt.tight_layout()

    # Save
    plt.savefig(
        "visualizations/latency-nested-bar-chart.png", dpi=300, bbox_inches="tight"
    )
    plt.savefig("visualizations/latency-nested-bar-chart.pdf", bbox_inches="tight")
    plt.close()

    print("✓ Saved: visualizations/latency-nested-bar-chart.png/pdf")


def plot_treemap(data):
    """Generate treemap showing hierarchical breakdown"""
    import squarify  # pip install squarify

    fig, ax = plt.subplots(figsize=(12, 8))

    components = data["components"]
    total = data["totalLatency"]

    # Prepare flat data for treemap
    labels = []
    sizes = []
    colors = []

    # Off-chain
    labels.append(f"Off-chain\n{components['offchain']['total']:.2f}ms\n(12.20%)")
    sizes.append(components["offchain"]["total"])
    colors.append(COLORS["offchain"])

    # Crypto Proof
    labels.append(
        f"Crypto Proof\n{components['cryptographicProof']['total']:.2f}ms\n(21.74%)"
    )
    sizes.append(components["cryptographicProof"]["total"])
    colors.append(COLORS["crypto"])

    # IPFS
    labels.append(f"IPFS Upload\n{components['ipfsUpload']['total']:.2f}ms\n(3.40%)")
    sizes.append(components["ipfsUpload"]["total"])
    colors.append(COLORS["ipfs"])

    # Blockchain
    labels.append(
        f"Blockchain\n{components['blockchainCommitment']['total']:.2f}ms\n(62.66%)"
    )
    sizes.append(components["blockchainCommitment"]["total"])
    colors.append(COLORS["blockchain"])

    # Create treemap
    squarify.plot(
        sizes=sizes,
        label=labels,
        color=colors,
        alpha=0.8,
        text_kwargs={"fontsize": 10, "weight": "bold", "color": "white"},
        edgecolor="white",
        linewidth=3,
        ax=ax,
    )

    ax.set_title(
        f"Insurance Claim Latency Treemap (Total: {total:.2f}ms)",
        fontsize=14,
        weight="bold",
        pad=15,
    )
    ax.axis("off")

    plt.tight_layout()

    # Save
    plt.savefig("visualizations/latency-treemap.png", dpi=300, bbox_inches="tight")
    plt.savefig("visualizations/latency-treemap.pdf", bbox_inches="tight")
    plt.close()

    print("✓ Saved: visualizations/latency-treemap.png/pdf")


def plot_horizontal_comparison(data):
    """Generate simple horizontal bar comparison"""
    fig, ax = plt.subplots(figsize=(10, 5))

    components = data["components"]
    total = data["totalLatency"]

    stages = ["Off-chain", "Crypto Proof", "IPFS Upload", "Blockchain"]
    values = [
        components["offchain"]["total"],
        components["cryptographicProof"]["total"],
        components["ipfsUpload"]["total"],
        components["blockchainCommitment"]["total"],
    ]
    colors_list = [
        COLORS["offchain"],
        COLORS["crypto"],
        COLORS["ipfs"],
        COLORS["blockchain"],
    ]
    percentages = [f"{(v/total*100):.1f}%" for v in values]

    y_pos = np.arange(len(stages))

    bars = ax.barh(y_pos, values, color=colors_list, edgecolor="black", linewidth=1)

    # Add value labels
    for i, (bar, value, pct) in enumerate(zip(bars, values, percentages)):
        ax.text(
            value + 2,
            i,
            f"{value:.2f}ms ({pct})",
            va="center",
            fontsize=10,
            weight="bold",
        )

    ax.set_yticks(y_pos)
    ax.set_yticklabels(stages, fontsize=11)
    ax.set_xlabel("Latency (ms)", fontsize=11, weight="bold")
    ax.set_title(
        f"Insurance Claim E2E Latency by Stage (Total: {total:.2f}ms)",
        fontsize=12,
        weight="bold",
        pad=15,
    )
    ax.grid(axis="x", alpha=0.3, linestyle="--")
    ax.set_axisbelow(True)

    plt.tight_layout()

    # Save
    plt.savefig(
        "visualizations/latency-horizontal-comparison.png", dpi=300, bbox_inches="tight"
    )
    plt.savefig("visualizations/latency-horizontal-comparison.pdf", bbox_inches="tight")
    plt.close()

    print("✓ Saved: visualizations/latency-horizontal-comparison.png/pdf")


def main():
    """Generate all visualizations"""
    print("\n🎨 Generating latency visualizations...\n")

    try:
        data = load_data()

        # Generate all charts
        plot_pie_chart(data)
        plot_waterfall_chart(data)
        plot_nested_bar_chart(data)
        plot_horizontal_comparison(data)

        # Try treemap (requires squarify)
        try:
            plot_treemap(data)
        except ImportError:
            print("⚠️  Skipping treemap (requires: pip install squarify)")

        print("\n" + "=" * 70)
        print("✅ ALL LATENCY VISUALIZATIONS GENERATED")
        print("=" * 70)
        print("\nGenerated visualizations:")
        print("  📊 Pie Chart - Percentage distribution")
        print("  📊 Waterfall Chart - Cumulative latency flow")
        print("  📊 Nested Bar Chart - Components with sub-components")
        print("  📊 Horizontal Comparison - Simple side-by-side comparison")
        print("  📊 Treemap - Hierarchical space-filling visualization (optional)")
        print("\nUse these in presentations, papers, or documentation!")
        print()

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback

        traceback.print_exc()


if __name__ == "__main__":
    main()
