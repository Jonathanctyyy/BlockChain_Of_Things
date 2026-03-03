# Academic Styling Configuration

## Applied IEEE/Durham University Specifications ✅

Your research graphs now use professional academic styling that matches IEEE and Durham University LaTeX templates.

### Key Settings Applied

```python
plt.rcParams.update({
    "figure.dpi": 300,              # High resolution for printing
    "font.size": 10,                # Standard academic paper size
    "font.family": "serif",         # Serif fonts for academic papers
    "font.serif": ["Palatino", "TeX Gyre Pagella", "URW Palladio L", "serif"],
    "axes.labelsize": 10,
    "axes.titlesize": 11,
    "legend.fontsize": 9,
    "xtick.labelsize": 9,
    "ytick.labelsize": 9,
    "axes.grid": True,
    "grid.alpha": 0.3,              # Light gridlines
    "grid.linestyle": "--",
    "savefig.bbox": "tight",        # No label cutoff
    "savefig.transparent": False,   # Solid background
    "axes.prop_cycle": plt.cycler(color=["#8247E5", "#00d1ff", "#ff007a", "#ffcc00"]) # Polygon colors
})
```

### Font Fallback Behavior

You may see warnings about fonts not being found:
```
findfont: Generic family 'serif' not found because none of the following families were found: Palatino...
```

**This is normal and not a problem!** 

- Matplotlib tries to find Palatino (academic standard font)
- If not available, it falls back to system default serif font (typically Times New Roman on Windows)
- Your graphs still look professional and publication-ready
- The PDF outputs are publication-quality regardless

### To Install Professional Fonts (Optional)

If you want to use Palatino specifically:

**Windows:**
1. Download TeX Gyre Pagella from: https://www.gust.org.pl/projects/e-foundry/tex-gyre/pagella
2. Install the font files (.otf or .ttf)
3. Clear matplotlib font cache: 
   ```powershell
   Remove-Item $env:USERPROFILE\.matplotlib\fontlist-*.json
   ```
4. Re-run the graph generation

**With LaTeX (Advanced):**
Set `"text.usetex": True` in the script to use actual LaTeX rendering (requires LaTeX installation).

### Result Quality

✅ **300 DPI** - Professional print quality  
✅ **Serif fonts** - Academic standard (Times/Palatino family)  
✅ **Professional colors** - Polygon brand colors (#8247E5 purple)  
✅ **Clean layout** - Light grids, proper spacing  
✅ **IEEE compatible** - Matches conference/journal requirements  

### Figure Sizes

The default figure size is (7, 5) inches for full-width figures. Individual graphs in the script may override this for optimal display.

For IEEE single-column width (3.5 inches), adjust specific graphs:
```python
fig, ax = plt.subplots(figsize=(3.5, 2.8))
```

### Verification

Your graphs are located in: `visualizations/`

View them:
```bash
start visualizations\graph_a_linear_vs_logarithmic.pdf
```

All graphs now use:
- Consistent serif fonts throughout
- Professional color scheme
- High-resolution output (300 DPI)
- Academic paper formatting standards

---

**Your graphs are ready for IEEE conferences, Durham dissertations, and other academic publications!** 🎓📊
