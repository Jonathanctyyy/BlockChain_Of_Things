#!/usr/bin/env python3
"""
Probability Density Visualization for Smart Contract Transaction Times
Generates publication-quality plots from throughput-report.json
"""

import json
import matplotlib.pyplot as plt
import numpy as np
from pathlib import Path
from scipy.interpolate import make_interp_spline
from scipy.stats import gaussian_kde

# Academic styling
plt.style.use("seaborn-v0_8-paper")
plt.rcParams.update(
    {
        "font.family": "serif",
        "font.size": 10,
        "axes.labelsize": 11,
        "axes.titlesize": 12,
        "xtick.labelsize": 9,
        "ytick.labelsize": 9,
        "legend.fontsize": 9,
        "figure.titlesize": 13,
        "figure.dpi": 300,
    }
)


def load_throughput_data():
    """Load throughput report data"""
    with open("throughput-report.json", "r") as f:
        return json.load(f)


def plot_probability_density(test_name, data, output_dir="visualizations"):
    """Plot probability density function for contract and client times"""
    Path(output_dir).mkdir(exist_ok=True)

    if "probabilityDensity" not in data:
        print(f"No probability density data for {test_name}")
        return

    pdf_data = data["probabilityDensity"]
    stats = data.get("statistics", {})

    # Create figure with subplots
    fig, axes = plt.subplots(1, 2 if "client" in pdf_data else 1, figsize=(12, 4))
    if not isinstance(axes, np.ndarray):
        axes = [axes]

    # Plot contract time probability density
    if "contract" in pdf_data:
        contract_pdf = pdf_data["contract"]
        contract_stats = stats.get("contract", {})

        bins = contract_pdf["bins"]
        centers = [(b["start"] + b["end"]) / 2 for b in bins]
        densities = [b["density"] for b in bins]
        widths = [b["end"] - b["start"] for b in bins]

        axes[0].bar(
            centers,
            densities,
            width=widths[0],
            alpha=0.7,
            edgecolor="black",
            linewidth=0.5,
            color="#2E86AB",
        )

        # Add statistical markers
        mean = contract_stats.get("mean", 0)
        median = contract_stats.get("median", 0)
        axes[0].axvline(
            mean, color="red", linestyle="--", linewidth=1.5, label=f"Mean: {mean:.4f}s"
        )
        axes[0].axvline(
            median,
            color="green",
            linestyle="-.",
            linewidth=1.5,
            label=f"Median: {median:.4f}s",
        )

        axes[0].set_xlabel("Transaction Time (seconds)")
        axes[0].set_ylabel("Probability Density")
        axes[0].set_title("Smart Contract Execution Time Distribution")
        axes[0].legend(loc="upper right")
        axes[0].grid(True, alpha=0.3, linestyle=":", linewidth=0.5)

        # Add statistics box
        textstr = f"σ = {contract_stats.get('stdDev', 0):.4f}s\n"
        textstr += f"P95 = {contract_stats.get('p95', 0):.4f}s\n"
        textstr += f"n = {contract_pdf['totalSamples']}"
        props = dict(boxstyle="round", facecolor="wheat", alpha=0.5)
        axes[0].text(
            0.98,
            0.97,
            textstr,
            transform=axes[0].transAxes,
            verticalalignment="top",
            horizontalalignment="right",
            bbox=props,
            fontsize=8,
        )

    # Plot client time probability density
    if "client" in pdf_data and len(axes) > 1:
        client_pdf = pdf_data["client"]
        client_stats = stats.get("client", {})

        bins = client_pdf["bins"]
        centers = [(b["start"] + b["end"]) / 2 for b in bins]
        densities = [b["density"] for b in bins]
        widths = [b["end"] - b["start"] for b in bins]

        axes[1].bar(
            centers,
            densities,
            width=widths[0],
            alpha=0.7,
            edgecolor="black",
            linewidth=0.5,
            color="#A23B72",
        )

        # Add statistical markers
        mean = client_stats.get("mean", 0)
        median = client_stats.get("median", 0)
        axes[1].axvline(
            mean, color="red", linestyle="--", linewidth=1.5, label=f"Mean: {mean:.4f}s"
        )
        axes[1].axvline(
            median,
            color="green",
            linestyle="-.",
            linewidth=1.5,
            label=f"Median: {median:.4f}s",
        )

        axes[1].set_xlabel("Transaction Time (seconds)")
        axes[1].set_ylabel("Probability Density")
        axes[1].set_title("Client-Side Processing Time Distribution")
        axes[1].legend(loc="upper right")
        axes[1].grid(True, alpha=0.3, linestyle=":", linewidth=0.5)

        # Add statistics box
        textstr = f"σ = {client_stats.get('stdDev', 0):.4f}s\n"
        textstr += f"P95 = {client_stats.get('p95', 0):.4f}s\n"
        textstr += f"n = {client_pdf['totalSamples']}"
        props = dict(boxstyle="round", facecolor="wheat", alpha=0.5)
        axes[1].text(
            0.98,
            0.97,
            textstr,
            transform=axes[1].transAxes,
            verticalalignment="top",
            horizontalalignment="right",
            bbox=props,
            fontsize=8,
        )

    plt.tight_layout()
    output_file = f"{output_dir}/pdf_{test_name}.png"
    plt.savefig(output_file, dpi=300, bbox_inches="tight")
    print(f"✓ Saved: {output_file}")
    plt.close()


