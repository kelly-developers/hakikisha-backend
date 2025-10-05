import { Pool, PoolClient, QueryResult } from 'pg';

console.log('🔧 Loading database configuration...');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

export const initializeDatabase = async (retries = 3, delay = 5000): Promise<boolean> => {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`🔄 Database connection attempt ${i + 1}/${retries}...`);
      
      const client = await pool.connect();
      
      await client.query(`SET search_path TO ${process.env.DB_SCHEMA || 'hakikisha'}, public`);
      
      const result = await client.query('SELECT current_schema(), version()');
      
      console.log('✅ Database connected successfully!');
      console.log(`📊 Schema: ${result.rows[0].current_schema}`);
      console.log(`🗃️ PostgreSQL: ${result.rows[0].version.split(',')[0]}`);
      
      client.release();
      return true;
      
    } catch (error: any) {
      console.error(`❌ Connection attempt ${i + 1}/${retries} failed:`, error.message);
      
      if (i < retries - 1) {
        console.log(`⏳ Retrying in ${delay / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('💥 All database connection attempts failed');
        return false;
      }
    }
  }
  return false;
};

pool.on('connect', () => {
  console.log('🔗 New database connection established');
});

pool.on('error', (err) => {
  console.error('💥 Database pool error:', err);
});

export const query = (text: string, params?: any[]): Promise<QueryResult> => {
  return pool.query(text, params);
};

export default { query, pool, initializeDatabase };
