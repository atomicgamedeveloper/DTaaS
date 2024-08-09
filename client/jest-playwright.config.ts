const BASE_URI = process.env.REACT_APP_URL ?? '';

module.exports = {
  serverOptions: {
    command: "yarn start",
    port: 4000
  },
  browsers: ['chromium', 'firefox', 'webkit'],
  launchOptions: {
    headless: true,
    baseURL: BASE_URI,
  }
};