#!/usr/bin/env python3
"""
Generate Latency Breakdown Table
Produces tables in multiple formats (Console, Markdown, LaTeX, CSV)
showing component-level latency with percentages
"""

import json
import sys
from pathlib import Path


def load_latency_data():
    """Load insurance claim detailed latency data"""
    try:
        with open("latency-report.json", "r") as f:
            data = json.load(f)

        # Find insurance_claim_detailed test
        for result in data["results"]:
            if result.get("test") == "insurance_claim_detailed":
                return result

        print("❌ Error: insurance_claim_detailed not found in latency-report.json")
        print("   Please run: npm run test:latency")
        sys.exit(1)

    except FileNotFoundError:
        print("❌ Error: latency-report.json not found")
        print("   Please run: npm run test:latency")
        sys.exit(1)


def format_time(ms):
    """Format milliseconds with appropriate precision"""
    if ms < 1:
        return f"{ms:.4f}ms"
    elif ms < 10:
        return f"{ms:.2f}ms"
    else:
        return f"{ms:.2f}ms"


def generate_console_table(data):
    """Generate ASCII table for console output"""
    print("\n" + "=" * 90)
    print("INSURANCE CLAIM E2E LATENCY BREAKDOWN")
    print("=" * 90)
    print()

    components = data["components"]
    percentages = data["percentages"]
    total = data["totalLatency"]

    # Component data
    rows = [
        (
            "Off-chain Processing",
            components["offchain"]["total"],
            percentages["offchain"],
        ),
        (
            "  ├─ Data Retrieval",
            components["offchain"]["breakdown"]["dataRetrieval"],
            "",
        ),
        ("  └─ Account Setup", components["offchain"]["breakdown"]["accountSetup"], ""),
        ("", 0, ""),  # Spacer
        (
            "Cryptographic Proof",
            components["cryptographicProof"]["total"],
            percentages["cryptographicProof"],
        ),
        (
            "  ├─ Merkle Tree Generation",
            components["cryptographicProof"]["breakdown"]["merkleTreeGeneration"],
            "",
        ),
        (
            "  ├─ Proof Extraction",
            components["cryptographicProof"]["breakdown"]["proofExtraction"],
            "",
        ),
        (
            "  └─ Digital Signature",
            components["cryptographicProof"]["breakdown"]["digitalSignature"],
            "",
        ),
        ("", 0, ""),  # Spacer
        ("IPFS Upload", components["ipfsUpload"]["total"], percentages["ipfsUpload"]),
        (
            "  ├─ Metadata Preparation",
            components["ipfsUpload"]["breakdown"]["metadataPreparation"],
            "",
        ),
        (
            "  └─ Network Upload",
            components["ipfsUpload"]["breakdown"]["networkUpload"],
            "",
        ),
        ("", 0, ""),  # Spacer
        (
            "Blockchain Commitment",
            components["blockchainCommitment"]["total"],
            percentages["blockchainCommitment"],
        ),
        (
            "  ├─ Transaction Prep",
            components["blockchainCommitment"]["breakdown"]["transactionPreparation"],
            "",
        ),
        (
            "  ├─ Transaction Submit",
            components["blockchainCommitment"]["breakdown"]["transactionSubmit"],
            "",
        ),
        (
            "  ├─ Network Propagation",
            components["blockchainCommitment"]["breakdown"]["networkPropagation"],
            "",
        ),
        (
            "  └─ Block Confirmation",
            components["blockchainCommitment"]["breakdown"]["blockConfirmation"],
            "",
        ),
    ]

    # Print header
    print(f"{'Component':<45} {'Latency':>15} {'% of Total':>15}")
    print("-" * 90)

    # Print rows
    for name, latency, percentage in rows:
        if name == "":  # Spacer
            continue
        if latency > 0:
            print(f"{name:<45} {format_time(latency):>15} {percentage:>15}")
        else:
            print(f"{name:<45} {' ':>15} {' ':>15}")

    # Print total
    print("-" * 90)
    print(f"{'TOTAL END-TO-END TIME':<45} {format_time(total):>15} {'100.00%':>15}")
    print("=" * 90)
    print()

    # Additional info
    print(f"Block Number: #{components['blockchainCommitment']['blockNumber']}")
    print(f"Gas Used: {components['blockchainCommitment']['gasUsed']:,} gas")
    print(f"Transaction: {components['blockchainCommitment']['transactionHash']}")
    print()


