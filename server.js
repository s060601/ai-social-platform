console.log("🔥 server.js 已启动");

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const port = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "yuyi-dev-secret";

// ── User store (persistent JSON file) ───────────────────────────────────────────
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERS_FILE = path.join(__dirname, "users.json");

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString("hex");
}
function verifyPassword(password, salt, hash) {
  const test = hashPassword(password, salt);
  const a = Buffer.from(test, "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function makeUser({ id, username, password, role, name }) {
  const salt = crypto.randomBytes(16).toString("hex");
  return { id, username, salt, passwordHash: hashPassword(password, salt), role, name };
}

let USERS = [];
function loadUsers() {
  try {
    USERS = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
    // Migrate any legacy plaintext records
    let migrated = false;
    USERS = USERS.map((u) => {
      if (u.password && !u.passwordHash) {
        migrated = true;
        const salt = crypto.randomBytes(16).toString("hex");
        return { id: u.id, username: u.username, salt, passwordHash: hashPassword(u.password, salt), role: u.role, name: u.name };
      }
      return u;
    });
    if (migrated) saveUsers();
  } catch {
    USERS = [
      makeUser({ id: 1, username: "student001", password: "pass123", role: "student", name: "小明" }),
      makeUser({ id: 2, username: "teacher001", password: "pass123", role: "teacher", name: "王老师" }),
      makeUser({ id: 3, username: "parent001",  password: "pass123", role: "parent",  name: "小明家长" }),
    ];
    saveUsers();
  }
}
function saveUsers() {
  fs.writeFileSync(USERS_FILE, JSON.stringify(USERS, null, 2), "utf-8");
}
loadUsers();

// ── Session & Note stores ─────────────────────────────────────────────────────
const SESSIONS_FILE = path.join(__dirname, "sessions.json");
const NOTES_FILE = path.join(__dirname, "notes.json");
let SESSIONS = [];
let NOTES = [];
function loadSessions() { try { SESSIONS = JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8")); } catch { SESSIONS = []; } }
function saveSessions() { fs.writeFileSync(SESSIONS_FILE, JSON.stringify(SESSIONS, null, 2), "utf-8"); }
function loadNotes() { try { NOTES = JSON.parse(fs.readFileSync(NOTES_FILE, "utf-8")); } catch { NOTES = []; } }
function saveNotes() { fs.writeFileSync(NOTES_FILE, JSON.stringify(NOTES, null, 2), "utf-8"); }
loadSessions();
loadNotes();

// ── CAPTCHA store (in-memory, 5 min TTL, one-time use) ─────────────────────────────
const EMOJI_POOL = [
  { emoji: "🐱", label: "小猫" }, { emoji: "🐶", label: "小狗" }, { emoji: "🐰", label: "小兔" },
  { emoji: "🐼", label: "熊猫" }, { emoji: "🦊", label: "狐狸" }, { emoji: "🐸", label: "青蛙" },
  { emoji: "🐧", label: "企鹅" }, { emoji: "🦁", label: "狮子" }, { emoji: "🐯", label: "老虎" },
  { emoji: "🦄", label: "独角兽" }, { emoji: "🐮", label: "小牛" }, { emoji: "🐷", label: "小猪" },
  { emoji: "🐙", label: "章鱼" }, { emoji: "🦋", label: "蝴蝶" }, { emoji: "🐻", label: "小熊" },
  { emoji: "🐠", label: "小鱼" }, { emoji: "🐨", label: "考拉" }, { emoji: "🦔", label: "刺猬" },
];
function shuffleArr(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const captchas = new Map();
function issueCaptcha() {
  const pool = shuffleArr(EMOJI_POOL).slice(0, 9);
  const target = pool[Math.floor(Math.random() * 9)];
  const id = crypto.randomBytes(8).toString("hex");
  captchas.set(id, { answer: target.emoji, expires: Date.now() + 5 * 60 * 1000 });
  return { id, emojis: pool, target };
}
function consumeCaptcha(id, answer) {
  const item = captchas.get(id);
  if (!item) return false;
  captchas.delete(id);
  if (Date.now() > item.expires) return false;
  return String(answer) === item.answer;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of captchas) if (now > v.expires) captchas.delete(k);
}, 60 * 1000).unref?.();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: process.env.OPENAI_BASE_URL,
});

