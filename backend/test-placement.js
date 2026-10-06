const fetch = require("node-fetch");
(async () => {
  let res = await fetch("http://localhost:3002/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Test User", email: "test12345@test.com", password: "password123" })
  });
  let data = await res.json();
  let token = data.accessToken;
  if (!token) {
    res = await fetch("http://localhost:3002/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test12345@test.com", password: "password123" })
    });
    data = await res.json();
    token = data.accessToken;
  }
  console.log("Token:", !!token);

  res = await fetch("http://localhost:3002/placement-test/questions", {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log("Questions status:", res.status);
  console.log("Questions data:", (await res.text()).substring(0, 100));

  res = await fetch("http://localhost:3002/placement-test/history", {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log("History status:", res.status);
  console.log("History data:", (await res.text()).substring(0, 100));
})();
