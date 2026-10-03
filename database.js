const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL || "";

const hasDatabaseConfig = !!databaseUrl;

const pool = hasDatabaseConfig 
  ? new Pool({
      connectionString: databaseUrl,
      ssl: databaseUrl.includes('neon.tech') ? { rejectUnauthorized: false } : false
    })
  : null;

module.exports = {
  pool,
  hasDatabaseConfig
};
