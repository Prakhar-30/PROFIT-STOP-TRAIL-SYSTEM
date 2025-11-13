import { ethers } from 'ethers';
import { getSigner, parseUnits, getProvider, getReadProvider } from './web3';
import { CALLBACK_ABI } from '../contracts/CallbackABI';
import { REACTIVE_ABI } from '../contracts/ReactiveABI';
import { ERC20_ABI, UNISWAP_PAIR_ABI, UNISWAP_FACTORY_ABI, UNISWAP_FACTORY_ADDRESS } from '../contracts/ERC20ABI';
import { CALLBACK_BYTECODE, REACTIVE_BYTECODE } from '../contracts/bytecode';
import { UNISWAP_V2_ROUTER, CALLBACK_SENDER, CALLBACK_DEPLOY_VALUE, REACTIVE_DEPLOY_VALUE } from '../config/networks';

// Export getProvider for use in components
export { getProvider };

export const deployCallbackContract = async (ownerAddress) => {
  const signer = await getSigner();

  const factory = new ethers.ContractFactory(CALLBACK_ABI, CALLBACK_BYTECODE, signer);

  const contract = await factory.deploy(
    ownerAddress,
    CALLBACK_SENDER,
    UNISWAP_V2_ROUTER,
    {
      value: parseUnits(CALLBACK_DEPLOY_VALUE, 18)
    }
  );

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  return address;
};

export const deployReactiveContract = async (ownerAddress, callbackAddress) => {
  const signer = await getSigner();

  const factory = new ethers.ContractFactory(REACTIVE_ABI, REACTIVE_BYTECODE, signer);

  const contract = await factory.deploy(
    ownerAddress,
    callbackAddress,
    {
      value: parseUnits(REACTIVE_DEPLOY_VALUE, 18)
    }
  );

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  return address;
};

// Get Callback contract for read-only operations (doesn't need signer)
export const getCallbackContractRead = (contractAddress) => {
  const provider = getReadProvider();
  return new ethers.Contract(contractAddress, CALLBACK_ABI, provider);
};

export const getCallbackContract = async (contractAddress) => {
  const signer = await getSigner();
  return new ethers.Contract(contractAddress, CALLBACK_ABI, signer);
};

// Get Reactive contract for read-only operations (doesn't need signer)
export const getReactiveContractRead = (contractAddress) => {
  const provider = getReadProvider();
  return new ethers.Contract(contractAddress, REACTIVE_ABI, provider);
};

export const getReactiveContract = async (contractAddress) => {
  const signer = await getSigner();
  return new ethers.Contract(contractAddress, REACTIVE_ABI, signer);
};

// Get ERC20 contract for read-only operations (doesn't need signer)
export const getERC20ContractRead = (tokenAddress) => {
  const provider = getReadProvider();
  return new ethers.Contract(tokenAddress, ERC20_ABI, provider);
};

// Get ERC20 contract for write operations (needs signer)
export const getERC20Contract = async (tokenAddress) => {
  const signer = await getSigner();
  return new ethers.Contract(tokenAddress, ERC20_ABI, signer);
};

// Get Pair contract for read-only operations (doesn't need signer)
export const getPairContractRead = (pairAddress) => {
  const provider = getReadProvider();
  return new ethers.Contract(pairAddress, UNISWAP_PAIR_ABI, provider);
};

export const getPairContract = async (pairAddress) => {
  const signer = await getSigner();
  return new ethers.Contract(pairAddress, UNISWAP_PAIR_ABI, signer);
};

export const getUniswapPair = async (token0Address, token1Address) => {
  const provider = getReadProvider();
  const factory = new ethers.Contract(UNISWAP_FACTORY_ADDRESS, UNISWAP_FACTORY_ABI, provider);

  const pairAddress = await factory.getPair(token0Address, token1Address);

  if (pairAddress === ethers.ZeroAddress) {
    throw new Error('Pair does not exist');
  }

  return pairAddress;
};

export const getTokenInfo = async (tokenAddress) => {
  const contract = getERC20ContractRead(tokenAddress);

  const [name, symbol, decimals] = await Promise.all([
    contract.name(),
    contract.symbol(),
    contract.decimals()
  ]);

  return { name, symbol, decimals };
};

export const getTokenBalance = async (tokenAddress, walletAddress) => {
  const contract = getERC20ContractRead(tokenAddress);
  return await contract.balanceOf(walletAddress);
};

export const approveToken = async (tokenAddress, spenderAddress, amount) => {
  const contract = await getERC20Contract(tokenAddress);
  const tx = await contract.approve(spenderAddress, amount);
  await tx.wait();
  return tx;
};

export const getAllowance = async (tokenAddress, ownerAddress, spenderAddress) => {
  const contract = getERC20ContractRead(tokenAddress);
  return await contract.allowance(ownerAddress, spenderAddress);
};

export const createPosition = async (
  callbackAddress,
  pairAddress,
  sellToken0,
  baseAmount,
  hardStopPercent,
  profitTakePercent
) => {
  const contract = await getCallbackContract(callbackAddress);

  const coefficient = parseUnits('1', 18);
  const hardStopBps = Math.floor(hardStopPercent * 100);
  const profitTakeBps = Math.floor(profitTakePercent * 100);

  const tx = await contract.createProfitLockingPosition(
    pairAddress,
    sellToken0,
    baseAmount,
    coefficient,
    hardStopBps,
    profitTakeBps
  );

  await tx.wait();
  return tx;
};

export const getPositions = async (callbackAddress) => {
  const contract = getCallbackContractRead(callbackAddress);
  return await contract.getAllPositions();
};

export const getActivePositions = async (callbackAddress) => {
  const contract = getCallbackContractRead(callbackAddress);
  return await contract.getActivePositions();
};

export const getPosition = async (callbackAddress, positionId) => {
  const contract = getCallbackContractRead(callbackAddress);
  return await contract.positions(positionId);
};

export const pausePosition = async (callbackAddress, positionId) => {
  const contract = await getCallbackContract(callbackAddress);
  const tx = await contract.pausePosition(positionId);
  await tx.wait();
  return tx;
};

export const resumePosition = async (callbackAddress, positionId) => {
  const contract = await getCallbackContract(callbackAddress);
  const tx = await contract.resumePosition(positionId);
  await tx.wait();
  return tx;
};

export const cancelPosition = async (callbackAddress, positionId) => {
  const contract = await getCallbackContract(callbackAddress);
  const tx = await contract.cancelPosition(positionId);
  await tx.wait();
  return tx;
};

export const getCurrentPrice = async (callbackAddress, pairAddress, sellToken0) => {
  const contract = getCallbackContractRead(callbackAddress);
  return await contract.getCurrentPrice(pairAddress, sellToken0);
};
