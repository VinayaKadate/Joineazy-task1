const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const poolConfig = process.env.DATABASE_URL ? {
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
} : {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'joineazy_user',
  password: process.env.DB_PASSWORD || 'joineazy_pass',
  database: process.env.DB_NAME || 'joineazy_db',
};

const pool = new Pool(poolConfig);

async function runMigrations() {
  const client = await pool.connect();
  try {
    console.log('🔄 Starting database migrations...');
    
    // Create migrations table to track what's been run
    await client.query(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir).sort();

    for (const file of files) {
      if (!file.endsWith('.sql')) continue;

      // Check if already run
      const { rows } = await client.query('SELECT id FROM migrations WHERE filename = $1', [file]);
      if (rows.length > 0) {
        console.log(`✅ Skipping ${file} (already executed)`);
        continue;
      }

      console.log(`⏳ Executing ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO migrations (filename) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`✅ Successfully executed ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ Error in ${file}:`, err.message);
        throw err;
      }
    }

    console.log('🎉 All migrations completed successfully!');
  } catch (err) {
    console.error('❌ Migration process failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();
