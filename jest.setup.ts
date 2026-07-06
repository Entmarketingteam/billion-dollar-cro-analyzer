// Learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom'

// Polyfill for crypto.randomUUID in Jest environment
if (typeof global.crypto === 'undefined') {
  const crypto = require('crypto');
  global.crypto = crypto;
}

if (typeof global.crypto.randomUUID === 'undefined') {
  global.crypto.randomUUID = () => {
    const { randomUUID } = require('crypto');
    return randomUUID();
  };
}
