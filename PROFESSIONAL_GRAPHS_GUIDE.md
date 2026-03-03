# Professional Graph Generation Guide for Academic Papers

A comprehensive guide to creating publication-ready scientific visualizations that meet journal standards.

---

## 📐 Technical Specifications for Academic Publishing

### Resolution & Format Requirements

**For Final Submission:**
```
✓ Format: PDF (vector graphics) - scales infinitely without pixelation
✓ Resolution: 300-600 DPI minimum
✓ File size: Under 10MB per figure (most journals)
✓ Color space: RGB for online, CMYK for print
```

**What We Generate:**
- ✅ PDF (vector) - Perfect for LaTeX and final papers
- ✅ PNG at 300 DPI - For PowerPoint and drafts

### Size Guidelines by Publication Type

```python
# Journal paper (2-column format)
figsize=(7, 5)      # Single column width: 3.5 inches
figsize=(14, 5)     # Double column width: 7 inches

# Conference paper (1-column format)
figsize=(10, 6)     # Standard size

# Thesis/Dissertation
figsize=(8, 6)      # Full page width

# Poster presentation
figsize=(12, 9)     # Larger for visibility
```

---

## 🎨 Academic Design Principles

### 1. **Color Selection** (Colorblind-Safe Palette)

Our scripts use professional academic colors:

```python
# Safe color combinations (works in grayscale too)
ACADEMIC_COLORS = {
    'blue':      '#3498db',  # Primary (data/positive)
    'green':     '#2ecc71',  # Success/optimal
    'red':       '#e74c3c',  # Warning/baseline
    'purple':    '#9b59b6',  # Secondary data
    'orange':    '#f39c12',  # Highlight/attention
    'teal':      '#1abc9c',  # Alternative
}

# Colorblind-friendly alternative
COLORBLIND_SAFE = [
    '#0173B2',  # Blue
    '#DE8F05',  # Orange  
    '#029E73',  # Green
    '#CC78BC',  # Purple
    '#CA9161',  # Brown
    '#949494',  # Gray
]
```

**Test in Grayscale:** Always print a B&W version to ensure distinguishability!

### 2. **Typography** (Journal Standards)

```python
# Font families accepted by journals
plt.rcParams['font.family'] = 'serif'        # Most academic
# Options: 'serif', 'sans-serif', 'monospace'

# Specific fonts (if available)
plt.rcParams['font.family'] = 'Times New Roman'  # Traditional
plt.rcParams['font.family'] = 'Arial'            # Modern/clean
plt.rcParams['font.family'] = 'Helvetica'        # Swiss style

# Font sizes (readable at publication scale)
plt.rcParams['font.size'] = 10          # Base text
plt.rcParams['axes.labelsize'] = 12     # Axis labels
plt.rcParams['axes.titlesize'] = 14     # Titles
plt.rcParams['xtick.labelsize'] = 10    # Tick labels
plt.rcParams['ytick.labelsize'] = 10
plt.rcParams['legend.fontsize'] = 10    # Legend
```

### 3. **Line Styles & Markers** (Distinguish without color)

```python
# Use different line styles for B&W printing
LINE_STYLES = [
    ('solid', '-'),      # Primary
    ('dashed', '--'),    # Secondary
    ('dashdot', '-.'),   # Tertiary
    ('dotted', ':'),     # Quaternary
]

# Markers for data points
MARKERS = ['o', 's', '^', 'v', 'D', 'p', '*', 'x']

# Example usage
ax.plot(x, y1, 'b-o', linewidth=2, markersize=6, label='Method A')
ax.plot(x, y2, 'r--s', linewidth=2, markersize=6, label='Method B')
```

---

## ✅ Journal-Specific Requirements

### IEEE, ACM, Springer

```python
# Minimum requirements
plt.rcParams['figure.dpi'] = 300
plt.rcParams['font.size'] = 8-10
# Width: 3.3 inches (single) or 7 inches (double column)
```

### Nature, Science, Cell

```python
# High standards
plt.rcParams['figure.dpi'] = 600
plt.rcParams['font.size'] = 7-8  # Smaller fonts
# All text must be editable (use vector PDF)
# Maximum 6 colors per figure
```

### Elsevier (Engineering Journals)

