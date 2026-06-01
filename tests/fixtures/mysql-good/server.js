const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
const port = process.env.PORT || 3000;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

app.get('/', async (req, res) => {
  const [rows] = await pool.query('SELECT 1 AS ok');
  res.json(rows[0]);
});

app.listen(port, () => console.log(`Listening on ${port}`));