function safeParseJSON(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

app.get("/", (req, res) => {
  res.send("backend is running");
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "server is running" });
});

app.get("/api/voice/coze-config", (req, res) => {
  const cozeAccessToken = process.env.COZE_ACCESS_TOKEN?.trim();
  const cozeBotId = process.env.COZE_BOT_ID?.trim();

  if (!cozeAccessToken || !cozeBotId) {
    return res.status(500).json({
      error: "Coze realtime config missing",
      detail: "请检查 COZE_ACCESS_TOKEN 和 COZE_BOT_ID 是否已配置",
    });
  }

  res.json({
    baseURL: process.env.COZE_BASE_URL?.trim() || "https://api.coze.cn",
    accessToken: cozeAccessToken,
    botId: cozeBotId,
    voiceId: process.env.COZE_VOICE_ID?.trim() || "",
    connectorId: process.env.COZE_CONNECTOR_ID?.trim() || "1024",
  });
});

app.post("/api/voice/feedback", async (req, res) => {
  try {
    const { sceneTitle, sceneRole, sceneHint, userReply } = req.body;

    if (!sceneTitle || !userReply) {
      return res.status(400).json({ error: "missing sceneTitle or userReply" });
    }

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "你是孤独症青少年社会技能训练中的即时反馈助手。你正在使用 DeepSeek 评价真实语音对话。只输出 JSON，不要 markdown。反馈必须根据用户刚刚说的具体内容写，不能使用固定模板，不能空泛夸奖。",
        },
        {
          role: "user",
          content: `场景：${sceneTitle}
对话对象：${sceneRole || "场景角色"}
训练目标：${sceneHint || "练习真实社交表达"}
用户刚说：${userReply}

请给出即时评价和一句更好的示范表达。
要求：
1. feedback 写 1-2 句，必须点出用户这句话具体哪里清楚或哪里还缺一点。
2. example 必须是用户下一次可以直接说出口的一句话。
3. score 按当前这句话在该场景里的社交适切度给 0-100。
4. clarity、relevance、initiative 分别按 0-100 评价表达清晰、贴合情境、主动延续。
输出格式：
{
  "score": 0,
  "clarity": 0,
  "relevance": 0,
  "initiative": 0,
  "feedback": "...",
  "example": "..."
}`,
        },
      ],
      temperature: 0.3,
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() || "";
    const parsed = safeParseJSON(raw);

    res.json(
      parsed || {
        score: 78,
        clarity: 75,
        relevance: 75,
        initiative: 70,
        feedback: "这句话已经表达了意思，可以再更清楚一点。",
        example: userReply,
      },
    );
  } catch (error) {
    console.error("/api/voice/feedback error:", error);
    res.status(500).json({ error: "voice feedback failed", detail: error?.message || "unknown error" });
  }
});

