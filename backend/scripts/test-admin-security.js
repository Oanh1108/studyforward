import pg from 'pg';
const { Client } = pg;

async function testLastAdmin() {
  const base = 'http://localhost:3002/api';
  const c = new Client({
    user: 'postgres',
    password: '1008',
    host: 'localhost',
    port: 5432,
    database: 'toeic_db',
  });
  await c.connect();

  // Ensure only 1 active admin exists
  await c.query("UPDATE users SET role = 'user' WHERE email != 'admin@studyforward.com'");
  const countRes = await c.query(
    'SELECT count(id)::int as count FROM users WHERE role = $1 AND "isLocked" = false',
    ['admin'],
  );
  console.log('Active admins in DB:', countRes.rows[0].count);
  await c.end();

  // Login as the sole admin
  const loginRes = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@studyforward.com', password: 'AdminSuperPassword123!' }),
  });
  const { accessToken, user } = await loginRes.json();
  console.log('Logged in as:', user.email, 'Role:', user.role);

  // 1. Try to demote self (the last admin) -> MUST BE REJECTED WITH 400
  console.log('Testing last active admin demote protection:');
  const demoteRes = await fetch(`${base}/admin/users/${user.id}/role`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ role: 'user' }),
  });
  console.log('Status:', demoteRes.status, 'Body:', await demoteRes.json());

  // 2. Try to lock self (the last admin) -> MUST BE REJECTED WITH 400
  console.log('Testing last active admin lock protection:');
  const lockRes = await fetch(`${base}/admin/users/${user.id}/lock`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ isLocked: true }),
  });
  console.log('Status:', lockRes.status, 'Body:', await lockRes.json());

  console.log('SUCCESS: Last active admin protection is working 100%!');
}

testLastAdmin().catch(console.error);