def generate_markdown_table(data):
    """Generate Markdown table"""
    components = data["components"]
    percentages = data["percentages"]
    total = data["totalLatency"]

    md = []
    md.append("\n## Insurance Claim E2E Latency Breakdown\n")
    md.append("| Stage | Component | Latency (ms) | % of Total |")
    md.append("|-------|-----------|-------------:|-----------:|")

    # Off-chain
    md.append(
        f"| **Off-chain** | **Total** | **{components['offchain']['total']:.2f}** | **{percentages['offchain']}** |"
    )
    md.append(
        f"| | Data Retrieval | {components['offchain']['breakdown']['dataRetrieval']:.4f} | - |"
    )
    md.append(
        f"| | Account Setup | {components['offchain']['breakdown']['accountSetup']:.2f} | - |"
    )

    # Crypto
    md.append(
        f"| **Cryptographic Proof** | **Total** | **{components['cryptographicProof']['total']:.2f}** | **{percentages['cryptographicProof']}** |"
    )
    md.append(
        f"| | Merkle Tree Generation | {components['cryptographicProof']['breakdown']['merkleTreeGeneration']:.2f} | - |"
    )
    md.append(
        f"| | Proof Extraction | {components['cryptographicProof']['breakdown']['proofExtraction']:.2f} | - |"
    )
    md.append(
        f"| | Digital Signature | {components['cryptographicProof']['breakdown']['digitalSignature']:.2f} | - |"
    )

    # IPFS
    md.append(
        f"| **IPFS Upload** | **Total** | **{components['ipfsUpload']['total']:.2f}** | **{percentages['ipfsUpload']}** |"
    )
    md.append(
        f"| | Metadata Preparation | {components['ipfsUpload']['breakdown']['metadataPreparation']:.4f} | - |"
    )
    md.append(
        f"| | Network Upload | {components['ipfsUpload']['breakdown']['networkUpload']:.2f} | - |"
    )

    # Blockchain
    md.append(
        f"| **Blockchain** | **Total** | **{components['blockchainCommitment']['total']:.2f}** | **{percentages['blockchainCommitment']}** |"
    )
    md.append(
        f"| | Transaction Prep | {components['blockchainCommitment']['breakdown']['transactionPreparation']:.4f} | - |"
    )
    md.append(
        f"| | Transaction Submit | {components['blockchainCommitment']['breakdown']['transactionSubmit']:.2f} | - |"
    )
    md.append(
        f"| | Network Propagation | {components['blockchainCommitment']['breakdown']['networkPropagation']:.4f} | - |"
    )
    md.append(
        f"| | Block Confirmation | {components['blockchainCommitment']['breakdown']['blockConfirmation']:.2f} | - |"
    )

    # Total
    md.append(f"| **TOTAL E2E** | | **{total:.2f}** | **100.00%** |")

    md.append(f"\n**Performance Details:**")
    md.append(f"- Block Number: #{components['blockchainCommitment']['blockNumber']}")
    md.append(f"- Gas Used: {components['blockchainCommitment']['gasUsed']:,} gas")
    md.append(f"- Machine ID: {data['machineID']}")
    md.append(f"- Timestamp: {data['timestamp']}")

    return "\n".join(md)


