import { MessageTypes, TypedMessage } from "@metamask/eth-sig-util";

interface TypeParams {
	name: string;
	type: string;
}

const AssignReceiverType: Array<TypeParams> = [
	{ name: "receiver", type: "address" },
	{ name: "giftId", type: "uint256" },
];

const EIP712DomainType: Array<TypeParams> = [
	{ name: "name", type: "string" },
	{ name: "version", type: "string" },
	{ name: "chainId", type: "uint256" },
	{ name: "verifyingContract", type: "address" },
];

export interface IAssignReceiver {
	receiver: string;
	giftId: number;
}

export function buildTypedData(
	chainId: number,
	verifyingContract: string,
	assignReceiverStruct: IAssignReceiver
) {
	const { receiver, giftId } = assignReceiverStruct;

	return {
		domain: {
			name: "Gifty",
			version: "1",
			chainId,
			verifyingContract,
		},

		message: {
			receiver,
			giftId,
		},

		primaryType: "AssignReceiver",

		types: {
			AssignReceiver: AssignReceiverType,
		},
	};
}

export function buildTypedDataMetaMask(
	chainId: number,
	giftyAddress: string,
	assignReceiverStruct: IAssignReceiver
): TypedMessage<MessageTypes> {
	const typedDataProps = buildTypedData(
		chainId,
		giftyAddress,
		assignReceiverStruct
	);

	return {
		...typedDataProps,

		types: {
			...typedDataProps.types,
			EIP712Domain: EIP712DomainType,
		},
	};
}
