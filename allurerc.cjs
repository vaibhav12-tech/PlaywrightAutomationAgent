/**
 * Allure 3 config.
 *
 * `singleFile: true` bundles report data into the HTML so opening
 * reports/allure-report/index.html via file:// still works (default multi-file
 * report loads JSON with fetch(), which browsers block for local files).
 */
module.exports = {
  output: 'reports/allure-report',
  name: 'Allure Report',
  plugins: {
    awesome: {
      options: {
        singleFile: true,
      },
    },
  },
};
