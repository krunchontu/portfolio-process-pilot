const { databaseConfig } = require('./src/config/database');

// Export the same config for all environments
// The database.js file handles environment-specific differences internally
module.exports = {
  development: databaseConfig,
  test: databaseConfig,
  production: databaseConfig
};