app.post("/api/voice/summary", async (req, res) => {
  try {
    const { sceneTitle, sceneRole, sceneHint, messages } = req.body;

    if (!sceneTitle || !Array.isArray(messages)) {
      return res.status(400).json({ error: "missing sceneTitle or messages" });
    }

    const transcript = messages
      .map((m) => `${m.sender === "me" ? "用户" : "AI"}：${m.text}`)
      .join("\n");

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "你是孤独症青少年社会技能训练总结助手。你正在使用 DeepSeek 根据完整通话记录生成训练反馈。只输出 JSON，不要 markdown。必须引用本次对话中的具体表现，不能写成固定模板，不能诊断用户。",
        },
        {
          role: "user",
          content: `场景：${sceneTitle}
对话对象：${sceneRole || "场景角色"}
训练目标：${sceneHint || "练习真实社交表达"}
对话记录：
${transcript}

请总结本次语音社交练习。要求：
1. summary 写 4-6 句，说明本次发生了什么、用户如何回应、对话有没有自然推进、哪里还可以更像真实社交。
2. strength 写 2-3 个具体优点，必须结合对话记录里的表达，不要只说“很好”。
3. nextStep 写 2-3 条下一次可以练习的具体方向，并给出一个可直接模仿的小句子。
4. score 按 0-100 给出参考分。
5. clarity、relevance、initiative 分别按 0-100 评价表达清晰、贴合情境、主动延续。
输出格式：
{
  "score": 0,
  "clarity": 0,
  "relevance": 0,
  "initiative": 0,
  "summary": "...",
  "strength": "...",
  "nextStep": "..."
}`,
        },
      ],
      temperature: 0.3,
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() || "";
    const parsed = safeParseJSON(raw);

    res.json(
      parsed || {
        score: 80,
        clarity: 78,
        relevance: 80,
        initiative: 72,
        summary: "本次练习完成了一轮基本交流。用户能够围绕当前场景作出回应，表达出自己的想法，也能让对方理解大致意思。整体上，交流方向是清楚的，但还可以继续练习把原因、需求和下一步安排说得更完整。",
        strength: "能够接住对方的话题，并用比较礼貌的方式回应；表达中有明确的信息点，适合继续练习真实场景沟通。",
        nextStep: "下一次可以尝试加入一个具体原因和一个后续问题，例如：我今天完成了大部分，还有一题不确定，明天可以请您帮我看一下吗？",
      },
    );
  } catch (error) {
    console.error("/api/voice/summary error:", error);
    res.status(500).json({ error: "voice summary failed", detail: error?.message || "unknown error" });
  }
});

app.post("/api/voice/suggestion", async (req, res) => {
  try {
    const { sceneTitle, sceneRole, sceneHint, messages } = req.body;

    if (!sceneTitle) {
      return res.status(400).json({ error: "missing sceneTitle" });
    }

    const transcript = (messages || [])
      .slice(-6)
      .map((m) => `${m.sender === "me" ? "用户" : "AI"}：${m.text}`)
      .join("\n");

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: "你是语音社交训练示范助手。只输出一句中文，口语化，适合青少年直接说。必须贴合当前角色关系和场景，不要解释。",
        },
        {
          role: "user",
          content: `当前场景：${sceneTitle}
对话对象：${sceneRole || "场景角色"}
训练目标：${sceneHint || "练习真实社交表达"}
最近对话：
${transcript}

请给用户一句可以马上说出口的示范回复。`,
        },
      ],
      temperature: 0.7,
    });

    res.json({ suggestion: completion.choices?.[0]?.message?.content?.trim() || "可以呀，我愿意试一试。" });
  } catch (error) {
    console.error("/api/voice/suggestion error:", error);
    res.status(500).json({ error: "voice suggestion failed", detail: error?.message || "unknown error" });
  }
});



app.post("/api/chat", async (req, res) => {
  try {
    const { sceneTitle, sceneHint, starter, messages } = req.body;

    if (!sceneTitle || !starter || !Array.isArray(messages)) {
      return res.status(400).json({ error: "参数不完整" });
    }

    const systemPrompt = `
你是一个“沟通练习”产品中的互动角色。
你的目标不是闲聊，而是帮助用户练习社交表达。

要求：
1. 你要扮演场景中的对话对象。
2. 回复要自然、简短、口语化，不要像老师讲课。
3. 一次最多 1-2 句话。
4. 不要输出“AI：”“建议：”“评分：”这类标签。
5. 不要长篇说教。
6. 如果用户表达不完整，也要先接住，再轻轻引导。
7. 场景名称：${sceneTitle}
8. 场景目标：${sceneHint}
9. 开场白：${starter}
`;

    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...messages.map((m) => ({
        role: m.sender === "me" ? "user" : "assistant",
        content: m.text,
      })),
    ];

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: chatMessages,
      temperature: 0.8,
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() || "我明白你的意思了。";

    res.json({ reply });
  } catch (error) {
    console.error("/api/chat error:", error);
    res.status(500).json({
      error: "对话生成失败",
      detail: error?.message || "unknown error",
    });
  }
});

