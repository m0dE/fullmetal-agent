// index.js
const cryptoJs = require('crypto-js');
const { io } = require('socket.io-client');
const config = require('./config');
const ip = require('ip');

function generateRSAKeyPair() {
  try {
    const keyPair = cryptoJs.lib.WordArray.random(32);
    return {
      publicKey: keyPair.toString(),
      privateKey: keyPair.toString(),
    };
  } catch (error) {
    console.error('An error occurred:', error);
    config.rollbar.error(error);
  }
}
class Fullmetal {
  constructor(options) {
    try {
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
        if (!options.ipAddress) {
          options.ipAddress = ip.address();
        }
        if (!options.hasOwnProperty('isPublic')) {
          options.isPublic = true;
        }
        this.secretKey = cryptoJs.lib.WordArray.random(32); // Generate a new secret key for each session
        this.socket = io(config.APIURL, {
          transports: ['websocket'],
          upgrade: false,
          path: '/socket.io/',
          forceNew: true,
          timeout: 2000,
          rejectUnauthorized: false,
          reconnection: true,
          reconnectionAttempts: Infinity, // Number of reconnection attempts
          reconnectionDelay: 1000, // Initial delay between reconnection attempts (in milliseconds)
          reconnectionDelayMax: 5000, // Maximum delay between reconnection attempts (in milliseconds)
          randomizationFactor: 0.5, // Randomization factor for reconnection delay
          pingInterval: 15000, // Send ping every 15 seconds
          pingTimeout: 180000, // Wait 180 seconds for a pong
        });
        this.socket.on('reconnect', (attemptNumber) => {
          console.log(`Reconnected after ${attemptNumber} attempts`);
        });

        this.socket.on('reconnecting', (attemptNumber) => {
          console.log(`Reconnecting attempt ${attemptNumber}`);
        });

        this.socket.on('reconnect_error', (error) => {
          config.rollbar.error(error);
          console.error('Reconnection error:', error);
        });

        this.socket.on('connect_error', (error) => {
          console.log(`connect_error due to ${error}`);
          setTimeout(() => {
            this.socket.connect();
          }, 5000);
        });

        this.socket.on('connect', (socket) => {
          console.log(`*******************************************`);
          console.log(
            `Connected to API server with ${this.socket.id} socketId`
          );
          console.log(`*******************************************`);
          this.authenticate({ userType: 'agent', options });
          this.isReady(true);
          this.onError((error) => {
            config.rollbar.error(error);
            console.log(error);
          });
        });

        this.socket.on('close', (socket) => {
          config.rollbar.info(` ${new Date()} - Socket get closed`);
          console.log(` ${new Date()} - Socket get closed`);
          if (options.restartOnDisconnect) {
            process.exit(1); // purposely restarting the app
          }
        });
        this.socket.on('disconnect', (reason) => {
          config.rollbar.info(
            `${new Date()} - Disconnected from API server. Reason: ${reason}`
          );
          console.log(
            ` ${new Date()} - Disconnected from API server. Reason: ${reason}`
          );
          if (options.restartOnDisconnect) {
            process.exit(1); // purposely restarting the app
          }
        });
      }
    } catch (error) {
      config.rollbar.error(error);
      console.log(error);
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
    try {
      this.socket.emit('authenticate', data);
    } catch (error) {
      config.rollbar.error(error);
      console.log(error);
    }
  }
  onPrompt(cb) {
    try {
      this.socket.on('prompt', cb);
    } catch (error) {
      config.rollbar.error(error);
      console.log(error);
    }
  }

  sendResponse(response) {
    try {
      // response= {token:'', completed:false, speed:10, model:''Wizard-Vicuna-7B-Uncensored'}
      this.socket.emit('response', response);
      if (response.completed) {
        this.isReady(true);
      }
    } catch (error) {
      config.rollbar.error(error);
      console.log(error);
    }
  }

  isReady(status) {
    try {
      this.socket.emit('agentIsReady', status);
    } catch (error) {
      config.rollbar.error(error);
      console.log(error);
    }
  }

  onError(cb) {
    try {
      this.socket.on('error', (error) => {
        config.rollbar.error(error);
        cb(error);
        //throw new Error(error);
        console.log(error);
      });
    } catch (error) {
      config.rollbar.error(error);
      console.log(error);
    }
  }

  getSocket() {
    try {
      return this.socket;
    } catch (error) {
      config.rollbar.error(error);
      console.log(error);
    }
  }
}
module.exports = Fullmetal;
