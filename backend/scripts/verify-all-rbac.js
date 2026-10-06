/**
 * Full RBAC & Security Verification Script
 * Validates:
 * 1. Registering cannot set role: 'admin' (strictly defaults to 'user')
 * 2. Normal user calling Admin API -> 403 Forbidden
 * 3. User cannot access or modify another user's vocabulary folder (data ownership)
 * 4. Locked account immediately gets 401 Unauthorized even with valid token
 * 5. Demoted admin immediately gets 403 Forbidden without needing to re-login
 * 6. Last active admin cannot be demoted, locked, or deleted (400 Bad Request)
 * 7. Admin actions are properly logged to admin_logs
 */

const API = 'http://localhost:3002/api';

async function req(url, options = {}) {
  const { headers, ...rest } = options;
  const res = await fetch(`${API}${url}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(headers || {}),
    },
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, ok: res.ok, data };
}

async function runTests() {
  console.log('=== STARTING RBAC VERIFICATION SUITE ===\n');
  let passed = 0;
  let total = 0;

  function assert(condition, name, details) {
    total++;
    if (condition) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`, details !== undefined ? details : '');
      process.exitCode = 1;
    }
  }

  // 1. Register with spoofed role: 'admin'
  const ts = Date.now();
  const testUserEmail = `normal_user_${ts}@test.com`;
  const regRes = await req('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: testUserEmail,
      name: 'Normal User Test',
      password: 'UserPass12345!',
      role: 'admin', // Attack attempt
    }),
  });

  assert(regRes.status === 201, '1.1 User registration succeeds', regRes.data);
  assert(regRes.data?.user?.role === 'user', '1.2 Role is strictly USER despite sending role="admin"', regRes.data);
  const userToken = regRes.data?.accessToken;
  const userId = regRes.data?.user?.id;

  // 2. Normal user calling Admin API -> 403
  const adminStatsRes = await req('/admin/stats', {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert(adminStatsRes.status === 403, '2.1 User calling /admin/stats rejected with 403', adminStatsRes.data);

  const adminUsersRes = await req('/admin/users', {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert(adminUsersRes.status === 403, '2.2 User calling /admin/users rejected with 403', adminUsersRes.data);

  // 3. User creates a folder, another user tries to access/delete it
  const folderRes = await req('/vocabulary/folders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
    body: JSON.stringify({ name: 'Private User Folder' }),
  });
  assert(folderRes.status === 201, '3.1 User creates private folder', folderRes.data);
  const folderId = folderRes.data?.id;

  // Create second user
  const otherUserEmail = `other_user_${ts}@test.com`;
  const otherReg = await req('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: otherUserEmail,
      name: 'Other User',
      password: 'OtherPass12345!',
    }),
  });
  const otherToken = otherReg.data?.accessToken;

  // Other user attempts to delete folderId
  const stealDeleteRes = await req(`/vocabulary/folders/${folderId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${otherToken}` },
  });
  assert(stealDeleteRes.status === 404 || stealDeleteRes.status === 403, '3.2 Other user cannot delete someone else\'s folder (protected)', stealDeleteRes.data);

  // 4. Admin operations
  const adminLogin = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: 'admin@studyforward.com',
      password: 'AdminSuperPassword123!',
    }),
  });
  assert((adminLogin.status === 200 || adminLogin.status === 201) && adminLogin.data?.user?.role === 'admin', '4.1 Admin login successful', adminLogin.data);
  const adminToken = adminLogin.data?.accessToken;
  const adminId = adminLogin.data?.user?.id;

  // 5. Admin locks test user -> test user immediately gets 401 on existing token
  const lockRes = await req(`/admin/users/${userId}/lock`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ isLocked: true }),
  });
  assert(lockRes.status === 200, '5.1 Admin locks test user', lockRes.data);

  // Test user attempts to use existing token
  const lockedUserReq = await req('/vocabulary/my-words', {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert(lockedUserReq.status === 401, '5.2 Locked user receives 401 Unauthorized immediately with old token', lockedUserReq.data);

  // Locked user attempts to login again -> rejected
  const lockedLogin = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: testUserEmail,
      password: 'UserPass12345!',
    }),
  });
  assert(lockedLogin.status === 401 || lockedLogin.status === 403, '5.3 Locked user blocked from logging in', lockedLogin.data);

  // Unlock user
  await req(`/admin/users/${userId}/lock`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ isLocked: false }),
  });

  // 6. Role Change: Promote User to Admin -> Check admin access -> Demote Admin -> Check immediate loss of admin access
  const promoteRes = await req(`/admin/users/${userId}/role`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ role: 'admin' }),
  });
  assert(promoteRes.status === 200, '6.1 Admin promotes test user to ADMIN', promoteRes.data);

  // Test user (with original token) can now access admin API immediately
  const nowAdminRes = await req('/admin/stats', {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert(nowAdminRes.status === 200, '6.2 Newly promoted admin accesses /admin/stats without new token', nowAdminRes.data);

  // Now demote test user back to USER
  const demoteRes = await req(`/admin/users/${userId}/role`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ role: 'user' }),
  });
  assert(demoteRes.status === 200, '6.3 Demote test user back to USER', demoteRes.data);

  // Test user immediately loses admin access on next request with existing token
  const demotedReq = await req('/admin/stats', {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  assert(demotedReq.status === 403, '6.4 Demoted user immediately rejected with 403 Forbidden', demotedReq.data);

  // 7. Last Active Admin Protection
  // Try to demote the primary admin
  const demoteLastAdmin = await req(`/admin/users/${adminId}/role`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ role: 'user' }),
  });
  assert(demoteLastAdmin.status === 400, '7.1 Last active admin cannot be demoted (400 Bad Request)', demoteLastAdmin.data);

  // Try to lock the primary admin
  const lockLastAdmin = await req(`/admin/users/${adminId}/lock`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ isLocked: true }),
  });
  assert(lockLastAdmin.status === 400, '7.2 Last active admin cannot be locked (400 Bad Request)', lockLastAdmin.data);

  // Try to delete the primary admin
  const deleteLastAdmin = await req(`/admin/users/${adminId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(deleteLastAdmin.status === 400, '7.3 Last active admin cannot be deleted (400 Bad Request)', deleteLastAdmin.data);

  // 8. Audit Logs check
  const logsRes = await req('/admin/logs', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(logsRes.status === 200 && Array.isArray(logsRes.data?.logs) && logsRes.data.logs.length > 0, '8.1 Audit logs recorded and retrievable by admin', {
    totalLogs: logsRes.data?.total,
    latestAction: logsRes.data?.logs?.[0]?.action,
  });

  // Clean up test users
  await req(`/admin/users/${userId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${adminToken}` } });
  const otherId = otherReg.data?.user?.id;
  if (otherId) {
    await req(`/admin/users/${otherId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${adminToken}` } });
  }

  console.log(`\n=== RESULTS: ${passed}/${total} TESTS PASSED ===`);
  if (passed === total) {
    console.log('ALL RBAC REQUIREMENTS FULLY VERIFIED AND PASSING!\n');
  }
}

runTests().catch(console.error);