app.post("/api/assist", async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "请输入内容" });
    }

    const prompt = `
你是一个聊天表达辅助工具。
用户会输入一句“自己想说但不太会说的话”，你要帮他改得更自然。

要求：
1. 输出必须是 JSON。
2. 不要输出 markdown 代码块。
3. 给出三个版本：
   - natural: 更自然
   - polite: 更礼貌
   - short: 更简短
4. 每句都要像真实聊天，不要官方腔。
5. 用户原话：${text}

输出格式：
{
  "natural": "...",
  "polite": "...",
  "short": "..."
}
`;

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() || "";
    const parsed = safeParseJSON(raw);

    if (!parsed) {
      return res.json({
        natural: text,
        polite: text + "，谢谢你。",
        short: text,
      });
    }

    res.json(parsed);
  } catch (error) {
    console.error("/api/assist error:", error);
    res.status(500).json({
      error: "辅助润色失败",
      detail: error?.message || "unknown error",
    });
  }
});

app.post("/api/score", async (req, res) => {
  try {
    const { sceneTitle, sceneHint, userReply } = req.body;

    if (!sceneTitle || !userReply) {
      return res.status(400).json({ error: "参数不完整" });
    }

    const prompt = `
你是社会技能训练评分助手。
请根据用户在特定社交场景中的一句回答，给出结构化评分。

要求：
1. 输出必须是 JSON。
2. 不要输出 markdown。
3. 总分 100。
4. 四个维度：
   - politeness 礼貌表达（0-25）
   - relevance 情境相关（0-25）
   - clarity 表达清晰（0-25）
   - continuation 延续对话（0-25）
5. score = 四项相加
6. comment 用一句简洁自然的话解释
7. suggestion 给出一句更好的示范说法

场景：${sceneTitle}
目标：${sceneHint}
用户回答：${userReply}

输出格式：
{
  "score": 0,
  "politeness": 0,
  "relevance": 0,
  "clarity": 0,
  "continuation": 0,
  "comment": "...",
  "suggestion": "..."
}
`;

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() || "";
    const parsed = safeParseJSON(raw);

    if (!parsed) {
      return res.json({
        score: 75,
        politeness: 18,
        relevance: 20,
        clarity: 19,
        continuation: 18,
        comment: "这句话基本合适，但还可以更自然一点。",
        suggestion: userReply,
      });
    }

    res.json(parsed);
  } catch (error) {
    console.error("/api/score error:", error);
    res.status(500).json({
      error: "评分失败",
      detail: error?.message || "unknown error",
    });
  }
});

app.post("/api/suggest", async (req, res) => {
  try {
    const { sceneTitle, sceneHint, starter, messages } = req.body;

    if (!sceneTitle || !sceneHint || !starter) {
      return res.status(400).json({ error: "参数不完整" });
    }

    const formattedMessages = (messages || []).map((m) => ({
      role: m.sender === "me" ? "user" : "assistant",
      content: m.text,
    }));

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: `你是“沟通练习”产品中的示范回复助手。
你的任务是生成一句自然的社交回复。

要求：
1. 只输出一句中文
2. 简短自然
3. 不要解释
4. 必须贴合当前场景`,
        },
        {
          role: "user",
          content: `场景：${sceneTitle}\n目标：${sceneHint}\n开场：${starter}`,
        },
        ...formattedMessages,
      ],
      temperature: 0.7,
    });

    const suggestion =
      completion.choices?.[0]?.message?.content?.trim() ||
      "你好，我刚下课，准备过去。";

    res.json({ suggestion });
  } catch (error) {
    console.error("/api/suggest error:", error);
    res.status(500).json({
      error: "示范生成失败",
      detail: error?.message || "unknown error",
    });
  }
});

// ── Auth endpoints ─────────────────────────────────────────────────────────

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, name: user.name },
    JWT_SECRET,
    { expiresIn: "7d" },
  );
}

app.get("/api/auth/captcha", (req, res) => {
  res.json(issueCaptcha());
});

app.post("/api/auth/login", (req, res) => {
  const { username, password, captchaId, captchaAnswer } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "请输入用户名和密码" });
  }
  if (!captchaId || captchaAnswer === undefined || captchaAnswer === "") {
    return res.status(400).json({ error: "请完成人机验证", code: "captcha_required" });
  }
  if (!consumeCaptcha(captchaId, captchaAnswer)) {
    return res.status(400).json({ error: "验证码错误或已过期，请重新获取", code: "captcha_invalid" });
  }
  const user = USERS.find((u) => u.username === username);
  if (!user || !verifyPassword(password, user.salt, user.passwordHash)) {
    return res.status(401).json({ error: "用户名或密码错误" });
  }
  res.json({ token: signToken(user), role: user.role, name: user.name });
});

