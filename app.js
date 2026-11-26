/* WNS 财经台排版台
 * 画布与模板同尺寸 2848×1600，文字区坐标来自对模板图的像素级检测：
 * 边框左缘 x≈1050 / 顶缘 y≈237 / 底缘 y≈1414 / 右侧装饰条 x≈2698-2746
 * 安全文字区：x 1150→2600，y 320→1360
 */

const W = 2848, H = 1600;
const TEXT_X = 1150, TEXT_Y = 320, TEXT_W = 1450, TEXT_H = 1040;

const TPL = {
  male:   "assets/anchor-male.png",
  female: "assets/anchor-female.png",
};

const FONT_STACK = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif';
const COLOR_BODY = "#1e2b26";
const COLOR_BOLD = "#0b6e54";

const SAMPLE_TITLE = "早上好，A之城！";
const SAMPLE_BODY = `昨天的红绿大乐透，最后的结果是满打满算的整整——**零点一八点！** 多亏了没完没了的缩量阴跌，光尾盘就挂了半个城。但有一条防线也挂了，**3476.65**，我看你们全得盯紧，因为主力肯定咽不下这口气。沪深两市再次缩量，量能又遭人破坏，还是那帮观望资金干的好事。与此同时，割肉军团还在K线图上替爆仓的受害者收尸。而在3436呢……好吧……3436还是那个3436。我是你们的铁哥们斯坦。和我一起，开始逐梦之城的新一天吧。

【明日天气预报】
开盘收回 3476.65 上方 → 缓刑一天，不是无罪释放，看收盘。
开盘在 3476.65 下方磨 → 执行首批 1/12 档，不加码，剩下 5/6 接着拿。
低开直接砸到 3436 附近 → 加速段到了，分两笔走，别一笔割在最低。

明天风险高，不等于明天该多减。风险高，对应的是"按预设执行"，不是"加倍恐慌"。我是你们的铁哥们斯坦。**纪律代替情绪，明早集合竞价见。**`;

const SAMPLE_FEMALE_TITLE = "你好啊，夜之城！";
const SAMPLE_FEMALE_BODY = `我是你的斯坦利，咱们的逐梦之城又开始了新的一天。我爱这座城市，就像你爱你的老妈——想当年她把你扔到孤儿院门口，如今走到街上碰到你，管你要烟抽。每过一天，这里就会多出百八十个新来的，但里头只有一半能熬上一年，还得是赶上好年头才行。他们为什么上赶着来夜之城呢？还不是想当摩根·黑手或者韦兰·老蛇那样的街头武士。有这么一句话，记住了，叫**饿死胆小的，撑死胆大的。**只可惜，人怕出名猪怕壮，活得越过瘾，这人也就越短命——这还不算有人一枪把你天灵盖给掀了。夜之城的传奇人物，你知道在哪扎堆吗？**坟地里！** 在咱们这个地界，英雄不看出身，就看你能不能踩出自己的道了。这就是夜之城，这就是**逐梦之城！**`;

/* 每个主播模板独立保存「标题+正文」，互不干扰，并用 localStorage 持久化 */
const STORE_KEY = { male: "wns_text_male", female: "wns_text_female" };
const TITLE_KEY = { male: "wns_title_male", female: "wns_title_female" };

/* 旧数据迁移：没有独立标题键时，把原稿首行提为标题 */
function loadTexts(tKey, bKey, sampleTitle, sampleBody) {
  const t = localStorage.getItem(tKey);
  const b = localStorage.getItem(bKey);
  if (t !== null) return { title: t, body: b ?? "" };
  if (b !== null) {
    const firstLineEnd = b.indexOf("\n");
    if (firstLineEnd === -1) return { title: b, body: "" };
    return { title: b.slice(0, firstLineEnd), body: b.slice(firstLineEnd + 1) };
  }
  return { title: sampleTitle, body: sampleBody };
}

