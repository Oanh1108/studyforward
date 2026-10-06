#!/usr/bin/env node
import pg from 'pg';
import bcrypt from 'bcrypt';
import readline from 'readline';

const { Client } = pg;

function parseArgs() {
  const args = process.argv.slice(2);
  const result = {};
  for (const arg of args) {
    if (arg.includes('=')) {
      const [key, ...vals] = arg.replace(/^--?/, '').split('=');
      result[key.trim()] = vals.join('=').trim();
    }
  }
  return result;
}

function prompt(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans.trim());
    });
  });
}

async function run() {
  console.log('\n=========================================');
  console.log('   STUDYFORWARD - TẠO TÀI KHOẢN ADMIN    ');
  console.log('=========================================\n');

  const cliArgs = parseArgs();
  let email = cliArgs.email;
  let name = cliArgs.name;
  let password = cliArgs.password;

  if (!email) {
    email = await prompt('Nhập Email Admin: ');
  }
  if (!name) {
    name = await prompt('Nhập Họ và Tên: ');
  }
  if (!password) {
    password = await prompt('Nhập Mật khẩu (tối thiểu 8 ký tự): ');
  }

  email = (email || '').trim().toLowerCase();
  name = (name || '').trim();

  if (!email || !email.includes('@')) {
    console.error('❌ Lỗi: Email không hợp lệ.');
    process.exit(1);
  }
  if (!name) {
    console.error('❌ Lỗi: Họ tên không được để trống.');
    process.exit(1);
  }
  if (!password || password.length < 8) {
    console.error('❌ Lỗi: Mật khẩu phải có tối thiểu 8 ký tự.');
    process.exit(1);
  }

  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '1008',
    database: process.env.DB_NAME || 'toeic_db',
  });

  try {
    await client.connect();
    console.log('✓ Đã kết nối cơ sở dữ liệu.');

    // Check if user exists
    const checkRes = await client.query('SELECT id, email, role, "isLocked" FROM users WHERE email = $1', [email]);

    const hashedPassword = await bcrypt.hash(password, 10);

    if (checkRes.rows.length > 0) {
      const existing = checkRes.rows[0];
      console.log(`ℹ️ Người dùng "${email}" đã tồn tại. Tiến hành nâng cấp lên quyền ADMIN và cập nhật mật khẩu...`);
      await client.query(
        'UPDATE users SET role = $1, password = $2, "isLocked" = false, name = $3, "updatedAt" = NOW() WHERE id = $4',
        ['admin', hashedPassword, name, existing.id]
      );
      console.log(`\n🎉 NÂNG CẤP ADMIN THÀNH CÔNG!`);
      console.log(`• ID: ${existing.id}`);
      console.log(`• Tên: ${name}`);
      console.log(`• Email: ${email}`);
      console.log(`• Vai trò: ADMIN`);
      console.log(`• Trạng thái: Hoạt động (isLocked: false)`);
    } else {
      const insertRes = await client.query(
        `INSERT INTO users (name, email, password, goal, role, "isLocked", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 600, 'admin', false, NOW(), NOW())
         RETURNING id, name, email, role`,
        [name, email, hashedPassword]
      );
      const created = insertRes.rows[0];
      console.log(`\n🎉 TẠO TÀI KHOẢN ADMIN MỚI THÀNH CÔNG!`);
      console.log(`• ID: ${created.id}`);
      console.log(`• Tên: ${created.name}`);
      console.log(`• Email: ${created.email}`);
      console.log(`• Vai trò: ADMIN`);
      console.log(`• Trạng thái: Hoạt động (isLocked: false)`);
    }
  } catch (err) {
    console.error('❌ Thao tác thất bại:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