def generate_latex_table(data):
    """Generate LaTeX table for academic papers"""
    components = data["components"]
    percentages = data["percentages"]
    total = data["totalLatency"]

    # Convert percentages to numbers
    def percent_to_float(p):
        return float(p.replace("%", ""))

    latex = []
    latex.append("\n% Insurance Claim E2E Latency Breakdown")
    latex.append("\\begin{table}[htbp]")
    latex.append("\\centering")
    latex.append("\\caption{Insurance Claim End-to-End Latency Component Breakdown}")
    latex.append("\\label{tab:latency-breakdown}")
    latex.append("\\begin{tabular}{llrr}")
    latex.append("\\toprule")
    latex.append(
        "\\textbf{Stage} & \\textbf{Component} & \\textbf{Latency (ms)} & \\textbf{\\% of Total} \\\\"
    )
    latex.append("\\midrule")

    # Off-chain
    latex.append(
        f"\\multirow{{3}}{{*}}{{Off-chain}} & \\textbf{{Total}} & \\textbf{{{components['offchain']['total']:.2f}}} & \\textbf{{{percent_to_float(percentages['offchain']):.2f}\\%}} \\\\"
    )
    latex.append(
        f" & \\quad Data Retrieval & {components['offchain']['breakdown']['dataRetrieval']:.4f} & -- \\\\"
    )
    latex.append(
        f" & \\quad Account Setup & {components['offchain']['breakdown']['accountSetup']:.2f} & -- \\\\"
    )
    latex.append("\\midrule")

    # Crypto
    latex.append(
        f"\\multirow{{4}}{{*}}{{Cryptographic Proof}} & \\textbf{{Total}} & \\textbf{{{components['cryptographicProof']['total']:.2f}}} & \\textbf{{{percent_to_float(percentages['cryptographicProof']):.2f}\\%}} \\\\"
    )
    latex.append(
        f" & \\quad Merkle Tree & {components['cryptographicProof']['breakdown']['merkleTreeGeneration']:.2f} & -- \\\\"
    )
    latex.append(
        f" & \\quad Proof Extraction & {components['cryptographicProof']['breakdown']['proofExtraction']:.2f} & -- \\\\"
    )
    latex.append(
        f" & \\quad Digital Signature & {components['cryptographicProof']['breakdown']['digitalSignature']:.2f} & -- \\\\"
    )
    latex.append("\\midrule")

    # IPFS
    latex.append(
        f"\\multirow{{3}}{{*}}{{IPFS Storage}} & \\textbf{{Total}} & \\textbf{{{components['ipfsUpload']['total']:.2f}}} & \\textbf{{{percent_to_float(percentages['ipfsUpload']):.2f}\\%}} \\\\"
    )
    latex.append(
        f" & \\quad Metadata Prep & {components['ipfsUpload']['breakdown']['metadataPreparation']:.4f} & -- \\\\"
    )
    latex.append(
        f" & \\quad Network Upload & {components['ipfsUpload']['breakdown']['networkUpload']:.2f} & -- \\\\"
    )
    latex.append("\\midrule")

    # Blockchain
    latex.append(
        f"\\multirow{{5}}{{*}}{{Blockchain}} & \\textbf{{Total}} & \\textbf{{{components['blockchainCommitment']['total']:.2f}}} & \\textbf{{{percent_to_float(percentages['blockchainCommitment']):.2f}\\%}} \\\\"
    )
    latex.append(
        f" & \\quad Transaction Prep & {components['blockchainCommitment']['breakdown']['transactionPreparation']:.4f} & -- \\\\"
    )
    latex.append(
        f" & \\quad Transaction Submit & {components['blockchainCommitment']['breakdown']['transactionSubmit']:.2f} & -- \\\\"
    )
    latex.append(
        f" & \\quad Network Propagation & {components['blockchainCommitment']['breakdown']['networkPropagation']:.4f} & -- \\\\"
    )
    latex.append(
        f" & \\quad Block Confirmation & {components['blockchainCommitment']['breakdown']['blockConfirmation']:.2f} & -- \\\\"
    )
    latex.append("\\midrule")

    # Total
    latex.append(
        f"\\multicolumn{{2}}{{l}}{{\\textbf{{Total End-to-End Time}}}} & \\textbf{{{total:.2f}}} & \\textbf{{100.00\\%}} \\\\"
    )
    latex.append("\\bottomrule")
    latex.append("\\end{tabular}")
    latex.append(f"\\par\\vspace{{0.5em}}\\footnotesize")
    latex.append(f"Gas used: {components['blockchainCommitment']['gasUsed']:,} gas; ")
    latex.append(f"Block \\#{components['blockchainCommitment']['blockNumber']}; ")
    latex.append(f"Measured on Hardhat local testnet.")
    latex.append("\\end{table}")
    latex.append(
        "\n% Required packages: \\usepackage{booktabs}, \\usepackage{multirow}"
    )

    return "\n".join(latex)


