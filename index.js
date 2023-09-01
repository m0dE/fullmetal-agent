// index.js
const cryptoJs = require('crypto-js');
const { io } = require('socket.io-client');
require('dotenv').config();

function generateRSAKeyPair() {
  const keyPair = cryptoJs.lib.WordArray.random(32);
  return {
    publicKey: keyPair.toString(),
    privateKey: keyPair.toString(),
  };
}
class Fullmetal {
  constructor(config) {
    this.secretKey = cryptoJs.lib.WordArray.random(32); // Generate a new secret key for each session
    this._config = config;
    this.socket = io('https://api.fullmetal.ai/', {
      path: '/socket.io/',
      forceNew: true,
      reconnectionAttempts: 3,
      timeout: 2000,
      rejectUnauthorized: false,
    });

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

  async setApiKey(apikey) {
    this._apiKey = apikey;
    this.authenticate('agent', {
      apiKey: this._apiKey,
      name: this._config.name,
    });
  }

  authenticate(userType, credentials) {
    this.socket.emit('authenticate', { userType, credentials });
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
  }
  onError(cb) {
    this.socket.on('error', cb);
  }
}
module.exports = Fullmetal;