```python
plt.rcParams['figure.dpi'] = 300-500
# EPS or PDF format required
# RGB color mode
```

---

## 🔧 Customizing Your Research Graphs

### Quick Settings Override

Add this at the top of `generate-research-graphs.py`:

```python
# ===== PUBLICATION SETTINGS =====
# Adjust these for your specific journal

JOURNAL_SETTINGS = {
    'figure_width': 7,        # inches (3.5 for single column, 7 for double)
    'figure_height': 5,       # inches (maintain aspect ratio)
    'dpi': 300,              # 300 for most journals, 600 for Nature/Science
    'font_family': 'serif',   # 'serif', 'sans-serif'
    'font_size': 10,         # 8-12 typical range
    'line_width': 2,         # 1.5-2.5
    'marker_size': 6,        # 4-8
}

# Apply settings
plt.rcParams.update({
    'figure.figsize': (JOURNAL_SETTINGS['figure_width'], 
                       JOURNAL_SETTINGS['figure_height']),
    'figure.dpi': JOURNAL_SETTINGS['dpi'],
    'savefig.dpi': JOURNAL_SETTINGS['dpi'],
    'font.family': JOURNAL_SETTINGS['font_family'],
    'font.size': JOURNAL_SETTINGS['font_size'],
    'lines.linewidth': JOURNAL_SETTINGS['line_width'],
    'lines.markersize': JOURNAL_SETTINGS['marker_size'],
})
```

### Advanced: Custom Style Sheet

Create `academic_style.mplstyle`:

```python
# Save as: scripts/academic_style.mplstyle

# Figure properties
figure.figsize: 7, 5
figure.dpi: 300
savefig.dpi: 300
savefig.bbox: tight
savefig.pad_inches: 0.1

# Font properties  
font.family: serif
font.size: 10
axes.labelsize: 12
axes.titlesize: 14
xtick.labelsize: 10
ytick.labelsize: 10
legend.fontsize: 10

# Line properties
lines.linewidth: 2
lines.markersize: 6
lines.markeredgewidth: 0.5

# Grid
axes.grid: True
grid.alpha: 0.3
grid.linestyle: --

# Colors (Nature-inspired)
axes.prop_cycle: cycler('color', ['0173B2', 'DE8F05', '029E73', 'CC78BC', 'CA9161', '949494'])

# Spine/Border
axes.linewidth: 0.8
axes.edgecolor: black

# Remove top and right spines
axes.spines.top: False
axes.spines.right: False
```

Then use it:

```python
plt.style.use('scripts/academic_style.mplstyle')
```

---

## 🎯 Common Academic Graph Types

### 1. Line Charts (Performance Over Time)

```python
def create_professional_line_chart(x_data, y_data, labels, 
                                   title, xlabel, ylabel, filename):
    """Create publication-quality line chart"""
    fig, ax = plt.subplots(figsize=(7, 5))
    
    # Plot with distinct styles
    for i, (x, y, label) in enumerate(zip(x_data, y_data, labels)):
        ax.plot(x, y, 
                marker=MARKERS[i],
                linestyle=LINE_STYLES[i][1],
                linewidth=2.5,
                markersize=7,
                label=label,
                markeredgecolor='white',
                markeredgewidth=0.5)
    
    # Formatting
    ax.set_xlabel(xlabel, fontsize=12, fontweight='bold')
    ax.set_ylabel(ylabel, fontsize=12, fontweight='bold')
    ax.set_title(title, fontsize=14, fontweight='bold', pad=15)
    
    # Grid and legend
    ax.grid(True, linestyle='--', alpha=0.3, zorder=0)
    ax.legend(loc='best', frameon=True, shadow=True, fontsize=10)
    
    # Set background
    ax.set_facecolor('white')
    fig.patch.set_facecolor('white')
    
    # Tight layout
    plt.tight_layout()
    
    # Save in multiple formats
    plt.savefig(f'{filename}.pdf', format='pdf', bbox_inches='tight')
    plt.savefig(f'{filename}.png', format='png', bbox_inches='tight', dpi=300)
    plt.close()
```

### 2. Bar Charts (Comparisons)

