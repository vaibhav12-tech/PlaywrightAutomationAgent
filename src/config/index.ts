const env = process.env.TEST_ENV || 'dev';
const config = require(`./env.${env}`).default;
export default config;
