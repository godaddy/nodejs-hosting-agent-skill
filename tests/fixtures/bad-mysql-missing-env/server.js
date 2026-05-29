const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
const port = process.env.PORT || 3000;

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: 3306,
  database: 'app',
  user: 'root',
  password: 'secret',
});

app.get('/', async (req, res) => {
  const [rows] = await pool.query('SELECT 1 AS ok');
  res.json(rows[0]);
});

app.listen(port, () => console.log(`Listening on ${port}`));