```python
def create_professional_bar_chart(categories, values, colors,
                                  title, xlabel, ylabel, filename):
    """Create publication-quality bar chart"""
    fig, ax = plt.subplots(figsize=(8, 6))
    
    # Create bars
    bars = ax.bar(categories, values, 
                   color=colors,
                   edgecolor='black',
                   linewidth=1.5,
                   width=0.6,
                   zorder=3)
    
    # Add value labels on top
    for bar in bars:
        height = bar.get_height()
        ax.text(bar.get_x() + bar.get_width()/2., height,
                f'{height:.2f}',
                ha='center', va='bottom',
                fontsize=10, fontweight='bold')
    
    # Formatting
    ax.set_xlabel(xlabel, fontsize=12, fontweight='bold')
    ax.set_ylabel(ylabel, fontsize=12, fontweight='bold')
    ax.set_title(title, fontsize=14, fontweight='bold', pad=15)
    
    # Grid behind bars
    ax.yaxis.grid(True, linestyle='--', alpha=0.3, zorder=0)
    ax.set_axisbelow(True)
    
    # Remove top and right spines
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    
    plt.tight_layout()
    plt.savefig(f'{filename}.pdf', format='pdf', bbox_inches='tight')
    plt.savefig(f'{filename}.png', format='png', bbox_inches='tight', dpi=300)
    plt.close()
```

### 3. Heatmaps (Correlation/Coverage)

```python
def create_professional_heatmap(data, row_labels, col_labels,
                                title, filename, cmap='RdYlGn'):
    """Create publication-quality heatmap"""
    fig, ax = plt.subplots(figsize=(8, 6))
    
    # Create heatmap
    im = ax.imshow(data, cmap=cmap, aspect='auto', 
                   vmin=data.min(), vmax=data.max())
    
    # Set ticks
    ax.set_xticks(np.arange(len(col_labels)))
    ax.set_yticks(np.arange(len(row_labels)))
    ax.set_xticklabels(col_labels)
    ax.set_yticklabels(row_labels)
    
    # Rotate x labels if needed
    plt.setp(ax.get_xticklabels(), rotation=45, ha="right",
             rotation_mode="anchor")
    
    # Add values in cells
    for i in range(len(row_labels)):
        for j in range(len(col_labels)):
            text = ax.text(j, i, f'{data[i, j]:.1f}',
                          ha="center", va="center",
                          color="black" if data[i, j] > (data.max()/2) else "white",
                          fontsize=10, fontweight='bold')
    
    # Colorbar
    cbar = plt.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    cbar.ax.set_ylabel('Value', rotation=270, labelpad=20, 
                       fontsize=11, fontweight='bold')
    
    ax.set_title(title, fontsize=14, fontweight='bold', pad=15)
    
    plt.tight_layout()
    plt.savefig(f'{filename}.pdf', format='pdf', bbox_inches='tight')
    plt.savefig(f'{filename}.png', format='png', bbox_inches='tight', dpi=300)
    plt.close()
```

---

## 🚀 Running Your Professional Graphs

### Method 1: Use Existing Scripts (Already Configured!)

Your scripts are already set up with professional settings:

```bash
# Generate all research graphs
npm run visualize:research

# They already use:
# - 300 DPI resolution
# - PDF vector format
# - Professional fonts (serif)
# - Academic color scheme
# - Proper sizing
```

### Method 2: Customize Settings

Edit `scripts/generate-research-graphs.py`:

```python
# Find line 13-18 and adjust:
plt.rcParams["figure.dpi"] = 600        # Higher for Nature/Science
plt.rcParams["font.size"] = 8           # Smaller for compact papers
plt.rcParams["font.family"] = "Arial"   # Change font

# For each graph, adjust figsize:
fig, ax = plt.subplots(figsize=(7, 5))  # Match your journal's column width
```

### Method 3: Create Journal-Specific Versions

```bash
# Create copies for different journals
cp scripts/generate-research-graphs.py scripts/generate-graphs-ieee.py
cp scripts/generate-research-graphs.py scripts/generate-graphs-nature.py

# Customize each with journal-specific settings
```

---

## ✅ Quality Checklist Before Submission

### Visual Quality
- [ ] All text is readable at 100% zoom
- [ ] Fonts are consistent across all figures
- [ ] Colors are distinguishable in grayscale
- [ ] Line styles differ (not just colors)
- [ ] No pixelation when zoomed
- [ ] White background (no transparency)

