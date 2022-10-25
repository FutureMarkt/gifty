import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const config: HardhatUserConfig = {
	defaultNetwork: "hardhat",

	networks: {
		hardhat: {
			chainId: 31337,
		},
	},

	solidity: {
		version: "0.8.17",

		settings: {
			viaIR: true,

			optimizer: {
				enabled: true,
				runs: 1000000000,
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
