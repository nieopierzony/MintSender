'use strict';

const { start } = require('repl');
const { Worker } = require('worker_threads');

const queue = [];
const worker = new Worker('./sender.js');
let workerStatus = 'free';

const next = (shift = true) => {
  if (shift) queue.shift();
  if (queue.length > 0) worker.postMessage(queue[0]);
};

const addToQueue = (fileName) => {
  console.log(`📥 Adding ${fileName} to queue`);
  queue.push(fileName);
  console.log(`📥 Queue length: ${queue.length}`);
  if (queue.length === 1 && workerStatus === 'free') next(false);
};

worker.on('message', (msg) => {
  if (!msg.status) return;
  console.log(`Worker status: ${msg.status}`);
  workerStatus = msg.status;
  if (workerStatus === 'free' && queue.length !== 0) next();
});

worker.on('error', console.error);
worker.on('exit', () => console.log('Worker stopped'));

module.exports = { addToQueue };