### Content Quality
- [ ] All axes have labels with units
- [ ] Legend is clear and complete
- [ ] Title is descriptive
- [ ] Data points are visible
- [ ] Error bars included (if applicable)
- [ ] Sample size noted (if statistical)

### Technical Quality
- [ ] PDF format (vector graphics)
- [ ] Resolution ≥ 300 DPI
- [ ] File size < 10MB
- [ ] Correct dimensions for journal
- [ ] Color space: RGB (or CMYK for print)
- [ ] Fonts embedded in PDF

### Integration
- [ ] Figure number matches text reference
- [ ] Caption is informative and standalone
- [ ] Mentioned before appearing in text
- [ ] Properly cited if adapted from other work

---

## 🛠️ Advanced Techniques

### 1. Subplots (Multiple Panels)

```python
fig, axes = plt.subplots(2, 2, figsize=(14, 10))
fig.suptitle('Comprehensive Analysis', fontsize=16, fontweight='bold')

# Plot in each panel
axes[0, 0].plot(x, y1)
axes[0, 0].set_title('(a) Cost Analysis')

axes[0, 1].plot(x, y2)  
axes[0, 1].set_title('(b) Performance')

axes[1, 0].bar(categories, values)
axes[1, 0].set_title('(c) Comparison')

axes[1, 1].imshow(heatmap_data)
axes[1, 1].set_title('(d) Coverage')

plt.tight_layout()
```

### 2. Inset Plots (Zoom Detail)

```python
# Main plot
fig, ax = plt.subplots(figsize=(8, 6))
ax.plot(x, y, 'b-')

# Create inset
from mpl_toolkits.axes_grid1.inset_locator import inset_axes
axins = inset_axes(ax, width="40%", height="40%", loc='upper right')
axins.plot(x[20:30], y[20:30], 'r-')
axins.set_title('Zoomed Region', fontsize=8)
```

### 3. Error Bars (Statistical Rigor)

```python
# With confidence intervals
ax.errorbar(x, y_mean, yerr=y_std, 
            fmt='o-', capsize=5, capthick=2,
            label='Mean ± σ')

# With percentile ranges  
ax.fill_between(x, y_lower, y_upper, alpha=0.2, label='95% CI')
ax.plot(x, y_median, 'b-', linewidth=2, label='Median')
```

### 4. Twin Axes (Two Y-Scales)

```python
fig, ax1 = plt.subplots(figsize=(8, 6))

# First y-axis
ax1.plot(x, y1, 'b-')
ax1.set_ylabel('Gas Cost', color='b')
ax1.tick_params(axis='y', labelcolor='b')

# Second y-axis
ax2 = ax1.twinx()
ax2.plot(x, y2, 'r-')
ax2.set_ylabel('Latency (ms)', color='r')
ax2.tick_params(axis='y', labelcolor='r')
```

---

## 📊 Format Conversion Tools

### Convert PNG to High-Quality PDF

```python
from PIL import Image

def png_to_pdf(png_file, pdf_file):
    """Convert PNG to PDF preserving quality"""
    image = Image.open(png_file)
    image.save(pdf_file, 'PDF', resolution=300.0, quality=95)
```

### Compress PDF (if too large)

```bash
# Using Ghostscript
gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.4 -dPDFSETTINGS=/prepress \
   -dNOPAUSE -dQUIET -dBATCH -sOutputFile=output.pdf input.pdf
```

### Batch Export

```python
# Export all formats at once
def save_figure(fig, filename):
    """Save figure in multiple formats"""
    fig.savefig(f'{filename}.pdf', format='pdf', bbox_inches='tight')
    fig.savefig(f'{filename}.png', format='png', dpi=300, bbox_inches='tight')
    fig.savefig(f'{filename}.svg', format='svg', bbox_inches='tight')
    fig.savefig(f'{filename}.eps', format='eps', bbox_inches='tight')
```

---

## 🎓 Example: Perfect Academic Figure