app.post("/api/auth/register", (req, res) => {
  const { username, password, name, role, captchaId, captchaAnswer } = req.body || {};
  if (!username || !password || !name || !role) {
    return res.status(400).json({ error: "请填写完整的注册信息" });
  }
  if (!/^[a-zA-Z0-9_]{4,20}$/.test(username)) {
    return res.status(400).json({ error: "用户名为 4-20 位字母、数字或下划线" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "密码至少 6 位" });
  }
  if (!["student", "teacher", "parent"].includes(role)) {
    return res.status(400).json({ error: "角色不合法" });
  }
  if (!captchaId || captchaAnswer === undefined || captchaAnswer === "") {
    return res.status(400).json({ error: "请完成人机验证", code: "captcha_required" });
  }
  if (!consumeCaptcha(captchaId, captchaAnswer)) {
    return res.status(400).json({ error: "验证码错误或已过期，请重新获取", code: "captcha_invalid" });
  }
  if (USERS.some((u) => u.username === username)) {
    return res.status(409).json({ error: "该用户名已被注册" });
  }
  const nextId = USERS.reduce((m, u) => Math.max(m, u.id), 0) + 1;
  const user = makeUser({ id: nextId, username, password, role, name });
  USERS.push(user);
  saveUsers();
  res.json({ token: signToken(user), role: user.role, name: user.name });
});

app.get("/api/auth/me", (req, res) => {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "未登录" });
  }
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET);
    res.json({ id: payload.id, username: payload.username, role: payload.role, name: payload.name });
  } catch {
    res.status(401).json({ error: "token 无效或已过期" });
  }
});

function getAuthUser(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return null;
  try { return jwt.verify(auth.slice(7), JWT_SECRET); } catch { return null; }
}

// ── Student endpoints ─────────────────────────────────────────────────────────

app.post("/api/student/session", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "student") return res.status(401).json({ error: "未授权" });
  const { module, moduleName, score, duration, summary, scene } = req.body || {};
  const session = {
    id: crypto.randomBytes(8).toString("hex"),
    studentId: user.id,
    studentName: user.name,
    studentUsername: user.username,
    module: module || "train",
    moduleName: moduleName || "训练模块",
    scene: scene || "",
    score: Number(score) || 0,
    duration: Number(duration) || 0,
    summary: summary || "",
    timestamp: new Date().toISOString(),
  };
  SESSIONS.push(session);
  saveSessions();
  res.json({ ok: true, session });
});

// ── Teacher endpoints ──────────────────────────────────────────────────────

app.get("/api/teacher/students", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "teacher") return res.status(401).json({ error: "未授权" });
  const students = USERS.filter((u) => u.role === "student").map((s) => {
    const sSessions = SESSIONS.filter((se) => se.studentId === s.id);
    const sorted = [...sSessions].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const avgScore = sSessions.length ? Math.round(sSessions.reduce((sum, se) => sum + se.score, 0) / sSessions.length) : null;
    const recent = sorted.slice(0, 5);
    const older = sorted.slice(5, 10);
    const recentAvg = recent.length ? recent.reduce((s, e) => s + e.score, 0) / recent.length : null;
    const olderAvg = older.length ? older.reduce((s, e) => s + e.score, 0) / older.length : null;
    const trend = (recentAvg !== null && olderAvg !== null) ? Math.round(recentAvg - olderAvg) : null;
    return {
      id: s.id, username: s.username, name: s.name,
      totalSessions: sSessions.length,
      avgScore,
      trend: trend !== null ? (trend >= 0 ? `+${trend}` : `${trend}`) : null,
      lastSession: sorted[0]?.timestamp ? sorted[0].timestamp.slice(0, 10) : null,
      noteCount: NOTES.filter((n) => n.studentId === s.id).length,
    };
  });
  res.json(students);
});

app.get("/api/teacher/student/:id/sessions", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "teacher") return res.status(401).json({ error: "未授权" });
  const studentId = Number(req.params.id);
  const sessions = SESSIONS.filter((s) => s.studentId === studentId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 30);
  res.json(sessions);
});

