require('dotenv').config();
const sql = require('mssql');

async function main() {
  const config = {
    server: process.env.DB_SERVER || 'localhost',
    database: process.env.DB_DATABASE || 'fluxion',
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '',
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: process.env.DB_TRUST_CERT !== 'false',
      enableArithAbort: true,
      instanceName: process.env.DB_INSTANCE || undefined,
    },
    pool: {
      max: 5,
      min: 0,
      idleTimeoutMillis: 30000,
    },
  };

  if (process.env.DB_PORT) {
    config.port = parseInt(process.env.DB_PORT, 10);
  }

  const passwordHash = '$2a$10$nI2jxfgDn9xR8z0UQExt0u01oQsL5kAHVGKxKg.s1LL63v/Q2wwYy'; // admin123

  const users = [
    {
      id: 'a0000000-0000-0000-0000-000000000002',
      email: 'sarah@fluxion.dev',
      name: 'Sarah Khan',
      role: 'user',
    },
    {
      id: 'a0000000-0000-0000-0000-000000000003',
      email: 'bilal@fluxion.dev',
      name: 'Bilal Ahmed',
      role: 'user',
    },
    {
      id: 'a0000000-0000-0000-0000-000000000004',
      email: 'aisha@fluxion.dev',
      name: 'Aisha Noor',
      role: 'user',
    },
  ];

  const members = [
    { userId: 'a0000000-0000-0000-0000-000000000002', role: 'admin' },
    { userId: 'a0000000-0000-0000-0000-000000000003', role: 'editor' },
    { userId: 'a0000000-0000-0000-0000-000000000004', role: 'viewer' },
  ];

  const workspaceId = 'b0000000-0000-0000-0000-000000000001';

  const pool = await sql.connect(config);
  try {
    for (const user of users) {
      await pool
        .request()
        .input('id', sql.UniqueIdentifier, user.id)
        .input('email', sql.NVarChar(255), user.email)
        .input('passwordHash', sql.NVarChar(255), passwordHash)
        .input('name', sql.NVarChar(255), user.name)
        .input('role', sql.NVarChar(20), user.role)
        .query(
          `IF NOT EXISTS (SELECT 1 FROM users WHERE email = @email)
           INSERT INTO users (id, email, password_hash, name, role, email_verified)
           VALUES (@id, @email, @passwordHash, @name, @role, 1)`
        );
    }

    for (const member of members) {
      await pool
        .request()
        .input('workspaceId', sql.UniqueIdentifier, workspaceId)
        .input('userId', sql.UniqueIdentifier, member.userId)
        .input('role', sql.NVarChar(20), member.role)
        .query(
          `IF EXISTS (SELECT 1 FROM workspaces WHERE id = @workspaceId)
             AND NOT EXISTS (
               SELECT 1 FROM workspace_members
               WHERE workspace_id = @workspaceId AND user_id = @userId
             )
           INSERT INTO workspace_members (workspace_id, user_id, role)
           VALUES (@workspaceId, @userId, @role)`
        );
    }

    const result = await pool.request().query(
      `SELECT email, name, role, email_verified
       FROM users
       WHERE email IN ('admin@fluxion.dev', 'sarah@fluxion.dev', 'bilal@fluxion.dev', 'aisha@fluxion.dev')
       ORDER BY email`
    );

    console.log('Seed complete. Users:');
    console.table(result.recordset);
  } finally {
    await pool.close();
  }
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
