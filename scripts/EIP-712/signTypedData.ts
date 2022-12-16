import { signTypedData, SignTypedDataVersion } from "@metamask/eth-sig-util";
import { Wallet } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
	IAssignReceiver,
	buildTypedData,
	buildTypedDataMetaMask,
} from "./EIP-712Types";

export async function signHardhat(
	signer: SignerWithAddress,
	giftyAddress: string,
	assignReceiverStruct: IAssignReceiver
) {
	const chainId: number = await signer.getChainId();
	const { domain, message, types } = buildTypedData(
		chainId,
		giftyAddress,
		assignReceiverStruct
	);

	return signer._signTypedData(domain, types, message);
}

export async function signMetaMask(
	signer: Wallet,
	giftyAddress: string,
	assignReceiverStruct: IAssignReceiver
) {
	const chainId: number = await signer.getChainId();
	const params = buildTypedDataMetaMask(
		chainId,
		giftyAddress,
		assignReceiverStruct
	);

	const callParams = {
		privateKey: Buffer.from(signer.privateKey),
		data: params,
		version: SignTypedDataVersion.V4,
	};

	signTypedData(callParams);
}
