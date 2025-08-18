const config = require('./src/config');

module.exports = {
  development: {
    client: 'pg',
    connection: config.database,
    migrations: {
      directory: './src/database/migrations'
    },
    seeds: {
      directory: './src/database/seeds'
    },
    pool: {
      min: 2,
      max: 10
    }
  },

  test: {
    client: 'pg',
    connection: {
      ...config.database,
      database: `${config.database.database}_test`
    },
    migrations: {
      directory: './src/database/migrations'
    },
    seeds: {
      directory: './src/database/seeds'
    },
    pool: {
      min: 1,
      max: 2
    }
  },

  production: {
    client: 'pg',
    connection: {
      ...config.database,
      ssl: config.database.ssl ? { rejectUnauthorized: false } : false
    },
    migrations: {
      directory: './src/database/migrations'
    },
    seeds: {
      directory: './src/database/seeds'
    },
    pool: {
      min: 2,
      max: 20
    }
  }
};