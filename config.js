const Rollbar = require('rollbar');
const path = require('path');

exports.APIURL = 'https://api.fullmetal.ai/';

const dirname = typeof __dirname !== 'undefined' ? __dirname : '';
const accessToken =
  typeof process !== 'undefined' ? process.env.ROLLBAR_ACCESS_TOKEN : '';

if (dirname !== '') {
  require('dotenv').config({ path: path.resolve(dirname, '.env') });
}
exports.rollbar = new Rollbar({
  accessToken: accessToken,
  captureUncaught: true,
  captureUnhandledRejections: true,
});