def plot_cumulative_distribution(test_name, data, output_dir="visualizations"):
    """Plot cumulative distribution function (CDF)"""
    Path(output_dir).mkdir(exist_ok=True)

    if "probabilityDensity" not in data:
        return

    pdf_data = data["probabilityDensity"]

    fig, ax = plt.subplots(figsize=(8, 5))

    # Plot contract CDF
    if "contract" in pdf_data:
        contract_pdf = pdf_data["contract"]
        bins = contract_pdf["bins"]

        centers = [(b["start"] + b["end"]) / 2 for b in bins]
        cumulative = np.cumsum([b["frequency"] for b in bins])

        ax.plot(
            centers,
            cumulative,
            marker="o",
            linestyle="-",
            linewidth=2,
            markersize=4,
            label="Smart Contract Execution",
            color="#2E86AB",
        )

        # Add percentile markers
        percentiles = [0.50, 0.90, 0.95, 0.99]
        for p in percentiles:
            idx = np.searchsorted(cumulative, p)
            if idx < len(centers):
                ax.plot(centers[idx], p, "ro", markersize=6)
                ax.annotate(
                    f"P{int(p*100)}",
                    (centers[idx], p),
                    xytext=(5, 5),
                    textcoords="offset points",
                    fontsize=8,
                    color="red",
                )

    # Plot client CDF if available
    if "client" in pdf_data:
        client_pdf = pdf_data["client"]
        bins = client_pdf["bins"]

        centers = [(b["start"] + b["end"]) / 2 for b in bins]
        cumulative = np.cumsum([b["frequency"] for b in bins])

        ax.plot(
            centers,
            cumulative,
            marker="s",
            linestyle="--",
            linewidth=2,
            markersize=4,
            label="Client-Side Processing",
            color="#A23B72",
        )

    ax.set_xlabel("Transaction Time (seconds)")
    ax.set_ylabel("Cumulative Probability")
    ax.set_title(
        f'Cumulative Distribution Function - {test_name.replace("_", " ").title()}'
    )
    ax.legend(loc="lower right")
    ax.grid(True, alpha=0.3, linestyle=":", linewidth=0.5)
    ax.set_ylim([0, 1.05])

    plt.tight_layout()
    output_file = f"{output_dir}/cdf_{test_name}.png"
    plt.savefig(output_file, dpi=300, bbox_inches="tight")
    print(f"✓ Saved: {output_file}")
    plt.close()


