import { useState, useEffect, useCallback } from "react";
import {
	Button,
	Box,
	Text,
	Input,
	Switch,
	Modal,
	ModalOverlay,
	ModalContent,
	ModalHeader,
	ModalFooter,
	ModalBody,
	ModalCloseButton,
} from "@chakra-ui/react";
import { useDisclosure, useToast } from "@chakra-ui/react";
import abi from "./abi.json";
import { ethers } from "ethers";
import detectEthereumProvider from "@metamask/detect-provider";

declare global {
	interface Window {
		ethereum: any;
	}
}

export default function ConnectButton() {
	const { isOpen, onOpen, onClose } = useDisclosure();
	const [connected, setConnected] = useState<boolean>(false);
	const [mode, setMode] = useState<string>("BNB");
	const [recieverAdd, setRecieverAdd] = useState<string>("");
	const [sendAmount, setSendAmount] = useState<number>(0);
	const toast = useToast();

	const initialState = {
		account: "",
		balance: "",
		babyBalance: "",
		chainId: "",
	};
	const [hasProvider, setHasProvider] = useState<boolean | null>(null);
	const [wallet, setWallet] = useState(initialState);
	const [txOutObj, setTxOutObj] = useState<any>(null);
	const [gasPrice, setGasPrice] = useState<any>(0);
	const [gasLimit, setGasLimit] = useState<string>("0");

	const tokenContract = new ethers.Contract(
		"0xc748673057861a797275CD8A068AbB95A902e8de",
		abi
	);

	const updateWallet = useCallback(async (accounts: any) => {
		const balanceRes = await window.ethereum!.request({
			method: "eth_getBalance",
			params: [accounts[0], "latest"],
		});
		const balance = ethers.formatEther(balanceRes);
		const chainId = await window.ethereum!.request({
			method: "eth_chainId",
		});

		const balTx = await tokenContract.balanceOf.populateTransaction(
			accounts[0]
		);

		const tokenBalance = await window.ethereum.request({
			method: "eth_call",
			params: [balTx, "latest"],
		});
		var babyBalance =
			tokenBalance === "0x" ? "0" : ethers.formatUnits(tokenBalance, 18);

		setWallet({ account: accounts[0], balance, babyBalance, chainId });
	}, []);

	function handleConnectWallet() {
		if (window.ethereum) {
			window.ethereum
				.request({ method: "eth_requestAccounts" })
				.then(async (accounts: []) => {
					const provider = await detectEthereumProvider({ silent: true });
					updateWallet(accounts);
					setConnected(true);
					setHasProvider(Boolean(provider));
				});
		} else {
			alert("install metamask extension!!");
		}
	}

	function handleDisconnectWallet() {
		if (window.ethereum) {
			setConnected(false);
			setHasProvider(false);
			setWallet(initialState);
		} else {
			alert("install metamask extension!!");
		}
	}

	function handleMode() {
		setMode(mode === "BNB" ? "BabyDoge" : "BNB");
	}

	function handleChangeAddress(event: any) {
		setRecieverAdd(event.target.value);
	}

	function handleChangeAmount(event: any) {
		setSendAmount(event.target.value);
	}

	async function handleOpenModal() {
		if (!recieverAdd) {
			return toast({
				description: "Please input Receiver Address",
				status: "error",
			});
		}
		if (!sendAmount || sendAmount === 0) {
			return toast({
				description: "Please input send amount",
				status: "error",
			});
		}

		var txObj: any;
		if (mode === "BNB") {
			txObj = {
				from: wallet.account,
				to: recieverAdd,
				value: "0x" + ethers.parseEther(sendAmount.toString()).toString(16),
				data: "0x",
			};
		} else {
			txObj = await tokenContract.transfer.populateTransaction(
				recieverAdd,
				ethers.parseEther(sendAmount.toString())
			);
			txObj.from = wallet.account;
			txObj.value = "0x" + BigInt(0).toString(16);
		}
		const gas = await window.ethereum.request({
			method: "eth_estimateGas",
			params: [txObj],
		});
		const gasPrice = await window.ethereum.request({
			method: "eth_gasPrice",
		});
		setGasLimit(BigInt(gas).toString());
    setGasPrice(ethers.formatUnits(gasPrice, "gwei"));
    txObj.gas = gas;
    txObj.gasPrice = gasPrice;
		setTxOutObj(txObj);
		onOpen();
	}

	const sendTx = useCallback(async () => {
		const tx = await window.ethereum.request({
			method: "eth_sendTransaction",
			params: [txOutObj],
		});

		console.log(tx);
	}, [wallet, recieverAdd, sendAmount, txOutObj]);

	useEffect(() => {
		connected && updateWallet(wallet.account);
	}, [wallet, connected, updateWallet]);

	return (
		<>
			<h1 className="title">Metamask login demo from Enva Division</h1>
			{wallet.account ? (
				<Box
					display="block"
					alignItems="center"
					background="white"
					borderRadius="xl"
					p="4"
					width="300px">
					<Box
						display="flex"
						justifyContent="space-between"
						alignItems="center"
						mb="2">
						<Text color="#158DE8" fontWeight="medium">
							Account:
						</Text>
						<Text color="#6A6A6A" fontWeight="medium">
							{`${wallet.account.slice(0, 6)}...${wallet.account.slice(
								wallet.account.length - 4,
								wallet.account.length
							)}`}
						</Text>
					</Box>
					<Box
						display="flex"
						justifyContent="space-between"
						alignItems="center"
						mb="2">
						<Text color="#158DE8" fontWeight="medium">
							BabyDoge Balance :
						</Text>
						<Text color="#6A6A6A" fontWeight="medium">
							{wallet.babyBalance}
						</Text>
					</Box>
					<Box
						display="flex"
						justifyContent="space-between"
						alignItems="center"
						mb="2">
						<Text color="#158DE8" fontWeight="medium">
							BNB Balance:
						</Text>
						<Text color="#6A6A6A" fontWeight="medium">
							{wallet.balance}
						</Text>
					</Box>
					<Box
						display="flex"
						justifyContent="space-between"
						alignItems="center"
						mb="2">
						<Text color="#158DE8" fontWeight="medium">
							BNB / BabyDoge
						</Text>
						<Switch size="md" value={mode} onChange={handleMode} />
					</Box>
					<Box
						display="block"
						justifyContent="space-between"
						alignItems="center"
						mb="4">
						<Text color="#158DE8" fontWeight="medium">
							Send {mode}:
						</Text>
						<Input
							bg="#EBEBEB"
							size="lg"
							value={recieverAdd}
							onChange={handleChangeAddress}
						/>
					</Box>
					<Box display="flex" alignItems="center" mb="4">
						<Input
							bg="#EBEBEB"
							size="lg"
							value={sendAmount}
							onChange={handleChangeAmount}
						/>
						<Button
							onClick={handleOpenModal}
							bg="#158DE8"
							color="white"
							fontWeight="medium"
							borderRadius="xl"
							ml="2"
							border="1px solid transparent"
							_hover={{
								borderColor: "blue.700",
								color: "gray.800",
							}}
							_active={{
								backgroundColor: "blue.800",
								borderColor: "blue.700",
							}}>
							Send
						</Button>
					</Box>
					<Box display="flex" justifyContent="center" alignItems="center">
						<Button
							onClick={handleDisconnectWallet}
							bg="#158DE8"
							color="white"
							fontWeight="medium"
							borderRadius="xl"
							border="1px solid transparent"
							width="300px"
							_hover={{
								borderColor: "blue.700",
								color: "gray.800",
							}}
							_active={{
								backgroundColor: "blue.800",
								borderColor: "blue.700",
							}}>
							Disconnect Wallet
						</Button>
					</Box>
					<Modal isOpen={isOpen} onClose={onClose}>
						<ModalOverlay />
						<ModalContent>
							<ModalHeader>Are you Sure?</ModalHeader>
							<ModalCloseButton />
							<ModalBody>
								<div>
									Are you sure {sendAmount} {mode} to {recieverAdd} user?
								</div>
								<div>Gas Limit: {gasLimit}</div>
								<div>Gas Price: {gasPrice}</div>
							</ModalBody>
							<ModalFooter>
								<Button colorScheme="blue" mr={3} onClick={onClose}>
									Close
								</Button>
								<Button variant="ghost" onClick={sendTx}>
									Send
								</Button>
							</ModalFooter>
						</ModalContent>
					</Modal>
				</Box>
			) : (
				<Box bg="white" p="4" borderRadius="xl">
					<Button
						onClick={handleConnectWallet}
						bg="#158DE8"
						color="white"
						fontWeight="medium"
						borderRadius="xl"
						border="1px solid transparent"
						width="300px"
						_hover={{
							borderColor: "blue.700",
							color: "gray.800",
						}}
						_active={{
							backgroundColor: "blue.800",
							borderColor: "blue.700",
						}}>
						Connect Wallet
					</Button>
				</Box>
			)}
		</>
	);
}
