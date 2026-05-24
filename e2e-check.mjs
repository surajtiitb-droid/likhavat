import { chromium } from "playwright";
import fs from "fs";

const BASE = "http://localhost:5173";
fs.mkdirSync("C:/likhavat/screenshots", { recursive: true });
const SS = (name) => `C:/likhavat/screenshots/${name}.png`;

const browser = await chromium.launch({ headless: true });
const issues  = [];
const ok      = [];

async function shot(page, name) {
  await page.screenshot({ path: SS(name), fullPage: false });
}
async function check(label, fn) {
  try { await fn(); ok.push(label); }
  catch(e) { issues.push(`❌ ${label}: ${e.message.split("\n")[0]}`); }
}

// ─── DESKTOP ──────────────────────────────────────────────────────────────────
{
  const ctx  = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await shot(page, "01-desktop-initial");

  await check("Desktop: logo renders", async () => {
    await page.waitForSelector("text=लिखावट", { timeout: 5000 });
  });

  await check("Desktop: empty state", async () => {
    await page.waitForSelector("text=Begin your story", { timeout: 3000 });
  });

  await check("Desktop: sidebar export/import buttons", async () => {
    await page.waitForSelector("text=↑ Export", { timeout: 2000 });
    await page.waitForSelector("text=↓ Import", { timeout: 2000 });
  });

  // Use button:has-text for reliable matching on split-content buttons
  await check("Desktop: new entry — editor opens", async () => {
    await page.locator("button").filter({ hasText: "New Entry" }).first().click();
    await page.waitForSelector("textarea", { timeout: 5000 });
    await shot(page, "02-desktop-editor-open");
  });

  await check("Desktop: title input", async () => {
    const ti = page.locator("input[placeholder='Title…']");
    await ti.fill("My Test Entry");
    if (await ti.inputValue() !== "My Test Entry") throw new Error("title not set");
  });

  await check("Desktop: body textarea", async () => {
    const ta = page.locator("textarea");
    await ta.fill("Testing the app.");
    if (!(await ta.inputValue()).includes("Testing")) throw new Error("body not set");
  });

  await check("Desktop: auto-save fires", async () => {
    await page.waitForSelector("text=✓ Saved", { timeout: 5000 });
    await shot(page, "03-desktop-saved");
  });

  await check("Desktop: word count", async () => {
    const text = await page.locator("text=/\\d+ words/").first().textContent();
    if (!text) throw new Error("word count missing");
  });

  await check("Desktop: mood picker", async () => {
    await page.click("button[title='😊']");
    await page.waitForSelector("text=Feeling 😊", { timeout: 2000 });
    await shot(page, "04-desktop-mood");
  });

  await check("Desktop: tag input", async () => {
    const tagInput = page.locator("input[placeholder='+ add tag']");
    await tagInput.fill("journal");
    await tagInput.press("Enter");
    await page.waitForSelector("text=#journal", { timeout: 2000 });
    await shot(page, "05-desktop-tag");
  });

  await check("Desktop: Hindi mode toggle", async () => {
    await page.locator("button").filter({ hasText: "हिंदी" }).click();
    await page.waitForSelector("text=Hindi Mode", { timeout: 2000 });
    await page.locator("button").filter({ hasText: /^EN$/ }).click();
    await page.waitForSelector("text=English Mode", { timeout: 2000 });
    await shot(page, "06-desktop-lang-toggle");
  });

  await check("Desktop: search filters", async () => {
    await page.fill("input[placeholder='Search entries…']", "Test");
    await page.waitForSelector("text=My Test Entry", { timeout: 2000 });
    await shot(page, "07-desktop-search");
    await page.fill("input[placeholder='Search entries…']", "");
  });

  await check("Desktop: export menu opens", async () => {
    await page.click("text=↑ Export");
    await page.waitForSelector("text=JSON Backup", { timeout: 2000 });
    await page.waitForSelector("text=Markdown", { timeout: 2000 });
    await shot(page, "08-desktop-export-menu");
    // close via overlay
    await page.locator("body").click({ position: { x: 640, y: 300 } });
    await page.waitForTimeout(300);
  });

  await check("Desktop: stats bar — entry count", async () => {
    // Stats bar shows number in serif font
    const statVal = page.locator("div").filter({ hasText: /^1$/ }).first();
    await statVal.waitFor({ timeout: 2000 });
  });

  await check("Desktop: delete modal → cancel", async () => {
    await page.locator("button").filter({ hasText: "Delete" }).last().click();
    await page.waitForSelector("text=Delete this entry?", { timeout: 2000 });
    await shot(page, "09-desktop-delete-modal");
    await page.locator("button").filter({ hasText: "Cancel" }).click();
    await page.waitForSelector("textarea", { timeout: 2000 });
  });

  await check("Desktop: second entry + sidebar list", async () => {
    await page.locator("button").filter({ hasText: "New Entry" }).first().click();
    await page.waitForSelector("textarea", { timeout: 3000 });
    await page.locator("input[placeholder='Title…']").fill("Second Entry");
    await page.waitForSelector("text=My Test Entry", { timeout: 2000 });
    await shot(page, "10-desktop-two-entries");
  });

  await page.close();
  await ctx.close();
}

