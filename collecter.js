'use strict';

const fs = require('fs');
const Web3 = require('web3');
const queue = require('./queue')

const { API_KEY, ADDRESSES_PER_FILE } = process.env;
const web3 = new Web3(`wss://bsc.getblock.io/mainnet/?api_key=${API_KEY}`);

const cache = [];
let roundName = Date.now().toString();
let currentRound = [];
let addressesInRound = 0;

const isAlreadyStored = (address) => {
  return currentRound.includes(address) || cache.includes(address);
};

const loadCache = () => {
  const dirFiles = fs.readdirSync(__dirname);
  const txtFiles = dirFiles.filter((f) => f.endsWith('.txt'));
  for (const fileName of txtFiles) {
    const fileContent = fs.readFileSync(fileName, 'utf-8');
    cache.push(...fileContent.split('\n'));
  }
};
loadCache();

const saveAddresses = () => {
  console.log('Saving addresses');
  const fileName = `${roundName}.txt`;
  const exists = fs.existsSync(fileName);
  const fileContent = exists ? fs.readFileSync(fileName, 'utf-8') + '\n' : '';
  cache.push(...currentRound);
  fs.writeFileSync(fileName, `${fileContent}${currentRound.join('\n')}`);
  currentRound = [];
};

const nextRound = () => {
  saveAddresses();
  queue.addToQueue(`${roundName}.txt`);
  roundName = Date.now().toString();
  addressesInRound = 0;
};

const addAddress = (address) => {
  if (isAlreadyStored(address)) return false;
  currentRound.push(address);
  //   console.log(`❗️💥 New address ${address}`);
  //   console.log(`Index: ${addressesInRound}`);
  //   console.log(`----------------------------------------------------------------------------`);
  if (addressesInRound >= ADDRESSES_PER_FILE) nextRound();
  addressesInRound += 1;
  return true;
};

const subscription = web3.eth.subscribe('pendingTransactions', (err) => {
  if (err) {
    console.log(`🔴 Error retrieving network pending transactions or bad GetBlock.io API Key`);
    throw err;
  }
});

subscription.on('connected', () => {
  console.log('🟢 Connected');
});

subscription.on('data', async (txHash) => {
  try {
    const transaction = await web3.eth.getTransaction(txHash);
    if (!transaction) throw new Error('Transaction not found');
    addAddress(transaction.from);
    addAddress(transaction.to);
  } catch (err) {
    console.log(`🔴 ${txHash} not valid transaction`);
  }
});

subscription.on('error', console.error);

setInterval(saveAddresses, 10 * 1000);
