const { Pool } = require('pg');
require('dotenv').config();


// Database configuration
const pool = new Pool({
  connectionString: `${process.env.DATABASE_URL}`,
  ssl: {
    rejectUnauthorized: false
  }
});


pool.connect((err, client, done) => {
  if (err) {
    console.error('Error connecting to the database:', err);
    return;
  }

  console.log('Connected to the database');
  done();

  client.query(`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'users'
    );
  `, (err, result) => {
    if (err) {
      console.error('Error checking if table exists:', err);
      return;
    }

    const tableExists = result.rows[0].exists;

    if (!tableExists) {
      client.query(`
        CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          hashedPassword VARCHAR(255) NOT NULL
        );
      `, (err) => {
        if (err) {
          console.error('Error creating table:', err);
          return;
        }

        console.log('Table created successfully');
      });
    }
  });
});

module.exports = pool;
