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
        transports: ['websocket'],
        upgrade: false,
        path: '/socket.io/',
        forceNew: true,
        reconnectionAttempts: 3,
        timeout: 2000,
        rejectUnauthorized: false,
        reconnection: true,
        reconnectionAttempts: 5, // Number of reconnection attempts
        reconnectionDelay: 1000, // Initial delay between reconnection attempts (in milliseconds)
        reconnectionDelayMax: 5000, // Maximum delay between reconnection attempts (in milliseconds)
        randomizationFactor: 0.5, // Randomization factor for reconnection delay
      });
      this.socket.on('reconnect', (attemptNumber) => {
        console.log(`Reconnected after ${attemptNumber} attempts`);
      });

      this.socket.on('reconnecting', (attemptNumber) => {
        console.log(`Reconnecting attempt ${attemptNumber}`);
      });

      this.socket.on('reconnect_error', (error) => {
        console.error('Reconnection error:', error);
      });

      this.socket.on('connect', (socket) => {
        this.authenticate({ userType: 'agent', options });
        this.isReady(true);
        this.onError((error) => {
          console.log(error);
        });
      });

      setInterval(() => {
        this.socket.emit('ping', new Date());
      }, 10000);
      this.socket.on('pong', (data) => {
        // console.log('Pong at', this.socket.id, data);
      });
    }

    this.socket.on('disconnect', (socket) => {
      console.log(` ${new Date()} - Disconnected from API server`);
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

  authenticate(data) {
    this.socket.emit('authenticate', data);
  }

  onPrompt(cb) {
    this.socket.on('prompt', cb);
  }

  sendResponse(response) {
    // response= {token:'', completed:false, speed:10, model:''Wizard-Vicuna-7B-Uncensored'}
    this.socket.emit('response', response);
    if (response.completed) {
      this.isReady(true);
    }
  }
  isReady(status) {
    this.socket.emit('agentIsReady', status);
  }
  onError(cb) {
    this.socket.on('error', (error) => {
      cb(error);
      //throw new Error(error);
      console.log(error);
    });
  }
}
module.exports = Fullmetal;
