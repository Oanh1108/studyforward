const puppeteer = require("puppeteer");
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  page.on("console", msg => {
    if (msg.type() === "error" || msg.text().includes("Warning:")) {
      console.log("PAGE ERROR:", msg.text());
    }
  });
  
  await page.goto("http://127.0.0.1:3000/login", { waitUntil: "networkidle2" });
  await page.type("input[type=email]", "test123456@test.com");
  await page.type("input[type=password]", "password123");
  await page.click("button[type=submit]");
  
  await new Promise(r => setTimeout(r, 2000));
  
  // Navigate to vocabulary
  await page.goto("http://127.0.0.1:3000/vocabulary/study?folderId=6", { waitUntil: "networkidle2" });
  await new Promise(r => setTimeout(r, 3000));
  
  await browser.close();
})();
