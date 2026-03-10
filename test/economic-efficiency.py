import matplotlib.pyplot as plt
import numpy as np

# Set academic paper style
plt.rcParams["font.family"] = "sans-serif"
plt.rcParams["font.sans-serif"] = ["Arial", "DejaVu Sans", "Helvetica"]
plt.rcParams["font.size"] = 11
plt.rcParams["axes.linewidth"] = 1.2

# Data from gas-report.json
batch_sizes = [10, 50, 100]
actual_gas = [117247, 199288, 301981]
gas_per_reading = [11725, 3986, 3020]

# Linear model (O(n))
linear_model = [11725 * n for n in batch_sizes]

# Create figure with specific size for paper (suitable for two-column format)
fig, ax1 = plt.subplots(figsize=(8, 5.5))

# Professional color scheme
color_actual = "#1f77b4"  # Professional blue
color_linear = "#d62728"  # Professional red
color_marginal = "#2ca02c"  # Professional green

# Left Y-axis: Total Gas Cost
ax1.set_xlabel("Batch Size (Number of Readings)", fontsize=12)
ax1.set_ylabel("Total Gas Cost (gas units)", fontsize=12, color="black")

# Plot actual cost with markers
line1 = ax1.plot(
    batch_sizes,
    actual_gas,
    color=color_actual,
    marker="o",
    linewidth=2.5,
    markersize=9,
    label="Actual Cost (Sub-linear)",
    zorder=3,
)

# Plot linear model
line2 = ax1.plot(
    batch_sizes,
    linear_model,
    color=color_linear,
    linestyle="--",
    linewidth=2.5,
    label="Linear Model O(n)",
    zorder=2,
)

# Style left axis
ax1.tick_params(axis="y", labelcolor="black", labelsize=10)
ax1.tick_params(axis="x", labelsize=10)
ax1.grid(True, alpha=0.3, linestyle=":", linewidth=0.8)
ax1.set_xlim(5, 105)
ax1.set_ylim(0, 1250000)

# Format y-axis with scientific notation
ax1.ticklabel_format(style="sci", axis="y", scilimits=(5, 5))

# Right Y-axis: Marginal Cost per Reading
ax2 = ax1.twinx()
ax2.set_ylabel("Gas per Reading (Marginal Cost)", fontsize=12, color="black")

line3 = ax2.plot(
    batch_sizes,
    gas_per_reading,
    color=color_marginal,
    marker="s",
    linewidth=2.5,
    markersize=9,
    linestyle="-",
    label="Marginal Cost per Reading",
    zorder=4,
)

ax2.tick_params(axis="y", labelcolor="black", labelsize=10)
ax2.set_ylim(0, 13000)

# Add value labels on data points (cleaner than annotations)
# Only label the endpoints to show the improvement
for i, (x, y) in enumerate(zip(batch_sizes, gas_per_reading)):
    if i == 0:  # First point
        ax2.text(
            x,
            y + 800,
            f"{y:,}",
            ha="center",
            va="bottom",
            fontsize=9,
            color=color_marginal,
            fontweight="bold",
        )
    elif i == len(batch_sizes) - 1:  # Last point
        efficiency_gain = ((gas_per_reading[0] - y) / gas_per_reading[0]) * 100
        ax2.text(
            x - 8,
            y - 600,
            f"{y:,}\n({efficiency_gain:.0f}% reduction)",
            ha="center",
            va="top",
            fontsize=8.5,
            color=color_marginal,
            fontweight="bold",
        )

# Add value label for actual cost at 100 batch size (moved to avoid overlap)
ax1.text(
    100,
    actual_gas[2] + 50000,
    f"{actual_gas[2]:,}",
    ha="center",
    va="bottom",
    fontsize=9,
    color=color_actual,
    fontweight="bold",
)

# Add value label for linear model at 100 batch size (moved to avoid overlap)
ax1.text(
    95,
    linear_model[2] + 50000,
    f"{linear_model[2]:,}",
    ha="right",
    va="bottom",
    fontsize=9,
    color=color_linear,
    fontweight="bold",
)

# Title (optional - often omitted in academic papers as caption does this)
# plt.title("Economic Efficiency: Batch Processing Gas Cost Analysis",
#           fontsize=13, pad=15)

# Combine legends from both axes - place in optimal position
lns = line1 + line2 + line3
labs = [l.get_label() for l in lns]
ax1.legend(
    lns,
    labs,
    loc="upper left",
    fontsize=9.5,
    framealpha=0.95,
    edgecolor="black",
    fancybox=False,
    shadow=False,
)

# Tight layout with padding
plt.tight_layout(pad=0.5)

# Save with high DPI for publication
plt.savefig(
    "visualizations/economic-efficiency-dual-axis.png",
    dpi=300,
    bbox_inches="tight",
    facecolor="white",
    edgecolor="none",
)

# Also save as PDF for better quality in LaTeX
plt.savefig(
    "visualizations/economic-efficiency-dual-axis.pdf",
    bbox_inches="tight",
    facecolor="white",
    edgecolor="none",
)

print("[SUCCESS] Chart saved as PNG and PDF in visualizations/")
print("   - PNG: For preview and PowerPoint")
print("   - PDF: For LaTeX/academic paper (vector graphics)")

plt.show()