```python
def create_perfect_academic_figure():
    """Template for a perfect academic figure"""
    
    # Data
    x = np.linspace(0, 100, 50)
    y1 = 95000 * x  # Naive
    y2 = 95000 + 500 * np.log2(x + 1)  # Merkle
    
    # Create figure
    fig, ax = plt.subplots(figsize=(7, 5))
    fig.patch.set_facecolor('white')
    
    # Plot with clear differentiation
    ax.plot(x, y1/1e6, 'ro-', linewidth=2.5, markersize=6, 
            markevery=5, label='Naive Approach (Linear)',
            markeredgecolor='white', markeredgewidth=0.5)
    ax.plot(x, y2/1e6, 'g^--', linewidth=2.5, markersize=6,
            markevery=5, label='Merkle Approach (Logarithmic)',
            markeredgecolor='white', markeredgewidth=0.5)
    
    # Labels with units
    ax.set_xlabel('Number of Machines', fontsize=12, fontweight='bold')
    ax.set_ylabel('Total Gas Cost (Million Gas Units)', 
                  fontsize=12, fontweight='bold')
    ax.set_title('Economic Scalability Analysis', 
                 fontsize=14, fontweight='bold', pad=15)
    
    # Grid
    ax.grid(True, linestyle='--', alpha=0.3, zorder=0)
    ax.set_axisbelow(True)
    
    # Legend
    ax.legend(loc='upper left', frameon=True, shadow=True, 
              fontsize=10, framealpha=0.95)
    
    # Annotation
    savings = ((y1[-1] - y2[-1]) / y1[-1] * 100)
    ax.annotate(f'{savings:.1f}% savings',
                xy=(x[-1], y2[-1]/1e6), xytext=(x[-10], y1[-10]/1e6),
                arrowprops=dict(arrowstyle='->', lw=2, color='black'),
                fontsize=11, fontweight='bold',
                bbox=dict(boxstyle='round', facecolor='yellow', alpha=0.7))
    
    # Remove top and right spines
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    
    # Format tick labels
    ax.ticklabel_format(style='plain', axis='y')
    
    # Tight layout
    plt.tight_layout()
    
    # Save
    plt.savefig('visualizations/perfect_example.pdf', bbox_inches='tight')
    plt.savefig('visualizations/perfect_example.png', bbox_inches='tight', dpi=300)
    plt.close()
    
    print("✅ Perfect academic figure created!")

# Run it
create_perfect_academic_figure()
```

---

## 🔍 Common Mistakes to Avoid

### ❌ Don't Do This:
- Use default matplotlib colors (too bright)
- Rely only on color to distinguish lines
- Use tiny fonts (<8pt)
- Include excessive grid lines
- Use PNG for final submission
- Add 3D effects (unprofessional)
- Use pie charts (hard to compare)
- Include chart junk (unnecessary decorations)

### ✅ Do This Instead:
- Use professional color palettes
- Combine color + line style + markers
- Use readable fonts (10-12pt)
- Light grid lines for reference only
- Use PDF/EPS for vectors
- Stick to 2D (clearer)
- Use bar/line charts for comparisons
- Keep it minimal and clean

---

## 📚 Additional Resources

### Python Libraries
```bash
pip install matplotlib seaborn plotly scipy pandas
```

### Style Sheets
- **Seaborn styles**: `seaborn-paper`, `seaborn-talk`, `seaborn-poster`
- **Matplotlib styles**: `bmh`, `ggplot`, `seaborn-v0_8-paper`

### Useful Tools
- **Inkscape**: Edit PDF/SVG figures manually
- **Adobe Illustrator**: Professional figure editing
- **BioRender**: Scientific diagrams (biology)
- **draw.io**: Flowcharts and diagrams
- **TikZ (LaTeX)**: Programmatic figure generation

---

## 🎯 Quick Start for Your Project

Your graphs are **already professional**! They use:

✅ 300 DPI resolution  
✅ PDF vector format  
✅ Serif fonts (academic standard)  
✅ Professional color scheme  
✅ Proper sizing and layout  

**To make them even better:**

1. **Check your journal's requirements** (IEEE, Nature, etc.)
2. **Adjust figure sizes** if needed in the script
3. **Test grayscale printing** to ensure clarity
4. **Add error bars** if you have statistical data
5. **Ensure consistent style** across all figures

---

**Your graphs are publication-ready as-is! Just customize sizes/fonts for your specific journal.** 🎓📊
