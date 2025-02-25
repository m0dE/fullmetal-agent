const cryptoJs = require('crypto-js');
const { io } = require('socket.io-client');
const config = require('./config');
const ip = require('ip');

class Fullmetal {
  constructor(options) {
    try {
      if (!options) {
        throw new Error('Missing Configuration: You need to provide an apiKey, model, and agent name');
      }
      if (!options.apiKey)
        throw new Error('Missing Configuration: apiKey is required');
      if (!options.models)
        throw new Error('Missing Configuration: models are required');

      options.ipAddress = options.ipAddress || ip.address();
      options.isPublic = options.hasOwnProperty('isPublic')
        ? options.isPublic
        : true;

      this.secretKey = cryptoJs.lib.WordArray.random(32);
      this.isReconnecting = false;

      this.socket = io(config.APIURL, {
        transports: ['websocket'],
        upgrade: false,
        path: '/socket.io/',
        timeout: 20000,
        rejectUnauthorized: false,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 5000,
        reconnectionDelayMax: 30000,
        randomizationFactor: 0.5,
        pingInterval: 30000, // Send ping every 30 seconds
        pingTimeout: 90000, // Wait 90 seconds before considering the connection dead
      });

      this.setupSocketEvents(options);
    } catch (error) {
      config.rollbar.error(error);
      console.error(error);
    }
  }

  setupSocketEvents(options) {
    this.socket.on('connect', () => {
      console.log(`*******************************************`);
      console.log(`Connected to API server with ${this.socket.id} socketId`);
      console.log(`*******************************************`);
      this.isReconnecting = false;
      this.authenticate({ userType: 'agent', options });
      this.isReady(true);
    });

    this.socket.on('disconnect', (reason) => {
      console.warn(
        `${new Date()} - Disconnected from API server. Reason: ${reason}`
      );
      config.rollbar.info(`${new Date()} - Disconnected. Reason: ${reason}`);

      if (options.restartOnDisconnect) {
        process.exit(1);
      }
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      this.isReconnecting = true;
      console.log(`Reconnecting attempt ${attemptNumber}...`);
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`Reconnected successfully after ${attemptNumber} attempts`);
      this.isReconnecting = false;
    });

    this.socket.on('reconnect_error', (error) => {
      console.error(`Reconnection error:`, error);
      config.rollbar.error(error);
    });

    this.socket.on('connect_error', (error) => {
      console.warn(`connect_error due to ${error}`);
      config.rollbar.error(error);

      if (!this.isReconnecting) {
        this.isReconnecting = true;
        setTimeout(() => {
          console.log('Attempting to reconnect...');
          this.socket.connect();
        }, 5000);
      }
    });

    this.socket.on('error', (error) => {
      console.error(`Socket error:`, error);
      config.rollbar.error(error);
    });
  }

  authenticate(data) {
    try {
      this.socket.emit('authenticate', data);
    } catch (error) {
      config.rollbar.error(error);
      console.error(error);
    }
  }

  isReady(status) {
    try {
      this.socket.emit('agentIsReady', status);
    } catch (error) {
      config.rollbar.error(error);
      console.error(error);
    }
  }

  /**
   * Listens for 'prompt' events from the server
   * @param {Function} cb - Callback function to handle the prompt event
   */
  onPrompt(cb) {
    try {
      this.socket.on('prompt', cb);
    } catch (error) {
      config.rollbar.error(error);
      console.error(error);
    }
  }

  /**
   * Sends response data back to the server
   * @param {Object} response - The response object {token, completed, speed, model}
   */
  sendResponse(response) {
    try {
      this.socket.emit('response', response);
      if (response.completed) {
        this.isReady(true);
      }
    } catch (error) {
      config.rollbar.error(error);
      console.error(error);
    }
  }

  onError(cb) {
    try {
      this.socket.on('error', (error) => {
        config.rollbar.error(error);
        cb(error);
        console.error(error);
      });
    } catch (error) {
      config.rollbar.error(error);
      console.error(error);
    }
  }

  getSocket() {
    return this.socket;
  }
}

module.exports = Fullmetal;