app.get("/api/teacher/student/:id/notes", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "teacher") return res.status(401).json({ error: "未授权" });
  const studentId = Number(req.params.id);
  const notes = NOTES.filter((n) => n.studentId === studentId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json(notes);
});

app.post("/api/teacher/student/:id/note/save", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "teacher") return res.status(401).json({ error: "未授权" });
  const studentId = Number(req.params.id);
  const { suggestion, homework, encouragement, observation } = req.body || {};
  if (!suggestion?.trim()) return res.status(400).json({ error: "内容不能为空" });
  const note = {
    id: crypto.randomBytes(8).toString("hex"),
    teacherId: user.id,
    teacherName: user.name,
    studentId,
    observation: observation || "",
    suggestion: suggestion.trim(),
    homework: homework || "",
    encouragement: encouragement || "",
    timestamp: new Date().toISOString(),
  };
  NOTES.push(note);
  saveNotes();
  res.json({ ok: true, note });
});

app.post("/api/teacher/note", async (req, res) => {
  try {
    const { studentName, observation, sessions } = req.body;
    if (!observation || !observation.trim()) {
      return res.status(400).json({ error: "missing observation" });
    }

    const sessionSummary = Array.isArray(sessions) && sessions.length
      ? sessions.map((s) => `${s.date} ${s.module}·${s.scene} ${s.score}分：${s.comment}`).join("\n")
      : "暂无近期会话记录";

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "你是孤独症青少年社会技能训练的教师助手。根据教师观察和会话记录，输出结构化建议。只输出 JSON，不要 markdown。",
        },
        {
          role: "user",
          content: `学员：${studentName || "该学员"}
教师观察：${observation}
近期会话记录：
${sessionSummary}

请生成：
1. suggestion：2-4 句训练建议，必须结合观察内容，具体指出下一步练习方向。
2. homework：1-2 条家庭作业，贴合该学员情况。
3. encouragement：1 句鼓励话语，适合教师对学员说。
输出格式：
{
  "suggestion": "...",
  "homework": "...",
  "encouragement": "..."
}`,
        },
      ],
      temperature: 0.4,
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() || "";
    const parsed = safeParseJSON(raw);
    res.json(parsed || {
      suggestion: "根据近期表现，建议继续在真实场景中练习主动发起对话，并尝试多用跟进问句延续交流。",
      homework: "每天选择一个生活场景，练习主动问一句跟进问题，并记录下来。",
      encouragement: "你这段时间的努力大家都看在眼里，继续加油！",
    });
  } catch (error) {
    console.error("/api/teacher/note error:", error);
    res.status(500).json({ error: "note generation failed", detail: error?.message || "unknown error" });
  }
});

// ── Parent endpoints ────────────────────────────────────────────────────────

app.get("/api/parent/students", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "parent") return res.status(401).json({ error: "未授权" });
  const parent = USERS.find((u) => u.id === user.id);
  if (!parent?.childId) return res.json({ linked: false, child: null });
  const child = USERS.find((u) => u.id === parent.childId && u.role === "student");
  if (!child) return res.json({ linked: false, child: null });
  res.json({ linked: true, child: { id: child.id, name: child.name, username: child.username } });
});

app.post("/api/parent/link-child", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "parent") return res.status(401).json({ error: "未授权" });
  const { childUsername } = req.body || {};
  if (!childUsername?.trim()) return res.status(400).json({ error: "请输入学员用户名" });
  const child = USERS.find((u) => u.username === childUsername.trim() && u.role === "student");
  if (!child) return res.status(404).json({ error: "未找到该学员账号，请确认用户名是否正确" });
  const parent = USERS.find((u) => u.id === user.id);
  parent.childId = child.id;
  saveUsers();
  res.json({ ok: true, child: { id: child.id, name: child.name, username: child.username } });
});

app.post("/api/parent/unlink-child", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "parent") return res.status(401).json({ error: "未授权" });
  const parent = USERS.find((u) => u.id === user.id);
  delete parent.childId;
  saveUsers();
  res.json({ ok: true });
});

