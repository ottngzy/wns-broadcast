// WNS 排版台 · 端到端回归测试
// 运行: npm test
// 覆盖: 模板切换 / 同步开关 / 输入 / 载入示例 / 清空 / 对齐 / 字号(自动+手动+兜底) / 行距 / 导出 PNG
import { spawn } from "node:child_process";
import { mkdirSync, readdirSync, rmSync } from "node:fs";
import puppeteer from "puppeteer-core";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const PORT = 7391;
const BASE = `http://127.0.0.1:${PORT}/`;
const DL_DIR = "/tmp/wns-test-downloads";

const server = spawn("node", ["scripts/dev-server.mjs", "--port", String(PORT)], { cwd: root, stdio: "ignore" });
const wait = ms => new Promise(r => setTimeout(r, ms));
const results = [];
let failed = 0;
const check = (name, ok, extra = "") => {
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "（" + extra + "）" : ""}`);
  if (!ok) failed++;
};

try {
  await wait(1200);
  mkdirSync(DL_DIR, { recursive: true });
  rmSync(DL_DIR, { recursive: true, force: true });
  mkdirSync(DL_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: "new",
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1500, height: 950 });
  const jsErrors = [];
  page.on("pageerror", e => jsErrors.push(e.message));
  const client = await page.createCDPSession();
  await client.send("Page.setDownloadBehavior", { behavior: "allow", downloadPath: DL_DIR });

  await page.goto(BASE, { waitUntil: "networkidle0" });
  await wait(800);

  // 画布采样：文字区非白像素 / 全图非白像素
  const textPixels = () => page.evaluate(() => {
    const ctx = document.getElementById("board").getContext("2d");
    const d = ctx.getImageData(804, 230, 1060, 752).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] < 200 || d[i+1] < 200 || d[i+2] < 200) n++;
    return n;
  });
  const canvasPixels = () => page.evaluate(() => {
    const ctx = document.getElementById("board").getContext("2d");
    const d = ctx.getImageData(0, 0, 2048, 1152).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 400) if (d[i] < 240 || d[i+1] < 240 || d[i+2] < 240) n++;
    return n;
  });

  /* 1. 初始渲染 */
  check("初始渲染（男主播+示例文字）", (await textPixels()) > 5000);

  /* 2. 模板切换 */
  await page.click('[data-tpl="female"]'); await wait(600);
  check("切换到女主播", (await textPixels()) > 5000);
  const femaleText = await page.$eval("#textInput", el => el.value);
  const femaleTitle = await page.$eval("#titleInput", el => el.value);
  check("女主播默认载入原版示例", femaleText.includes("逐梦之城") && femaleTitle.includes("夜之城"));
  await page.click('[data-tpl="male"]'); await wait(600);
  check("切回男主播", (await textPixels()) > 5000);

  /* 3. 同步开关 */
  await page.click("#syncChk"); await wait(200);
  await page.type("#textInput", "【同步验证】"); await wait(400);
  await page.click('[data-tpl="female"]'); await wait(600);
  const femaleSynced = await page.$eval("#textInput", el => el.value);
  check("同步开启后两版文字一致", femaleSynced.includes("【同步验证】") && (await textPixels()) > 5000);
  await page.click("#syncChk"); await wait(200);   // 关闭同步
  await page.click('[data-tpl="male"]'); await wait(400);
  await page.type("#textInput", "【男版专属】"); await wait(400);
  await page.click('[data-tpl="female"]'); await wait(400);
  const femaleIndependent = await page.$eval("#textInput", el => el.value);
  check("关闭同步后两版独立", !femaleIndependent.includes("【男版专属】"));
  await page.click('[data-tpl="male"]'); await wait(400);

  /* 4. 载入示例 / 清空 */
  await page.click("#sampleBtn"); await wait(400);
  const maleSample = await page.$eval("#textInput", el => el.value);
  const maleSampleTitle = await page.$eval("#titleInput", el => el.value);
  check("载入示例（男版）", maleSampleTitle.includes("A之城") && maleSample.includes("红绿大乐透") && (await textPixels()) > 5000);
  await page.click("#clearBtn"); await wait(400);
  const clearedText = await page.$eval("#textInput", el => el.value);
  const clearedTitle = await page.$eval("#titleInput", el => el.value);
  check("清空输入框", clearedText === "" && clearedTitle === "");
  check("清空后画布仍显示模板背景", (await canvasPixels()) > 2500);
  await page.click("#sampleBtn"); await wait(400);

  /* 4b. 标题独立渲染 */
  await page.$eval("#titleInput", el => { el.value = "独立标题测试"; el.dispatchEvent(new Event("input")); });
  await wait(400);
  check("新闻大标题独立输入渲染", (await textPixels()) > 5000);

  /* 5. 对齐切换 */
  await page.click('[data-align="center"]'); await wait(400);
  check("居中对齐渲染", (await textPixels()) > 5000);
  await page.click('[data-align="left"]'); await wait(400);
  check("左对齐渲染", (await textPixels()) > 5000);

  /* 6. 字号：手动 + 兜底 */
  await page.click("#sizeAuto"); await wait(300);
  await page.$eval("#sizeRange", el => { el.value = 30; el.dispatchEvent(new Event("input")); }); await wait(400);
  const statusSmall = await page.$eval("#status", el => el.textContent);
  check("手动字号 30px 生效", statusSmall.includes("30px（手动）"), statusSmall);
  await page.$eval("#sizeRange", el => { el.value = 72; el.dispatchEvent(new Event("input")); }); await wait(400);
  const statusClamp = await page.$eval("#status", el => el.textContent);
  check("手动字号过大时自动兜底", statusClamp.includes("兜底"), statusClamp);
  await page.click("#sizeAuto"); await wait(300);   // 恢复自动
  check("恢复自动字号", (await textPixels()) > 5000);

  /* 7. 行距 / 标题倍数 / 段距 */
  await page.$eval("#lineRange", el => { el.value = "1.9"; el.dispatchEvent(new Event("input")); }); await wait(400);
  check("行距 1.9 渲染", (await textPixels()) > 5000);
  await page.$eval("#lineRange", el => { el.value = "1.62"; el.dispatchEvent(new Event("input")); }); await wait(300);
  await page.$eval("#titleRange", el => { el.value = "1.1"; el.dispatchEvent(new Event("input")); }); await wait(400);
  check("标题倍数 1.1 渲染", (await textPixels()) > 5000);
  await page.$eval("#titleRange", el => { el.value = "1.55"; el.dispatchEvent(new Event("input")); }); await wait(300);
  await page.$eval("#gapRange", el => { el.value = "1.2"; el.dispatchEvent(new Event("input")); }); await wait(400);
  check("段距 1.2 渲染", (await textPixels()) > 5000);
  await page.$eval("#gapRange", el => { el.value = "0.55"; el.dispatchEvent(new Event("input")); }); await wait(300);

  /* 7b. 全角星号加粗兼容 */
  const greenPixels = () => page.evaluate(() => {
    const ctx = document.getElementById("board").getContext("2d");
    const d = ctx.getImageData(804, 230, 1060, 752).data;
    let n = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] < 60 && d[i+1] > 70 && d[i+1] < 170 && d[i+2] < 140) n++;
    return n;
  });
  await page.$eval("#textInput", el => { el.value = "全角测试\n这是＊＊全角加粗＊＊标记"; el.dispatchEvent(new Event("input")); });
  await wait(400);
  check("全角＊＊加粗标记被识别", (await greenPixels()) > 500, `绿色像素 ${await greenPixels()}`);
  await page.click("#sampleBtn"); await wait(400);
  await page.$eval("#titleInput", el => { el.value = "持久化验证标题"; el.dispatchEvent(new Event("input")); });
  await wait(300);

  /* 8. 导出 PNG：拦截 toBlob 验证产物 */
  const exportInfo = await page.evaluate(() => new Promise(res => {
    const orig = HTMLCanvasElement.prototype.toBlob;
    let done = false;
    HTMLCanvasElement.prototype.toBlob = function(cb, type, ...rest) {
      orig.call(this, b => { window.__exportBlob = b; done = true; cb && cb(b); }, type, ...rest);
    };
    document.getElementById("exportBtn").click();
    const t = setInterval(() => {
      if (done) { clearInterval(t); res({ size: window.__exportBlob.size, type: window.__exportBlob.type }); }
    }, 100);
    setTimeout(() => { clearInterval(t); res(null); }, 5000);
  }));
  check("导出 PNG（toBlob 产物）", !!exportInfo && exportInfo.type === "image/png" && exportInfo.size > 100000,
    exportInfo ? `${(exportInfo.size/1024).toFixed(0)}KB` : "无产物");

  /* 8b. 窄窗口布局：按钮不被正文输入框遮挡 */
  await page.setViewport({ width: 658, height: 1430 });
  await page.reload({ waitUntil: "networkidle0" }); await wait(600);
  const covered = await page.evaluate(() => {
    const ta = document.getElementById("textInput").getBoundingClientRect();
    const btn = document.getElementById("exportBtn").getBoundingClientRect();
    return ta.bottom > btn.top + 2;
  });
  check("窄窗口布局：按钮不被正文遮挡", !covered);
  await page.setViewport({ width: 1500, height: 950 });

  /* 9. 刷新后设置与文字持久化 */
  await page.reload({ waitUntil: "networkidle0" }); await wait(800);
  const persisted = await page.$eval("#textInput", el => el.value);
  const persistedTitle = await page.$eval("#titleInput", el => el.value);
  check("刷新后文字持久化", persisted.includes("红绿大乐透") && persistedTitle.includes("持久化验证标题"), persistedTitle.slice(0, 15));
  const alignPersisted = await page.$eval("#alignSeg .seg-btn.active", el => el.dataset.align);
  check("刷新后对齐设置持久化", alignPersisted === "left", alignPersisted);

  check("全程无 JS 错误", jsErrors.length === 0, jsErrors.join(" | ").slice(0, 120));
  await browser.close();
} catch (e) {
  check("测试执行异常", false, e.message);
} finally {
  server.kill();
}

console.log("\n===== WNS 排版台回归测试 =====");
console.log(results.join("\n"));
console.log(`==============================${failed === 0 ? "\n全部通过 ✓" : `\n${failed} 项失败 ✗`}`);
process.exit(failed === 0 ? 0 : 1);
