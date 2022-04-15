'use strict';

const fs = require('fs');
const { parentPort } = require('worker_threads');
const Web3 = require('web3');

const tokenAbi = require('./tokenAbi.json');
const multisendAbi = require('./multisendAbi.json');

const { TOKENS_AMOUNT, WALLET_ADDRESS, TOKEN_ADDRESS, PRIVATE_KEY, MULTISEND_ADDRESS } = process.env;

const PROVIDER_URL = 'https://data-seed-prebsc-1-s1.binance.org:8545/';
const web3 = new Web3(new Web3.providers.HttpProvider(PROVIDER_URL));

const account = web3.eth.accounts.privateKeyToAccount('0x' + PRIVATE_KEY);
web3.eth.accounts.wallet.add(account);
web3.eth.defaultAccount = account.address;

const tokenContract = new web3.eth.Contract(tokenAbi, TOKEN_ADDRESS);
const multisendContract = new web3.eth.Contract(multisendAbi, MULTISEND_ADDRESS);

const getMultisendMethod = (...args) => multisendContract.methods.multiTransferTokenEqual_71p(TOKEN_ADDRESS, ...args);
const getMintMethod = (amount = 1, wallet = WALLET_ADDRESS) =>
  tokenContract.methods.mint(wallet, web3.utils.toWei(amount.toString(), 'ether'));

const callMethod = async (method) => {
  const gasPrice = await web3.eth.getGasPrice();
  const gasEstimate = await method.estimateGas({ from: WALLET_ADDRESS });
  return method.send({ from: WALLET_ADDRESS, gasPrice, gas: gasEstimate });
};

const approveSpender = async (spender, amount) => {
  const method = await tokenContract.methods.approve(spender, web3.utils.toWei(amount.toString(), 'ether'));
  console.log('Approving');
  await callMethod(method);
  console.log('Successful approved');
};

const multiSend = async (addresses, amountPerWallet) => {
  const weiAmount = web3.utils.toWei(amountPerWallet, 'ether');
  const method = await getMultisendMethod(addresses, weiAmount);
  console.log(`💰 Sending ${amountPerWallet} tokens to ${addresses.length} wallets`);
  await callMethod(method);
  console.log('Succefful sent');
};

const mint = async (amount) => {
  const method = await getMintMethod(amount);
  console.log(`💰 Minting ${amount} tokens`);
  await callMethod(method);
  console.log(`💰 Success minting ${amount} tokens`);
};

const main = async (fileName) => {
  parentPort.postMessage({ status: 'busy' });
  try {
    const fileContent = fs.readFileSync(fileName, 'utf-8');
    const addresses = fileContent.split('\n').filter((el) => el);
    const totalAmount = TOKENS_AMOUNT * addresses.length * 2;
    await mint(totalAmount);
    console.log('WAIT FOR APPROVING');
    await approveSpender(MULTISEND_ADDRESS, totalAmount * 2);
    console.log('APPROVED');
    await multiSend(addresses, TOKENS_AMOUNT);
  } catch (err) {
    console.error(err);
  }
  parentPort.postMessage({ status: 'free' });
};

parentPort.postMessage({ status: 'free' });
parentPort.on('message', main);
