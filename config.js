const Rollbar = require('rollbar');
const path = require('path');

exports.APIURL = 'https://api.fullmetal.ai/';

let dirname = typeof __dirname !== 'undefined' ? __dirname : '';

if (dirname !== '') {
  require('dotenv').config({ path: path.resolve(__dirname, '.env') });
}
exports.rollbar = new Rollbar({
  accessToken: process.env.ROLLBAR_ACCESS_TOKEN || '',
  captureUncaught: true,
  captureUnhandledRejections: true,
});
