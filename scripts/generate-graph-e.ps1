# Generate Slither Inheritance Graph (Graph E)
# This PowerShell script automates the generation of contract architecture visualization

Write-Host "🔵 Generating Contract Inheritance Graph (Graph E)..." -ForegroundColor Cyan

# Check if Slither is installed
try {
    slither --version | Out-Null
    Write-Host "✅ Slither found" -ForegroundColor Green
} catch {
    Write-Host "❌ Slither not found. Installing..." -ForegroundColor Red
    pip install slither-analyzer
}

# Generate inheritance graph
Write-Host "`n📊 Generating inheritance graph DOT file..." -ForegroundColor Yellow
slither contracts/PredictiveMaintenance.sol --print inheritance-graph

# Check if DOT file was created
$dotFile = "contracts\PredictiveMaintenance.sol.inheritance-graph.dot"
if (Test-Path $dotFile) {
    Write-Host "✅ DOT file created: $dotFile" -ForegroundColor Green
    
    # Try to convert to PNG using Graphviz
    try {
        dot -V | Out-Null
        Write-Host "`n🎨 Converting to PNG..." -ForegroundColor Yellow
        dot -Tpng $dotFile -o "visualizations\graph_e_inheritance.png"
        dot -Tpdf $dotFile -o "visualizations\graph_e_inheritance.pdf"
        Write-Host "✅ Generated: visualizations\graph_e_inheritance.png" -ForegroundColor Green
        Write-Host "✅ Generated: visualizations\graph_e_inheritance.pdf" -ForegroundColor Green
    } catch {
        Write-Host "`n⚠️  Graphviz not installed. Cannot convert DOT to image." -ForegroundColor Yellow
        Write-Host "   Install Graphviz: choco install graphviz" -ForegroundColor Cyan
        Write-Host "   Or use online converter: https://dreampuf.github.io/GraphvizOnline/" -ForegroundColor Cyan
        Write-Host "`n   Manual conversion command:" -ForegroundColor Yellow
        Write-Host "   dot -Tpng $dotFile -o visualizations\graph_e_inheritance.png" -ForegroundColor White
    }
} else {
    Write-Host "❌ Failed to generate DOT file" -ForegroundColor Red
}

Write-Host "`n✨ Graph E generation complete!" -ForegroundColor Green
