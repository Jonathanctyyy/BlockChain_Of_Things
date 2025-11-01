import { ethers } from "hardhat";
import { Greeter } from "../typechain";

export async function deploy() {
    const GreeterFactory = await ethers.getContractFactory("Greeter");
    const greeter: Greeter = await GreeterFactory.deploy("Hello, World!");
    await greeter.deployed();

    console.log("Greeter deployed to:", greeter.address);
}

if (require.main === module) {
    deploy()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}