def plot_comparison_boxplot(report_data, output_dir="visualizations"):
    """Create box plot comparing different test scenarios"""
    Path(output_dir).mkdir(exist_ok=True)

    fig, ax = plt.subplots(figsize=(10, 6))

    test_names = []
    contract_stats = []

    for test_name, data in report_data["results"].items():
        if "statistics" in data and "contract" in data["statistics"]:
            stats = data["statistics"]["contract"]
            test_names.append(test_name.replace("_", "\n"))

            # Create box plot data: [min, Q1, median, Q3, max]
            box_data = [
                stats["min"],
                stats["p25"],
                stats["median"],
                stats["p75"],
                stats["max"],
            ]
            contract_stats.append(box_data)

    if contract_stats:
        positions = range(1, len(contract_stats) + 1)
        bp = ax.boxplot(
            contract_stats,
            positions=positions,
            widths=0.6,
            patch_artist=True,
            showfliers=True,
            medianprops=dict(color="red", linewidth=2),
            boxprops=dict(facecolor="lightblue", edgecolor="black"),
        )

        ax.set_xticklabels(test_names, rotation=0, ha="center", fontsize=8)
        ax.set_ylabel("Transaction Time (seconds)")
        ax.set_title("Smart Contract Execution Time Distribution Across Tests")
        ax.grid(True, alpha=0.3, linestyle=":", linewidth=0.5, axis="y")

        plt.tight_layout()
        output_file = f"{output_dir}/comparison_boxplot.png"
        plt.savefig(output_file, dpi=300, bbox_inches="tight")
        print(f"✓ Saved: {output_file}")
        plt.close()


def generate_statistics_table(report_data, output_dir="visualizations"):
    """Generate LaTeX table with statistical summary"""
    Path(output_dir).mkdir(exist_ok=True)

    table = "\\begin{table}[htbp]\n"
    table += "\\centering\n"
    table += "\\caption{Statistical Summary of Smart Contract Transaction Times}\n"
    table += "\\label{tab:transaction_statistics}\n"
    table += "\\begin{tabular}{lcccccc}\n"
    table += "\\hline\n"
    table += "Test Scenario & Mean (s) & Median (s) & Std Dev (s) & P95 (s) & P99 (s) & n \\\\\n"
    table += "\\hline\n"

    for test_name, data in report_data["results"].items():
        if "statistics" in data and "contract" in data["statistics"]:
            stats = data["statistics"]["contract"]
            name = test_name.replace("_", " ").title()
            table += f"{name} & "
            table += f"{stats['mean']:.4f} & "
            table += f"{stats['median']:.4f} & "
            table += f"{stats['stdDev']:.4f} & "
            table += f"{stats['p95']:.4f} & "
            table += f"{stats.get('p99', 0):.4f} & "

            # Get sample count from PDF data
            n = (
                data.get("probabilityDensity", {})
                .get("contract", {})
                .get("totalSamples", 0)
            )
            table += f"{n} \\\\\n"

    table += "\\hline\n"
    table += "\\end{tabular}\n"
    table += "\\end{table}\n"

    output_file = f"{output_dir}/statistics_table.tex"
    with open(output_file, "w") as f:
        f.write(table)

    print(f"✓ Saved: {output_file}")