const texts = {
  male:   loadTexts(TITLE_KEY.male,   STORE_KEY.male,   SAMPLE_TITLE,        SAMPLE_BODY),
  female: loadTexts(TITLE_KEY.female, STORE_KEY.female, SAMPLE_FEMALE_TITLE, SAMPLE_FEMALE_BODY),
};

function persistText() {
  localStorage.setItem(STORE_KEY[currentTpl], input.value);
  localStorage.setItem(TITLE_KEY[currentTpl], titleInput.value);
}
function persistAll() {
  for (const k of ["male", "female"]) {
    localStorage.setItem(STORE_KEY[k], texts[k].body);
    localStorage.setItem(TITLE_KEY[k], texts[k].title);
  }
}

/* 同步开关：开启后两版共用一份标题+正文 */
const syncChk = document.getElementById("syncChk");
let syncMode = localStorage.getItem("wns_sync") === "1";
syncChk.checked = syncMode;

function saveCurrentText() {
  if (syncMode) {
    texts.male = texts.female = { title: titleInput.value, body: input.value };
    persistAll();
  } else {
    texts[currentTpl] = { title: titleInput.value, body: input.value };
    persistText();
  }
}

/* 排版控制：字号（自动/手动）、行距、标题倍数、段距、对齐 */
const sizeAutoChk = document.getElementById("sizeAuto");
const sizeRange = document.getElementById("sizeRange");
const sizeVal = document.getElementById("sizeVal");
const lineRange = document.getElementById("lineRange");
const lineVal = document.getElementById("lineVal");
const titleRange = document.getElementById("titleRange");
const titleVal = document.getElementById("titleVal");
const gapRange = document.getElementById("gapRange");
const gapVal = document.getElementById("gapVal");

function loadSetting(key, fallback) { return localStorage.getItem(key) ?? fallback; }
sizeAutoChk.checked = loadSetting("wns_size_auto", "1") === "1";
sizeRange.value = loadSetting("wns_size", "44");
lineRange.value = loadSetting("wns_lineh", "1.62");
titleRange.value = loadSetting("wns_title", "1.55");
gapRange.value = loadSetting("wns_gap", "0.55");
sizeRange.disabled = sizeAutoChk.checked;
const savedAlign = loadSetting("wns_align", "left");
document.querySelectorAll("#alignSeg .seg-btn").forEach(b => b.classList.toggle("active", b.dataset.align === savedAlign));
function refreshCtlLabels() {
  sizeVal.textContent = sizeRange.value + "px";
  lineVal.textContent = parseFloat(lineRange.value).toFixed(2);
  titleVal.textContent = parseFloat(titleRange.value).toFixed(2) + "×";
  gapVal.textContent = parseFloat(gapRange.value).toFixed(2);
}
refreshCtlLabels();

sizeAutoChk.addEventListener("change", () => {
  sizeRange.disabled = sizeAutoChk.checked;
  localStorage.setItem("wns_size_auto", sizeAutoChk.checked ? "1" : "0");
  draw();
});
sizeRange.addEventListener("input", () => { refreshCtlLabels(); localStorage.setItem("wns_size", sizeRange.value); scheduleRender(); });
lineRange.addEventListener("input", () => { refreshCtlLabels(); localStorage.setItem("wns_lineh", lineRange.value); scheduleRender(); });
titleRange.addEventListener("input", () => { refreshCtlLabels(); localStorage.setItem("wns_title", titleRange.value); scheduleRender(); });
gapRange.addEventListener("input", () => { refreshCtlLabels(); localStorage.setItem("wns_gap", gapRange.value); scheduleRender(); });
document.getElementById("alignSeg").addEventListener("click", e => {
  const btn = e.target.closest(".seg-btn");
  if (!btn) return;
  document.querySelectorAll("#alignSeg .seg-btn").forEach(b => b.classList.toggle("active", b === btn));
  localStorage.setItem("wns_align", btn.dataset.align);
  draw();
});

const canvas = document.getElementById("board");
const ctx = canvas.getContext("2d");
const input = document.getElementById("textInput");
const titleInput = document.getElementById("titleInput");
const statusEl = document.getElementById("status");

