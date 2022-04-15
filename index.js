'use strict';

require('dotenv').config();
//require('./collecter');
const queue = require('./queue');

queue.addToQueue('a.txt');
