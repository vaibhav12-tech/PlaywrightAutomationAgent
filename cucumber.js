const os = require('node:os');
const process = require('node:process');

module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: ['src/hooks/hooks.ts', 'features/step-definitions/**/*.ts'],
    format: ['html:reports/report.html', 'allure-cucumberjs/reporter'],
    formatOptions: {
      resultsDir: 'reports/allure-results',
      environmentInfo: {
        os_platform: os.platform(),
        os_release: os.release(),
        node_version: process.version,
      },
    },
  },
};
