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
    const loan = {
      assetSymbol: 'USD',
      borrowerAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      principalAmount: '20.0',
      collateralAmount: '0.0',
      loanTimeStamp: Date.now().toString(),
      status: 'active'
    };
    
    await client.query(
      `INSERT INTO "loans" ("assetSymbol", "borrowerAddress", "principalAmount", "collateralAmount", "loanTimeStamp", "status") VALUES ($1, $2, $3, $4, $5, $6)`,
      [loan.assetSymbol, loan.borrowerAddress, loan.principalAmount, loan.collateralAmount, loan.loanTimeStamp, loan.status]
    );
    console.log('Insert successful');
  } catch (err) {
    console.error('Insert failed:', err);
  }

  await client.end();
}

test();
