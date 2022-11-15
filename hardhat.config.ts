import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "hardhat-contract-sizer";
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
			// If you want to use the hardhat-coverage plugin - viaIR should be equal to false
			viaIR: false,

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
