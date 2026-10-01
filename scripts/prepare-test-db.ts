import pg from 'pg';
const { Client } = pg;
const developmentUrl = process.env.DATABASE_URL;
const testUrl = process.env.TEST_DATABASE_URL;
if (!developmentUrl || !testUrl) throw new Error('DATABASE_URL and TEST_DATABASE_URL are required');
if (developmentUrl === testUrl) throw new Error('Refusing to prepare tests: TEST_DATABASE_URL equals DATABASE_URL');
const development = new URL(developmentUrl); const test = new URL(testUrl);
const developmentName = decodeURIComponent(development.pathname.slice(1)); const testName = decodeURIComponent(test.pathname.slice(1));
if (!testName || testName === developmentName) throw new Error('Test database name must differ from development database name');
if (development.host !== test.host || development.username !== test.username) throw new Error('Test database must use the configured development PostgreSQL server and account');
const client = new Client({ connectionString: developmentUrl });
try { await client.connect(); const found = await client.query('SELECT 1 FROM pg_database WHERE datname=$1', [testName]); if (found.rowCount) console.log(`unchanged database ${testName}`); else { const identifier = `"${testName.replaceAll('"', '""')}"`; await client.query(`CREATE DATABASE ${identifier}`); console.log(`created database ${testName}`); } } finally { await client.end(); }