def plot_multiline_probability_density(report_data, output_dir="visualizations"):
    """
    Create a multi-line smooth probability density plot comparing different operation types
    Groups by function type rather than load pattern
    """
    Path(output_dir).mkdir(exist_ok=True)

    fig, ax = plt.subplots(figsize=(10, 6))

    # Group tests by operation type (function)
    operation_groups = {
        "Single Write": ["sequential_write_tps"],  # Representative single write
        "Batch Write": ["batch_large_throughput"],  # Use large batch as representative
        "Read Operation": ["read_throughput"],
        "Mixed Workload": ["mixed_workload"],
    }

    # Define colors for each operation type
    colors = {
        "Single Write": "#1f77b4",  # Blue
        "Batch Write": "#ff7f0e",  # Orange
        "Read Operation": "#2ca02c",  # Green
        "Mixed Workload": "#d62728",  # Red
    }

    max_x = 0  # Track maximum x value for axis limits

    # Plot each operation type
    for operation_name, test_list in operation_groups.items():
        # Find the first test in the group that has data
        selected_data = None
        selected_test_name = None

        for test_name in test_list:
            if test_name not in report_data["results"]:
                continue

            data = report_data["results"][test_name]

            if (
                "probabilityDensity" in data
                and "contract" in data["probabilityDensity"]
            ):
                selected_data = data
                selected_test_name = test_name
                break

        if not selected_data:
            continue

        pdf_data = selected_data["probabilityDensity"]["contract"]
        bins = pdf_data["bins"]

        if not bins:
            continue

        # Extract bin centers and densities
        centers = np.array([(b["start"] + b["end"]) / 2 for b in bins])
        densities = np.array([b["density"] for b in bins])

        # Update max_x for axis limits
        max_x = max(max_x, centers[-1])

        # Create smooth curve using KDE for better smoothness
        try:
            # Reconstruct data points from bins
            data_points = []
            for bin_info in bins:
                center = (bin_info["start"] + bin_info["end"]) / 2
                count = bin_info["count"]
                data_points.extend([center] * count)

            if len(data_points) >= 2:
                data_points = np.array(data_points)
                kde = gaussian_kde(data_points, bw_method="scott")
                x_range = np.linspace(data_points.min(), data_points.max(), 300)
                density = kde(x_range)

                # Plot smooth curve
                ax.plot(
                    x_range,
                    density,
                    color=colors[operation_name],
                    linewidth=2.5,
                    label=operation_name,
                )
        except Exception as e:
            print(f"KDE failed for {operation_name}, using spline interpolation")
            # Fallback to spline
            if len(centers) >= 4:
                try:
                    sorted_indices = np.argsort(centers)
                    centers_sorted = centers[sorted_indices]
                    densities_sorted = densities[sorted_indices]

                    x_smooth = np.linspace(
                        centers_sorted.min(), centers_sorted.max(), 300
                    )
                    spl = make_interp_spline(centers_sorted, densities_sorted, k=3)
                    y_smooth = spl(x_smooth)
                    y_smooth = np.maximum(y_smooth, 0)

                    ax.plot(
                        x_smooth,
                        y_smooth,
                        color=colors[operation_name],
                        linewidth=2.5,
                        label=operation_name,
                    )
                except:
                    ax.plot(
                        centers,
                        densities,
                        color=colors[operation_name],
                        linewidth=2,
                        marker="o",
                        markersize=3,
                        label=operation_name,
                    )

    # Styling
    ax.set_xlabel("Transaction Time (Seconds)", fontsize=11)
    ax.set_ylabel("Probability Density", fontsize=11)
    ax.set_title(
        "Probability Densities of Write Function Transaction Speeds", fontsize=12
    )
    ax.legend(loc="upper right", frameon=True, fontsize=10)
    ax.grid(True, alpha=0.3, linestyle=":", linewidth=0.5)

    # Set axis limits
    if max_x > 0:
        ax.set_xlim(0, max_x * 1.1)
    ax.set_ylim(0, None)

    # Add subtle background
    ax.set_facecolor("#f8f9fa")

    plt.tight_layout()
    output_file = f"{output_dir}/probability_density_comparison.png"
    plt.savefig(output_file, dpi=300, bbox_inches="tight")
    print(f"✓ Saved: {output_file}")
    plt.close()


def main():
    """Generate all probability density visualizations"""
    print("\n📊 GENERATING PROBABILITY DENSITY VISUALIZATIONS\n")

    # Load data
    report_data = load_throughput_data()

    # Generate multi-line comparison plot by operation type
    print("\nGenerating probability density comparison by operation type...")
    plot_multiline_probability_density(report_data)

    # Generate plots for each test
    for test_name, data in report_data["results"].items():
        print(f"\nProcessing: {test_name}")
        plot_probability_density(test_name, data)
        plot_cumulative_distribution(test_name, data)

    # Generate comparison plots
    print("\nGenerating comparison visualizations...")
    plot_comparison_boxplot(report_data)

    # Generate LaTeX table
    print("\nGenerating LaTeX table...")
    generate_statistics_table(report_data)

    print("\n✅ All visualizations generated successfully!")
    print("📁 Output directory: visualizations/\n")
    print("📈 Key output: probability_density_comparison.png (by operation type)")


if __name__ == "__main__":
    main()