app.get("/api/parent/student/:id/summary", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "parent") return res.status(401).json({ error: "未授权" });
  const parent = USERS.find((u) => u.id === user.id);
  if (!parent?.childId) return res.status(403).json({ error: "请先绑定孩子账号" });
  const studentId = Number(req.params.id);
  const student = USERS.find((u) => u.id === studentId && u.role === "student");
  if (!student) return res.status(404).json({ error: "学员不存在" });
  const allSessions = SESSIONS.filter((s) => s.studentId === studentId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 3600 * 1000;
  const weekSessions = allSessions.filter((s) => new Date(s.timestamp).getTime() >= weekAgo);
  const moduleMap = {};
  for (const s of allSessions) {
    if (!moduleMap[s.module]) moduleMap[s.module] = { moduleName: s.moduleName, count: 0, total: 0 };
    moduleMap[s.module].count++;
    moduleMap[s.module].total += s.score;
  }
  const modules = Object.entries(moduleMap).map(([k, v]) => ({ module: k, moduleName: v.moduleName, sessions: v.count, avgScore: Math.round(v.total / v.count) }));
  const bestModule = modules.sort((a, b) => b.avgScore - a.avgScore)[0];
  const avgScore = allSessions.length ? Math.round(allSessions.reduce((s, e) => s + e.score, 0) / allSessions.length) : null;
  const notes = NOTES.filter((n) => n.studentId === studentId).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json({
    student: { id: student.id, name: student.name, username: student.username },
    totalSessions: allSessions.length,
    weekSessions: weekSessions.length,
    avgScore,
    bestModule: bestModule?.moduleName || null,
    modules,
    recentSessions: allSessions.slice(0, 10),
    notes,
  });
});

app.post("/api/parent/practice", async (req, res) => {
  try {
    const { childName, weekReport, trends, latestFeedback } = req.body;

    const reportSummary = weekReport
      ? `本周训练 ${weekReport.totalSessions} 次，平均分 ${weekReport.avgScore}，最强模块：${weekReport.bestModule}，进步：${weekReport.improvement}`
      : "本周训练数据暂无";

    const trendSummary = Array.isArray(trends) && trends.length
      ? `最近一周综合得分 ${trends[trends.length - 1]?.overall}，表达清晰 ${trends[trends.length - 1]?.clarity}，共情能力 ${trends[trends.length - 1]?.empathy}`
      : "";

    const feedbackNote = latestFeedback?.homework || "";

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "你是孤独症青少年社会技能训练的家庭支持助手。根据孩子的训练数据为家长生成家庭练习建议。只输出 JSON，不要 markdown。活动要轻松有趣，适合亲子互动，不要增加压力。",
        },
        {
          role: "user",
          content: `孩子：${childName || "孩子"}
训练周报：${reportSummary}
能力趋势：${trendSummary}
教师作业：${feedbackNote || "无"}

请生成：
1. tip：1 句家庭练习的总体提示，温馨鼓励的语气。
2. activities：3 个家庭练习活动，每个有 title 和 desc，贴合孩子当前能力水平，适合日常生活中自然练习。
输出格式：
{
  "tip": "...",
  "activities": [
    { "title": "...", "desc": "..." },
    { "title": "...", "desc": "..." },
    { "title": "...", "desc": "..." }
  ]
}`,
        },
      ],
      temperature: 0.6,
    });

    const raw = completion.choices?.[0]?.message?.content?.trim() || "";
    const parsed = safeParseJSON(raw);
    res.json(parsed || {
      tip: "每次练习控制在 10-15 分钟，保持轻松，避免纠错压力。",
      activities: [
        { title: "角色扮演练习", desc: "在家模拟课间聊天场景，练习主动加入话题的表达方式。" },
        { title: "情绪卡片游戏", desc: "用表情卡片配合日常对话，练习识别和命名他人情绪。" },
        { title: "电话礼仪练习", desc: "模拟接打电话，重点练习开头问候和礼貌结束语。" },
      ],
    });
  } catch (error) {
    console.error("/api/parent/practice error:", error);
    res.status(500).json({ error: "practice plan generation failed", detail: error?.message || "unknown error" });
  }
});

const server = app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

server.on("error", (err) => {
  console.error("Server error:", err);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});