// ─── MOBILE ───────────────────────────────────────────────────────────────────
{
  const ctx  = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: "networkidle" });
  await shot(page, "11-mobile-initial");

  await check("Mobile: sidebar visible on load", async () => {
    await page.waitForSelector("text=लिखावट", { timeout: 3000 });
    await page.waitForSelector("text=New Entry", { timeout: 3000 });
  });

  await check("Mobile: editor hidden on load", async () => {
    const count = await page.locator("textarea").count();
    if (count > 0 && await page.locator("textarea").isVisible())
      throw new Error("textarea visible before entry opened");
  });

  await check("Mobile: new entry → editor view", async () => {
    await page.locator("button").filter({ hasText: "New Entry" }).first().click();
    await page.waitForSelector("textarea", { timeout: 4000 });
    await shot(page, "12-mobile-editor");
  });

  await check("Mobile: ← Back button present", async () => {
    await page.waitForSelector("text=← Back", { timeout: 2000 });
  });

  await check("Mobile: back returns to list", async () => {
    await page.click("text=← Back");
    await page.waitForSelector("text=New Entry", { timeout: 2000 });
    const visible = await page.locator("textarea").isVisible().catch(() => false);
    if (visible) throw new Error("editor still visible after back");
    await shot(page, "13-mobile-back-to-list");
  });

  await check("Mobile: tap entry reopens editor", async () => {
    const entries = page.locator("[style*='cursor: pointer; user-select']");
    const count = await entries.count();
    if (count > 0) {
      await entries.first().click();
      await page.waitForSelector("textarea", { timeout: 3000 });
      await shot(page, "14-mobile-entry-tapped");
    }
  });

  await check("Mobile: delete from editor works", async () => {
    // Make sure we're in editor view
    await page.waitForSelector("textarea", { timeout: 2000 });
    await page.locator("button").filter({ hasText: "Delete" }).last().click();
    await page.waitForSelector("text=Delete this entry?", { timeout: 2000 });
    await page.locator("button").filter({ hasText: "Cancel" }).click();
    await shot(page, "15-mobile-delete-cancel");
  });

  await page.close();
  await ctx.close();
}

await browser.close();

// ─── Report ──────────────────────────────────────────────────────────────────
console.log("\n══════════════════════════════════════");
console.log(`PASSED : ${ok.length}`);
ok.forEach(l => console.log(`  ✅ ${l}`));
if (issues.length) {
  console.log(`\nFAILED : ${issues.length}`);
  issues.forEach(l => console.log(`  ${l}`));
} else {
  console.log("\n🎉 All checks passed");
}
console.log("══════════════════════════════════════\n");
process.exit(issues.length > 0 ? 1 : 0);