let currentTpl = "male";
const tplImg = {};
let renderTimer = null;

function loadImage(key) {
  return new Promise((resolve, reject) => {
    if (tplImg[key]) return resolve(tplImg[key]);
    const img = new Image();
    img.onload = () => { tplImg[key] = img; resolve(img); };
    img.onerror = reject;
    img.src = TPL[key];
  });
}

/* 把一段文本按 **加粗** 标记拆成段；兼容全角 ＊＊ 输入 */
function parseLine(line) {
  line = line.replace(/＊＊/g, "**");
  const segs = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0, m;
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) segs.push({ text: line.slice(last, m.index), bold: false });
    segs.push({ text: m[1], bold: true });
    last = m.index + m[0].length;
  }
  if (last < line.length) segs.push({ text: line.slice(last), bold: false });
  return segs;
}

/* 贪心换行：逐字测量，兼容中英文混排 */
function wrapSegments(ctx, segs, maxWidth) {
  const lines = [];
  let cur = [];
  let curW = 0;
  const pushCur = () => { lines.push(cur); cur = []; curW = 0; };
  for (const seg of segs) {
    for (const ch of seg.text) {
      const w = ctx.measureText(ch).width;
      if (curW + w > maxWidth && cur.length) { pushCur(); }
      cur.push({ ch, bold: seg.bold, w });
      curW += w;
    }
  }
  if (cur.length) pushCur();
  return lines;
}

function layout(ctx, title, body, fontSize, lineFactor, titleFactor, gapFactor) {
  const lineH = fontSize * lineFactor;
  const blocks = []; // {type:'title'|'para'|'gap', lines:[[{ch,bold,w}...],...], size, lineH}
  if (title.trim()) {
    const titleSize = fontSize * titleFactor;
    ctx.font = `700 ${titleSize}px ${FONT_STACK}`;
    const wrapped = wrapSegments(ctx, parseLine(title), TEXT_W);
    blocks.push({ type: "title", lines: wrapped, size: titleSize, lineH: lineH * 1.15 });
  }
  body.split("\n").forEach(raw => {
    const line = raw.trimEnd();
    if (!line.trim()) { blocks.push({ type: "gap", h: lineH * gapFactor }); return; }
    ctx.font = `500 ${fontSize}px ${FONT_STACK}`;
    const wrapped = wrapSegments(ctx, parseLine(line), TEXT_W);
    blocks.push({ type: "para", lines: wrapped, size: fontSize, lineH });
  });
  return blocks;
}

function blocksHeight(blocks) {
  return blocks.reduce((s, b) => s + (b.type === "gap" ? b.h : b.lineH * b.lines.length), 0);
}

function fitFontSize(ctx, title, body, lineFactor, titleFactor, gapFactor) {
  let lo = 20, hi = 72, best = 20;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (blocksHeight(layout(ctx, title, body, mid, lineFactor, titleFactor, gapFactor)) <= TEXT_H) { best = mid; lo = mid + 1; }
    else hi = mid - 1;
  }
  return best;
}

