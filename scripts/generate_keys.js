import crypto from 'crypto';

const privateKey = '0x' + crypto.randomBytes(32).toString('hex');
console.log(privateKey);