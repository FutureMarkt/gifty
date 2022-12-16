import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "@openzeppelin/hardhat-upgrades";
import "hardhat-contract-sizer";
import "dotenv/config";

const config: HardhatUserConfig = {
	defaultNetwork: "hardhat",

	networks: {
		hardhat: {
			chainId: 31337,
		},

		goerli: {
			url:
				"https://eth-goerli.g.alchemy.com/v2/" +
				process.env.GOERLI_API_KEY,
			accounts: [process.env.PRIVATE_KEY_GOERLI as string],
			chainId: 5,
		},
	},

	solidity: {
		version: "0.8.17",

		settings: {
			// If you want to use the hardhat-coverage plugin - viaIR should be equal to false
			viaIR: false,

			optimizer: {
				enabled: true,
				runs: 200,
			},
		},
	},

	gasReporter: {
		enabled: true,
		currency: "USD",
		outputFile: "gasReport.txt",
		noColors: true,
	},

	etherscan: {
		apiKey: process.env.ETHERSCAN_API_KEY || "",
	},
};

export default config;
