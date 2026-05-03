const { Client } = require('pg');

async function test() {
  const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'lending_db',
    password: 'admin',
    port: 5432,
  });
  await client.connect();

  try {
    const symbol = 'USD';
    const parsedAmount = 20;
    const sign = '-';
    await client.query(`UPDATE "reserves" SET "totalLiquidity" = "totalLiquidity" ${sign} ${parsedAmount} WHERE "symbol" = $1`, [symbol]);
    console.log('Update successful');
  } catch (err) {
    console.error('Update failed:', err);
  }

  await client.end();
}

test();