def generate_csv_table(data):
    """Generate CSV for spreadsheet applications"""
    components = data["components"]
    percentages = data["percentages"]
    total = data["totalLatency"]

    csv = []
    csv.append("Stage,Component,Latency_ms,Percentage")

    # Off-chain
    csv.append(
        f"Off-chain,Total,{components['offchain']['total']:.4f},{percentages['offchain']}"
    )
    csv.append(
        f"Off-chain,Data Retrieval,{components['offchain']['breakdown']['dataRetrieval']:.4f},"
    )
    csv.append(
        f"Off-chain,Account Setup,{components['offchain']['breakdown']['accountSetup']:.4f},"
    )

    # Crypto
    csv.append(
        f"Cryptographic Proof,Total,{components['cryptographicProof']['total']:.4f},{percentages['cryptographicProof']}"
    )
    csv.append(
        f"Cryptographic Proof,Merkle Tree Generation,{components['cryptographicProof']['breakdown']['merkleTreeGeneration']:.4f},"
    )
    csv.append(
        f"Cryptographic Proof,Proof Extraction,{components['cryptographicProof']['breakdown']['proofExtraction']:.4f},"
    )
    csv.append(
        f"Cryptographic Proof,Digital Signature,{components['cryptographicProof']['breakdown']['digitalSignature']:.4f},"
    )

    # IPFS
    csv.append(
        f"IPFS Upload,Total,{components['ipfsUpload']['total']:.4f},{percentages['ipfsUpload']}"
    )
    csv.append(
        f"IPFS Upload,Metadata Preparation,{components['ipfsUpload']['breakdown']['metadataPreparation']:.4f},"
    )
    csv.append(
        f"IPFS Upload,Network Upload,{components['ipfsUpload']['breakdown']['networkUpload']:.4f},"
    )

    # Blockchain
    csv.append(
        f"Blockchain Commitment,Total,{components['blockchainCommitment']['total']:.4f},{percentages['blockchainCommitment']}"
    )
    csv.append(
        f"Blockchain Commitment,Transaction Preparation,{components['blockchainCommitment']['breakdown']['transactionPreparation']:.4f},"
    )
    csv.append(
        f"Blockchain Commitment,Transaction Submit,{components['blockchainCommitment']['breakdown']['transactionSubmit']:.4f},"
    )
    csv.append(
        f"Blockchain Commitment,Network Propagation,{components['blockchainCommitment']['breakdown']['networkPropagation']:.4f},"
    )
    csv.append(
        f"Blockchain Commitment,Block Confirmation,{components['blockchainCommitment']['breakdown']['blockConfirmation']:.4f},"
    )

    # Total
    csv.append(f"Total E2E,,{total:.4f},100.00%")

    return "\n".join(csv)


def main():
    """Main execution"""
    print("\n🔍 Loading latency data from latency-report.json...")
    data = load_latency_data()

    # Generate console table
    generate_console_table(data)

    # Generate and save files
    output_dir = Path("visualizations")
    output_dir.mkdir(exist_ok=True)

    # Save Markdown
    md_path = output_dir / "latency-breakdown-table.md"
    with open(md_path, "w") as f:
        f.write(generate_markdown_table(data))
    print(f"✓ Saved: {md_path}")

    # Save LaTeX
    tex_path = output_dir / "latency-breakdown-table.tex"
    with open(tex_path, "w") as f:
        f.write(generate_latex_table(data))
    print(f"✓ Saved: {tex_path}")

    # Save CSV
    csv_path = output_dir / "latency-breakdown-table.csv"
    with open(csv_path, "w") as f:
        f.write(generate_csv_table(data))
    print(f"✓ Saved: {csv_path}")

    print("\n" + "=" * 90)
    print("✅ ALL TABLES GENERATED SUCCESSFULLY")
    print("=" * 90)
    print("\nOutput files:")
    print(f"  📄 Markdown: {md_path}")
    print(f"  📄 LaTeX:    {tex_path}")
    print(f"  📄 CSV:      {csv_path}")
    print("\nUse these tables in:")
    print("  • Markdown: GitHub README, documentation")
    print(
        "  • LaTeX: Academic papers (requires \\usepackage{booktabs}, \\usepackage{multirow})"
    )
    print("  • CSV: Excel, Google Sheets, data analysis")
    print()


if __name__ == "__main__":
    main()
