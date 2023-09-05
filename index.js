// index.js
const cryptoJs = require('crypto-js');
const { io } = require('socket.io-client');
const config = require('./config');

function generateRSAKeyPair() {
  const keyPair = cryptoJs.lib.WordArray.random(32);
  return {
    publicKey: keyPair.toString(),
    privateKey: keyPair.toString(),
  };
}

class Fullmetal {
  constructor(options) {
    if (!options)
      throw new Error(
        'Missing Configuration: You need to provide a apikey, model and agent name'
      );

    if (options) {
      if (!options.apiKey) {
        throw new Error('Missing Configuration: apiKey is required');
      }
      if (!options.models) {
        throw new Error('Missing Configuration: models are required');
      }
      this.secretKey = cryptoJs.lib.WordArray.random(32); // Generate a new secret key for each session
      this.socket = io(config.APIURL, {
        path: '/socket.io/',
        forceNew: true,
        reconnectionAttempts: 3,
        timeout: 2000,
        rejectUnauthorized: false,
      });
      this.authenticate({ userType: 'agent', options });
      this.isReady(true);
      this.onError((error) => {
        console.log(error);
      });
    }
    // this.performKeyExchange();
  }
  performKeyExchange() {
    const keyPair = generateRSAKeyPair();
    this.socket.on('clientPublicKey', (clientPublicKey) => {
      this.clientPublicKey = cryptoJs.enc.Utf8.parse(clientPublicKey);
      this.socket.emit('agentPublicKey', keyPair.publicKey);
    });
  }

  // Client-side encryption using FullmetalClient's public key
  encrypt(data) {
    if (!this.clientPublicKey) {
      throw new Error(
        'Client public key not received. Perform key exchange first.'
      );
    }

    const encryptedData = cryptoJs.AES.encrypt(data, this.clientPublicKey, {
      mode: cryptoJs.mode.ECB,
      padding: cryptoJs.pad.NoPadding,
    }).toString();
    const encodedEncryptedData = cryptoJs.enc.Base64.stringify(
      cryptoJs.enc.Utf8.parse(encryptedData)
    );
    return encodedEncryptedData;
  }

  // Client-side decryption using own private key
  decrypt(encryptedData) {
    const decodedEncryptedData = cryptoJs.enc.Base64.parse(
      encryptedData
    ).toString(cryptoJs.enc.Utf8);
    const decipher = cryptoJs.AES.decrypt(
      decodedEncryptedData,
      this.secretKey,
      {
        mode: cryptoJs.mode.ECB,
        padding: cryptoJs.pad.NoPadding,
      }
    );
    const decryptedData = decipher.toString(cryptoJs.enc.Utf8);
    return decryptedData;
  }

  authenticate(data) {
    this.socket.emit('authenticate', data);
  }

  onPrompt(cb) {
    this.socket.on('prompt', cb);
  }

  sendResponse(response, completed) {
    const payload = {
      response,
      completed,
    };
    this.socket.emit('response', payload);
    if (completed) {
      this.isReady(true);
    }
  }
  isReady(status) {
    this.socket.emit('agentIsReady', status);
  }
  onError(cb) {
    this.socket.on('error', (error) => {
      cb(error);
      throw new Error(error);
    });
  }
}
module.exports = Fullmetal;