function draw() {
  const img = tplImg[currentTpl];
  const text = input.value;
  const title = titleInput.value;
  ctx.clearRect(0, 0, W, H);
  ctx.drawImage(img, 0, 0, W, H);
  if (!text.trim() && !title.trim()) { setStatus("等待输入…"); return; }

  const lineFactor = parseFloat(lineRange.value);
  const titleFactor = parseFloat(titleRange.value);
  const gapFactor = parseFloat(gapRange.value);
  const auto = sizeAutoChk.checked;
  const fit = fitFontSize(ctx, title, text, lineFactor, titleFactor, gapFactor);
  const fontSize = auto ? fit : Math.min(parseInt(sizeRange.value, 10), fit);
  const blocks = layout(ctx, title, text, fontSize, lineFactor, titleFactor, gapFactor);
  const activeAlignBtn = document.querySelector("#alignSeg .seg-btn.active");
  const align = activeAlignBtn ? activeAlignBtn.dataset.align : "left";
  let y = TEXT_Y;
  for (const b of blocks) {
    if (b.type === "gap") { y += b.h; continue; }
    for (const line of b.lines) {
      y += b.lineH;
      const lineW = line.reduce((s, c) => s + c.w, 0);
      let x = align === "center" ? TEXT_X + (TEXT_W - lineW) / 2 : TEXT_X;
      const baseY = y - b.lineH * 0.28;
      // 按 bold 分组绘制，减少状态切换
      let run = [], runBold = line.length ? line[0].bold : false;
      const flush = () => {
        if (!run.length) return;
        ctx.font = `${runBold ? 700 : 500} ${b.size}px ${FONT_STACK}`;
        ctx.fillStyle = runBold ? COLOR_BOLD : COLOR_BODY;
        ctx.fillText(run.map(c => c.ch).join(""), x, baseY);
        x += run.reduce((s, c) => s + c.w, 0);
        run = [];
      };
      for (const c of line) {
        if (c.bold !== runBold) { flush(); runBold = c.bold; }
        run.push(c);
      }
      flush();
    }
  }
  const clamped = !auto && parseInt(sizeRange.value, 10) > fit;
  const titleNote = title.trim() ? "" : " · 无标题";
  setStatus(`已排版 · 字号 ${fontSize}px${auto ? "（自动）" : clamped ? `（手动偏大，已兜底至 ${fit}px）` : "（手动）"}${titleNote} · ${currentTpl === "male" ? "男主播" : "女主播"}`);
}

function setStatus(msg) { statusEl.textContent = msg; }

function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(draw, 120);
}

/* 导出 PNG */
function exportPNG() {
  canvas.toBlob(blob => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `WNS晨间播报_${currentTpl === "male" ? "男主播" : "女主播"}.png`;
    document.body.appendChild(a);   // 确保无头/嵌入式环境也能触发下载
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 3000);
    setStatus("已导出 PNG ✓");
  }, "image/png");
}

/* 事件 */
document.getElementById("tplSeg").addEventListener("click", async e => {
  const btn = e.target.closest(".seg-btn");
  if (!btn || btn.dataset.tpl === currentTpl) return;
  saveCurrentText();   // 保存当前模板（同步模式下两版一起保存）
  document.querySelectorAll("#tplSeg .seg-btn").forEach(b => b.classList.toggle("active", b === btn));
  currentTpl = btn.dataset.tpl;
  await loadImage(currentTpl);
  input.value = texts[currentTpl].body;    // 恢复目标模板自己的正文
  titleInput.value = texts[currentTpl].title;
  draw();
});
input.addEventListener("input", () => { saveCurrentText(); scheduleRender(); });
titleInput.addEventListener("input", () => { saveCurrentText(); scheduleRender(); });
syncChk.addEventListener("change", () => {
  syncMode = syncChk.checked;
  localStorage.setItem("wns_sync", syncMode ? "1" : "0");
  saveCurrentText();
  setStatus(syncMode ? "已开启同步：两版共用标题与正文" : "已关闭同步：两版文字各自独立");
});
document.getElementById("exportBtn").addEventListener("click", exportPNG);
document.getElementById("sampleBtn").addEventListener("click", () => {
  const s = currentTpl === "male"
    ? { title: SAMPLE_TITLE, body: SAMPLE_BODY }
    : { title: SAMPLE_FEMALE_TITLE, body: SAMPLE_FEMALE_BODY };
  titleInput.value = s.title;
  input.value = s.body;
  saveCurrentText();
  draw();
});
document.getElementById("clearBtn").addEventListener("click", () => {
  titleInput.value = ""; input.value = "";
  saveCurrentText(); draw();
});

/* 初始化 */
(async () => {
  input.value = texts[currentTpl].body;
  titleInput.value = texts[currentTpl].title;
  await loadImage(currentTpl);
  await document.fonts.ready;
  draw();
})();
