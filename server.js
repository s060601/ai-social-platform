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
import { sanitizeModelText } from "./shared/modelText.js";
import { beijingDateKey, beijingDateTime } from "./shared/time.js";
import { scoreSsds, SSDS_VERSION } from "./shared/ssds.js";

dotenv.config();

const app = express();
app.set("trust proxy", 1);
app.use(cors());
app.use(express.json({ limit: "256kb" }));

const port = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "yuyi-dev-secret";
const DIMENSION_KEYS = [
  "contextUnderstanding",
  "socialPragmatics",
  "emotionResponse",
  "normExpression",
  "dialogueMaintenance",
  "problemSolving",
];
const CONSENT_VERSION = "2026-08-12";

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
  return {
    id,
    username,
    salt,
    passwordHash: hashPassword(password, salt),
    role,
    name,
    transcriptShareWithTeacher: false,
  };
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
const TRACKING_FILE = path.join(__dirname, "tracking.json");
const SSDS_FILE = path.join(__dirname, "ssds.json");
let SESSIONS = [];
let NOTES = [];
let TRACKING = [];
let SSDS_RESPONSES = [];
function loadSessions() { try { SESSIONS = JSON.parse(fs.readFileSync(SESSIONS_FILE, "utf-8")); } catch { SESSIONS = []; } }
function saveSessions() { fs.writeFileSync(SESSIONS_FILE, JSON.stringify(SESSIONS, null, 2), "utf-8"); }
function loadNotes() { try { NOTES = JSON.parse(fs.readFileSync(NOTES_FILE, "utf-8")); } catch { NOTES = []; } }
function saveNotes() { fs.writeFileSync(NOTES_FILE, JSON.stringify(NOTES, null, 2), "utf-8"); }
function loadTracking() { try { TRACKING = JSON.parse(fs.readFileSync(TRACKING_FILE, "utf-8")); } catch { TRACKING = []; } }
function saveTracking() { fs.writeFileSync(TRACKING_FILE, JSON.stringify(TRACKING, null, 2), "utf-8"); }
function loadSsds() { try { SSDS_RESPONSES = JSON.parse(fs.readFileSync(SSDS_FILE, "utf-8")); } catch { SSDS_RESPONSES = []; } }
function saveSsds() { fs.writeFileSync(SSDS_FILE, JSON.stringify(SSDS_RESPONSES, null, 2), "utf-8"); }
loadSessions();
loadNotes();
loadTracking();
loadSsds();

function normalizeTranscript(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => ({
      item,
      text: sanitizeModelText(String(item?.text || "")).slice(0, 1000),
    }))
    .filter(({ item, text }) => item && text)
    .slice(-40)
    .map(({ item, text }, index) => ({
      turn: index + 1,
      speaker: item.sender === "me" ? "student" : "role",
      source: item.source === "voice" ? "voice_final_transcript" : "text_input",
      text,
    }));
}

function normalizeTurnFeedback(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => ({
      item,
      text: sanitizeModelText(String(item?.text || "")).slice(0, 1000),
    }))
    .filter(({ item, text }) => item && text)
    .slice(-30)
    .map(({ item, text }, index) => ({
      turn: index + 1,
      speaker: item.sender === "me" ? "student" : "role",
      text,
      analysis: sanitizeModelText(String(item.analysis || "")).slice(0, 3000),
      suggestion: sanitizeModelText(String(item.suggestion || "")).slice(0, 3000),
      dimensions: item.dimensions && typeof item.dimensions === "object" ? item.dimensions : {},
    }));
}

function sessionsFromLatestDates(sessions, dateCount = 3) {
  const dates = [];
  return sessions.filter((session) => {
    const date = beijingDateKey(session.timestamp);
    if (!dates.includes(date) && dates.length < dateCount) dates.push(date);
    return dates.includes(date);
  });
}

function sessionForViewer(session, { includeTranscript = false } = {}) {
  const { transcript, turnFeedback, ...summary } = session;
  return {
    ...summary,
    transcript: includeTranscript ? transcript : [],
    turnFeedback: includeTranscript ? turnFeedback : [],
    transcriptShared: includeTranscript,
  };
}

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
    return JSON.parse(sanitizeModelText(text), (_, value) =>
      typeof value === "string" ? sanitizeModelText(value) : value,
    );
  } catch {
    return null;
  }
}

function completionText(completion) {
  return sanitizeModelText(completion?.choices?.[0]?.message?.content || "");
}

const SOCIAL_SKILL_DIMENSIONS = `
六个一级维度：
1. contextUnderstanding 情境理解：理解当前交往任务、角色关系、对方意图和情境要求。
2. socialPragmatics 社会语用：表达是否贴合语境、对象、交流目的和社会边界。
3. emotionResponse 情绪回应：识别对方情绪，并作出合适、支持性的回应。
4. normExpression 礼貌规范：使用礼貌、清晰、合适的社会规范表达。
5. dialogueMaintenance 对话维持：回应追问、补充信息、主动提问并推动对话继续。
6. problemSolving 问题解决：说明原因、协商安排、提出补救或求助方式。
`;

const MEASUREMENT_AI_BOUNDARY = `
项目边界：
1. AI 只作为标准化情境互动、行为记录、辅助编码和自动评分工具。
2. 不进行医学诊断，不判断是否患有孤独症，不输出治疗结论。
3. 不自由发挥评分标准，只依据可观察语言行为、任务目标和固定维度进行编码。
4. 评分和反馈必须可追溯到用户原话或对话记录中的具体行为证据。
5. 不使用“感觉不错”“比较自然”等空泛评价，必须说明具体表现。
6. 面向受测者的反馈要温和、简洁、可执行；面向教师和家长的建议只用于教育支持。
`;

const STRUCTURED_SCORE_RULES = `
评分规则：
1. 六个一级维度均输出 0-100 分。
2. score 为综合参考分，不作为医学或临床诊断结论。
3. evidence 必须写具体行为证据，说明用户说了什么、做到了什么或缺少什么。
4. strength 写优势能力，supportNeed 写下一步支持重点。
5. suggestion 或 nextStep 只能给可直接练习的表达/做法，不能透露评分量规或诱发目标。
6. 输出必须是合法 JSON，不要 markdown，不要额外解释。
`;

// Keep this list conservative: block clear abuse without treating ordinary
// frustration, disagreement, or emotional descriptions as violations.
const BLOCKED_TERMS = [
  "傻逼", "傻比", "沙比", "煞笔", "煞逼", "他妈的", "妈的", "你妈",
  "草泥马", "操你", "狗东西", "废物", "弱智", "脑残", "王八蛋", "垃圾",
  "fuck", "shit", "bitch", "asshole",
];
const moderationAttempts = new Map();

function moderationText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[\s\u200b\u200c\u200d\ufeff]+/g, "")
    .replace(/[，。！？、,.!?;；:：~～*_`'"“”‘’()[\\]{}<>《》]/g, "");
}

function hasBlockedTerm(value) {
  const normalized = moderationText(value);
  return BLOCKED_TERMS.some((term) => normalized.includes(moderationText(term)));
}

function isLowPressureReply(value) {
  const normalized = moderationText(value);
  return [
    "滚", "走开", "别烦我", "不想说", "不想聊", "算了", "随便", "不知道", "烦死了", "别问了",
  ].includes(normalized);
}

function pausedPracticeResult(userReply) {
  return {
    scored: false,
    score: 0,
    contextUnderstanding: 0,
    socialPragmatics: 0,
    emotionResponse: 0,
    normExpression: 0,
    dialogueMaintenance: 0,
    problemSolving: 0,
    politeness: 0,
    relevance: 0,
    clarity: 0,
    continuation: 0,
    evidence: "没关系，这一轮先不计入练习记录。等准备好了，我们可以慢一点再试。",
    strength: "",
    supportNeed: "可以先说说自己现在的状态，或用一句和当前事情有关的话重新开始。",
    comment: "听起来你现在可能有点烦，没关系，我们可以慢一点。",
    suggestion: "可以说：“我现在有点烦，能让我先缓一缓吗？”",
  };
}

function pausedRoleReply() {
  return "听起来你现在有点烦，没关系。我们先不急着说这件事：你想先缓一下，还是愿意告诉我哪里让你不舒服？";
}

function sceneFactsText(value, fallback = "") {
  const facts = Array.isArray(value)
    ? value.map((item) => sanitizeModelText(String(item || "")).replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 3)
    : [];
  return facts.length ? facts.join("\n") : fallback;
}

function moderationKey(req) {
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function rejectBlockedContent(req, res, values) {
  const text = Array.isArray(values) ? values.filter(Boolean).join("\n") : values;
  if (!hasBlockedTerm(text)) return false;

  const key = moderationKey(req);
  const now = Date.now();
  const previous = moderationAttempts.get(key) || { count: 0, since: now };
  const record = now - previous.since > 10 * 60 * 1000
    ? { count: 1, since: now }
    : { count: previous.count + 1, since: previous.since };
  moderationAttempts.set(key, record);

  const repeated = record.count >= 4;
  return res.status(repeated ? 429 : 422).json({
    code: "CONTENT_BLOCKED",
    error: "CONTENT_BLOCKED",
    message: repeated
      ? "提交过于频繁，请稍后再试。"
      : "这段内容暂时不能提交，请换一种表达后再试。",
  });
}

app.post("/api/moderation/check", (req, res) => {
  if (rejectBlockedContent(req, res, req.body?.text)) return;
  res.json({ ok: true });
});

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
    const { sceneTitle, sceneRole, sceneSetting, sceneHint, userReply } = req.body;

    if (!sceneTitle || !userReply) {
      return res.status(400).json({ error: "missing sceneTitle or userReply" });
    }
    if (rejectBlockedContent(req, res, userReply)) return;

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: `你是“语依”系统中的语音互动反馈助手。
${MEASUREMENT_AI_BOUNDARY}
${SOCIAL_SKILL_DIMENSIONS}
${STRUCTURED_SCORE_RULES}
你正在根据受测者在真实语音情境中的一句回应进行辅助编码。`,
        },
        {
          role: "user",
          content: `场景：${sceneTitle}
对话对象：${sceneRole || "场景角色"}
背景信息：${sceneSetting || "未提供"}
任务目标：${sceneHint || "真实社交表达"}
用户刚说：${userReply}

请给出即时反馈和一句可练习表达。
要求：
1. feedback 写 1-2 句，必须点出用户这句话具体哪里清楚或哪里还缺一点。
2. example 必须是用户下一次可以直接说出口的一句话。
3. score 按当前这句话在该场景里的社会沟通表现给 0-100。
4. 六个测评维度都按 0-100 输出：contextUnderstanding、socialPragmatics、emotionResponse、normExpression、dialogueMaintenance、problemSolving。
5. clarity、relevance、initiative 作为兼容字段，也按 0-100 输出。
6. 如果用户没有回应当前通话内容或明显说到无关事情：feedback 用温和的话把注意力带回当前来电，不使用“答非所问”“离题”等标签；example 只给一句能直接接回这通电话的口语化表达，不编造背景外的事实。
输出格式：
{
  "score": 0,
  "contextUnderstanding": 0,
  "socialPragmatics": 0,
  "emotionResponse": 0,
  "normExpression": 0,
  "dialogueMaintenance": 0,
  "problemSolving": 0,
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

    const raw = completionText(completion);
    const parsed = safeParseJSON(raw);

    res.json(
      parsed || {
        score: 78,
        contextUnderstanding: 78,
        socialPragmatics: 76,
        emotionResponse: 70,
        normExpression: 80,
        dialogueMaintenance: 72,
        problemSolving: 72,
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
    const { sceneTitle, sceneRole, sceneSetting, sceneHint, messages } = req.body;

    if (!sceneTitle || !Array.isArray(messages)) {
      return res.status(400).json({ error: "missing sceneTitle or messages" });
    }

    // A call with only the opening line is not an assessment. Do not let the
    // model infer or invent a student response when no transcript exists.
    const userMessages = messages.filter(
      (m) => m?.sender === "me" && typeof m.text === "string" && m.text.trim(),
    );
    if (!userMessages.length) {
      return res.status(422).json({
        error: "no_user_response",
        message: "未检测到有效的用户语音回应，不生成评分或通话记录。",
      });
    }
    if (rejectBlockedContent(req, res, userMessages.map((message) => message.text))) return;

    const transcript = messages
      .map((m) => `${m.sender === "me" ? "用户" : "AI"}：${m.text}`)
      .join("\n");

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: `你是“语依”系统中的语音互动总结助手。
${MEASUREMENT_AI_BOUNDARY}
${SOCIAL_SKILL_DIMENSIONS}
${STRUCTURED_SCORE_RULES}
你正在根据完整通话记录生成一次互动反馈和辅助编码结果。`,
        },
        {
          role: "user",
          content: `场景：${sceneTitle}
对话对象：${sceneRole || "场景角色"}
背景信息：${sceneSetting || "未提供"}
任务目标：${sceneHint || "真实社交表达"}
对话记录：
${transcript}

请总结本次语音互动。要求：
1. summary 写 3-5 句，说明本次发生了什么、用户如何回应、对话有没有自然推进、哪里还可以补充。
2. strength 写 2-3 个具体优点，必须结合对话记录里的表达，不要只说“很好”。
3. nextStep 写 2-3 条下一次可以练习的具体方向，并给出一个可直接模仿的小句子。
4. score 按 0-100 给出综合参考分，仅用于教育支持。
5. contextUnderstanding、socialPragmatics、emotionResponse、normExpression、dialogueMaintenance、problemSolving 分别按 0-100 评价六个一级维度。
6. clarity、relevance、initiative 作为兼容字段，也按 0-100 输出。
输出格式：
{
  "score": 0,
  "contextUnderstanding": 0,
  "socialPragmatics": 0,
  "emotionResponse": 0,
  "normExpression": 0,
  "dialogueMaintenance": 0,
  "problemSolving": 0,
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

    const raw = completionText(completion);
    const parsed = safeParseJSON(raw);

    res.json(
      parsed || {
        score: 80,
        contextUnderstanding: 80,
        socialPragmatics: 78,
        emotionResponse: 74,
        normExpression: 82,
        dialogueMaintenance: 76,
        problemSolving: 75,
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
    const { sceneTitle, sceneRole, sceneSetting, sceneHint, messages } = req.body;

    if (!sceneTitle) {
      return res.status(400).json({ error: "missing sceneTitle" });
    }

    const transcript = (messages || [])
      .slice(-6)
      .map((m) => `${m.sender === "me" ? "用户" : "AI"}：${m.text}`)
      .join("\n");
    if (rejectBlockedContent(req, res, (messages || []).filter((m) => m?.sender === "me").map((m) => m.text))) return;

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: `你是“语依”的表达练习辅助助手。
${MEASUREMENT_AI_BOUNDARY}
只输出一句中文，口语化，适合青少年直接练习；不要解释，不要评分，不要透露测评目标或量规。
如果最近一句没有回应当前通话内容，给一句能自然回到这通电话的表达；不批评用户，不编造背景外的事实。`,
        },
        {
          role: "user",
          content: `当前场景：${sceneTitle}
对话对象：${sceneRole || "场景角色"}
背景信息：${sceneSetting || "未提供"}
任务目标：${sceneHint || "真实社交表达"}
最近对话：
${transcript}

请给用户一句可以马上练习的自然回复。`,
        },
      ],
      temperature: 0.7,
    });

    res.json({ suggestion: completionText(completion) || "可以呀，我愿意试一试。" });
  } catch (error) {
    console.error("/api/voice/suggestion error:", error);
    res.status(500).json({ error: "voice suggestion failed", detail: error?.message || "unknown error" });
  }
});



app.post("/api/chat", async (req, res) => {
  try {
    const { sceneTitle, sceneRole, sceneRoleStyle, sceneSetting, sceneFacts, roleFacts, sceneHint, starter, messages, trainingLevel } = req.body;

    if (!sceneTitle || !starter || !Array.isArray(messages)) {
      return res.status(400).json({ error: "参数不完整" });
    }
    if (rejectBlockedContent(req, res, messages.filter((m) => m?.sender === "me").map((m) => m.text))) return;
    const latestUserMessage = [...messages].reverse().find((message) => message?.sender === "me")?.text;
    if (isLowPressureReply(latestUserMessage)) return res.json({ reply: pausedRoleReply() });
    const visibleFacts = sceneFactsText(sceneFacts, sceneSetting || "未提供");
    const privateRoleFacts = sceneFactsText(roleFacts, "无");

    const systemPrompt = `
你是“语依”系统中的标准化互动角色。
${MEASUREMENT_AI_BOUNDARY}
你只负责扮演场景中的对话对象，呈现稳定、真实、适龄的互动情境。
不要向用户透露测评目标、评分维度、诱发行为或量规。

要求：
1. 你要扮演“${sceneRole || "场景中的对话对象"}”，不能以系统、辅导员或评估者的身份说话。
2. 回复要自然、简短、口语化，像这个人此刻真的在跟对方说话；不要像老师讲课，也不要像群公告。
3. 一次最多 1-2 句话。
4. 不要输出“AI：”“建议：”“评分：”这类标签。
5. 不要长篇说教。
6. 如果用户表达不完整，也要先接住，再根据当前关系自然追问一个具体问题。不要用“你应该”“下次要”“你这样不合适”来教育用户。
7. 不要使用括号旁白或舞台动作，例如“（停顿一下）”“（温和地）”。
8. 不要评价用户“这样说不合适”“大家会觉得你怎样”，只用当前角色的身份自然回应。
9. 如果用户只回很短一句、表示拒绝、烦躁、调侃、测试性输入或暂时离题，先把它理解为“可能不想继续、还没想好怎么说，或现在有点烦”。第一句必须中性接住，不复述刺激性用词，也不纠正用词、不讲道理、不谈礼貌或态度。例如：“听起来你现在有点烦，没关系，我们慢一点。”随后只给一个低压力入口：要么问一个依据背景、很容易回答的问题，要么给出“想继续说还是先停一下”的选择。禁止使用“你怎么这么说话”“你这样不合适”“要尊重别人”“大家会觉得你怎样”及任何责备性表达。
10. 场景名称：${sceneTitle}
11. 角色表现要求：${sceneRoleStyle || "保持符合角色关系的自然语气。"}
12. 内部任务目标：${sceneHint}
13. 开场白：${starter}
14. 被试可见信息（你也只能使用这些事实）：${visibleFacts}
15. 角色私有信息（只有当前角色知道，必要时才向被试说明）：${privateRoleFacts}
16. 角色边界：用户始终是学生，“我”指当前角色，“你”指学生；不得把双方的身份、经历或已完成的事情互相调换。
17. 事实边界：只可使用场景名称、角色表现要求、被试可见信息、角色私有信息、开场白和用户已经说出的信息。角色私有信息只能在用户合理询问后自然说明，不能假设被试已经知道，也不能用它反过来责备被试。不得凭空加入新的活动、地点、人物、作业、题目、页码或任务；也不要追问被试卡片中没有提供、且无法合理回答的细节。
18. 如果信息不足，不要假装看见了题目、物品或现场动作；只提出一个能够根据已出现信息回答的简短问题，或说明自己需要用户补充什么。
19. 如果用户答非所问、完全离题，或只说了与当前对话无关的话：不要批评、不要说“你离题了”，也不要突然换到新话题。先用一句简短、放松的回应承认对方可能暂时不想答，再只围绕已给出的背景信息，把对话拉回当前事情，并问一个容易回答的具体问题。比如“没关系，我们慢一点。刚才是在确认你什么时候能下楼，你大概还要几分钟？”
20. 如果用户表示不知道、想不起来或不会说：不要连续追问。可以给一个很短的选择，或用当前角色自然地示范一句可接的话，但不得替用户编造经历。
21. 当前练习支持强度：${trainingLevel === "guided" ? "引导练习。用户卡住时，你可以给一个很短的二选一或一条可接的话。" : trainingLevel === "supported" ? "半引导。优先自然追问，只有明显卡住时才给一个简短提示。" : "独立挑战。除非用户明确表示不知道，否则不主动给示范或选项。"}
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
      temperature: 0.5,
    });

    const reply = completionText(completion) || "我明白你的意思了。";

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
    if (rejectBlockedContent(req, res, text)) return;

    const prompt = `
你是“语依”的表达练习辅助工具。
用户会输入一句“自己想说但不太会说的话”，你要帮他改得更自然。
这是练习辅助，不参与正式评分，也不要提测评、量规或诊断。

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

    const raw = completionText(completion);
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
    const { sceneTitle, sceneSetting, sceneFacts, sceneHint, userReply, trainingLevel } = req.body;

    if (!sceneTitle || !userReply) {
      return res.status(400).json({ error: "参数不完整" });
    }
    if (rejectBlockedContent(req, res, userReply)) return;
    if (isLowPressureReply(userReply)) return res.json(pausedPracticeResult(userReply));
    const visibleFacts = sceneFactsText(sceneFacts, sceneSetting || "未提供");

    const prompt = `
你是“语依”系统中的社会技能行为编码与辅助评分模块。
${MEASUREMENT_AI_BOUNDARY}
${SOCIAL_SKILL_DIMENSIONS}
${STRUCTURED_SCORE_RULES}
请根据用户在特定社交场景中的一句回答，依据“一级维度—二级指标—行为表现”的测评思路进行结构化辅助编码。

要求：
1. 输出必须是 JSON。
2. 不要输出 markdown。
3. 不进行医学诊断，只描述可观察的社会沟通行为。
4. 不因回答短、紧张或表达简单而推断病理原因。
5. 如证据不足，应在 evidence 中说明“信息不足”，对应维度给中低分，而不是编造表现。
6. comment 用一句温和自然的话解释。
7. suggestion 必须是完整、可执行的下一步表达或做法，不能复制、改写或只重复用户原话，不能只输出一个词；必须结合当前场景和得分最低的一个维度。
8. 当 score >= 80 时，suggestion 应以具体肯定为主，说明用户已经做到的行为，不要硬挑问题或要求继续补充。
9. 当 score < 80 时，suggestion 只给一个最优先、可练习的方向，不要罗列多个要求，不要泄露评分维度或内部任务目标。
10. 为兼容旧前端，同时给出 politeness、relevance、clarity、continuation 四项 0-25 分，分别由礼貌规范、情境理解、社会语用、对话维持折算。
11. 如果回答没有回应当前情境或明显离题：evidence 只客观说明“暂时还没有提供与当前事情相关的信息”；comment 先接住用户可能的困惑、烦躁或犹豫，再用一句不批评的引导语；suggestion 只给一句用户现在就能说出口、能回到当前对话的参考表达。不要写“答非所问”“离题”“你应该”“攻击性”“粗鲁”“态度不好”“不配合”或类似的评价性措辞。
12. 不揣测用户的动机、品格或情绪原因。短句、拒绝、测试性输入和一时离题都只能视为“当前信息不足”，不能作为负面人格或行为标签。

场景：${sceneTitle}
被试可见信息：${visibleFacts}
内部任务目标：${sceneHint}
用户回答：${userReply}
本次支持强度：${trainingLevel || "guided"}

输出格式：
{
  "score": 0,
  "contextUnderstanding": 0,
  "socialPragmatics": 0,
  "emotionResponse": 0,
  "normExpression": 0,
  "dialogueMaintenance": 0,
  "problemSolving": 0,
  "politeness": 0,
  "relevance": 0,
  "clarity": 0,
  "continuation": 0,
  "evidence": "...",
  "strength": "...",
  "supportNeed": "...",
  "comment": "...",
  "suggestion": "..."
}
`;

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    });

    const raw = completionText(completion);
    const parsed = safeParseJSON(raw);

    if (!parsed) {
      return res.json({
        score: 75,
        contextUnderstanding: 75,
        socialPragmatics: 72,
        emotionResponse: 68,
        normExpression: 78,
        dialogueMaintenance: 70,
        problemSolving: 70,
        politeness: 18,
        relevance: 20,
        clarity: 19,
        continuation: 18,
        evidence: "用户能围绕情境作出回应，但信息补充和下一步安排还不够完整。",
        strength: "能够接住对方话题并表达基本意思。",
        supportNeed: "需要继续练习说明原因、补充细节和提出可执行方案。",
        comment: "这句话基本合适，但还可以更自然一点。",
        suggestion: "可以先补充一句具体情况，再说说你接下来打算怎么做。",
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

function fallbackGeneratedScene({ relation, place, goal }) {
  const relationText = { "同学": "同学", "老师": "老师", "家长": "家长", "工作人员": "服务台工作人员" }[relation] || "同学";
  const placeText = {
    "校园操场": "学校操场看台旁",
    "地铁站": "地铁站服务台附近",
    "科技馆": "科技馆二层展区入口",
    "社区图书馆": "社区图书馆一层借阅区",
  }[place] || "学校公共区域";
  const goalText = {
    "确认见面安排": "确认碰面时间和地点",
    "礼貌求助": "清楚说明需要什么帮助",
    "回应邀请": "表达是否愿意，并确认安排",
    "解释计划变化": "说明变化原因，并协商下一步",
  }[goal] || "确认接下来的安排";
  const starterMap = {
    "确认见面安排": "我已经到了，你现在方便确认一下我们在哪里碰面吗？",
    "礼貌求助": "你好，我遇到一点情况，想请你帮我确认一下。",
    "回应邀请": "我们等会儿要一起过去，你方便一起吗？",
    "解释计划变化": "我这边临时有一点变化，想和你说一下怎么安排。",
  };
  const studentInfoByGoal = {
    "确认见面安排": ["你现在在" + placeText + "附近。", "你和" + relationText + "约在这里见面。", "你还不确定对方的具体位置。"],
    "礼貌求助": ["你现在在" + placeText + "。", "你需要找到集合点，但不清楚怎么走。", "你可以向" + relationText + "说明自己需要什么帮助。"],
    "回应邀请": ["你现在在" + placeText + "。", "对方邀请你一起参加一项活动。", "你可以接受、婉拒，或先问清楚安排。"],
    "解释计划变化": ["你原本和" + relationText + "约好在" + placeText + "见面。", "你还需要大约十分钟才能到。", "你需要说明变化并商量下一步。"],
  };
  const roleInfoByGoal = {
    "确认见面安排": [relationText + "在" + placeText + "的服务台旁等你。"],
    "礼貌求助": ["集合点在" + placeText + "入口旁。"],
    "回应邀请": ["活动半小时后开始，在" + placeText + "入口集合。"],
    "解释计划变化": [relationText + "可以等十分钟，再确认是否需要调整安排。"],
  };
  return {
    title: (String(place || "日常") + String(goal || "沟通")).slice(0, 14),
    subtitle: "生成练习情境",
    role: relationText,
    roleStyle: "你是" + relationText + "。围绕已经提供的背景自然交流，不新增未出现的人物、任务或事实；一次只追问一个具体信息。",
    setting: "你在" + placeText + "，需要和" + relationText + goalText + "。先根据对方回应，再决定下一步。",
    studentInfo: studentInfoByGoal[goal] || studentInfoByGoal["确认见面安排"],
    roleInfo: roleInfoByGoal[goal] || roleInfoByGoal["确认见面安排"],
    hint: "围绕" + goalText + "，练习清楚表达、确认信息和自然回应。",
    target: "观察学员能否在" + String(place || "日常") + "情境中" + goalText + "。",
    starter: starterMap[goal] || "我想和你确认一下接下来的安排。",
    expected: ["回应当前事情", "补充一个关键信息", "确认或协商下一步"],
    indicators: ["情境理解", "社会语用", "对话维持", "问题解决"],
    source: "generated",
  };
}

function normalizeGeneratedScene(value, input) {
  const fallback = fallbackGeneratedScene(input);
  if (!value || typeof value !== "object") return fallback;
  const text = (field, max, fallbackValue) => sanitizeModelText(String(value[field] || "")).replace(/\s+/g, " ").trim().slice(0, max) || fallbackValue;
  const expected = Array.isArray(value.expected)
    ? value.expected.map((item) => sanitizeModelText(String(item || "")).trim().slice(0, 40)).filter(Boolean).slice(0, 4)
    : fallback.expected;
  const studentInfo = Array.isArray(value.studentInfo)
    ? value.studentInfo.map((item) => sanitizeModelText(String(item || "")).replace(/\s+/g, " ").trim().slice(0, 36)).filter(Boolean).slice(0, 3)
    : fallback.studentInfo;
  const roleInfo = Array.isArray(value.roleInfo)
    ? value.roleInfo.map((item) => sanitizeModelText(String(item || "")).replace(/\s+/g, " ").trim().slice(0, 42)).filter(Boolean).slice(0, 2)
    : fallback.roleInfo;
  return {
    ...fallback,
    title: text("title", 18, fallback.title),
    subtitle: "生成练习情境",
    role: text("role", 12, fallback.role),
    roleStyle: text("roleStyle", 180, fallback.roleStyle),
    setting: text("setting", 100, fallback.setting),
    studentInfo: studentInfo.length === 3 ? studentInfo : fallback.studentInfo,
    roleInfo: roleInfo.length ? roleInfo : fallback.roleInfo,
    hint: text("hint", 80, fallback.hint),
    target: text("target", 90, fallback.target),
    starter: text("starter", 80, fallback.starter),
    expected: expected.length >= 2 ? expected : fallback.expected,
    indicators: fallback.indicators,
  };
}

app.post("/api/scene/generate", async (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "student") return res.status(401).json({ error: "请以学生身份登录后生成情境" });

  const relationOptions = ["同学", "老师", "家长", "工作人员"];
  const placeOptions = ["校园操场", "地铁站", "科技馆", "社区图书馆"];
  const goalOptions = ["确认见面安排", "礼貌求助", "回应邀请", "解释计划变化"];
  const input = {
    relation: relationOptions.includes(req.body?.relation) ? req.body.relation : "同学",
    place: placeOptions.includes(req.body?.place) ? req.body.place : "校园操场",
    goal: goalOptions.includes(req.body?.goal) ? req.body.goal : "确认见面安排",
  };
  const fallback = fallbackGeneratedScene(input);

  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: "你为 12-18 岁学生创建简短、适龄的日常社交练习情境。只输出 JSON，不能包含 markdown。必须避免医学、诊断、危险、暴力、性内容、自伤、羞辱、恋爱依赖和高压冲突。场景必须有明确可见的关系、地点、目标和少量能在对话中使用的事实；不凭空假装看见题目、物品或现场动作。所有对话问题必须能根据被试可见信息回答，不能把关键事实只留给 AI。",
        },
        {
          role: "user",
          content: "请创建一个情境。关系：" + input.relation + "；地点：" + input.place + "；交流目标：" + input.goal + "。\n输出格式：\n{\n  \"title\":\"不超过12个汉字\",\n  \"role\":\"对话对象\",\n  \"roleStyle\":\"对话对象怎么自然说话和追问\",\n  \"setting\":\"不超过70字的背景\",\n  \"studentInfo\":[\"被试已知事实1\",\"被试已知事实2\",\"被试可作出的选择或下一步\"],\n  \"roleInfo\":[\"角色知道、仅在被试问到时才说出的事实\"],\n  \"hint\":\"不超过45字的练习重点\",\n  \"target\":\"不超过50字的观察目标\",\n  \"starter\":\"不超过45字的自然开场；只能询问studentInfo中能回答的内容\",\n  \"expected\":[\"行为1\",\"行为2\",\"行为3\"]\n}",
        },
      ],
      temperature: 0.65,
    });
    const scene = normalizeGeneratedScene(safeParseJSON(completionText(completion)), input);
    res.json({ scene, generatedBy: "ai" });
  } catch (error) {
    console.error("/api/scene/generate error:", error);
    res.json({ scene: fallback, generatedBy: "fallback" });
  }
});

app.post("/api/suggest", async (req, res) => {
  try {
    const { sceneTitle, sceneRole, sceneSetting, sceneFacts, sceneHint, starter, messages } = req.body;

    if (!sceneTitle || !sceneHint || !starter) {
      return res.status(400).json({ error: "参数不完整" });
    }
    if (rejectBlockedContent(req, res, (messages || []).filter((m) => m?.sender === "me").map((m) => m.text))) return;
    const visibleFacts = sceneFactsText(sceneFacts, sceneSetting || "未提供");

    const formattedMessages = (messages || []).map((m) => ({
      role: m.sender === "me" ? "user" : "assistant",
      content: m.text,
    }));

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: `你是“语依”的表达练习辅助助手。
${MEASUREMENT_AI_BOUNDARY}
你的任务是生成一句自然的社交回复。

要求：
1. 只输出一句中文
2. 简短自然
3. 不要解释
4. 必须贴合当前场景
5. 不要透露测评目标、评分维度或诱发行为`,
        },
        {
          role: "user",
          content: `场景：${sceneTitle}\n对话对象：${sceneRole || "场景角色"}\n被试可见信息：${visibleFacts}\n目标：${sceneHint}\n开场：${starter}\n如果用户刚才没有回应对方的问题，请给一句能够自然回到当前事情的短句；不要评价用户，也不要编造被试可见信息中没有的事实。`,
        },
        ...formattedMessages,
      ],
      temperature: 0.7,
    });

    const suggestion = completionText(completion) || "你好，我刚下课，准备过去。";

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
    // Keep a trusted browser signed in for the study period. Users can still
    // end the session immediately through the explicit logout control.
    { expiresIn: "30d" },
  );
}

app.get("/api/auth/captcha", (req, res) => {
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
    Pragma: "no-cache",
    Expires: "0",
  });
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
  const { username, password, name, role, captchaId, captchaAnswer, consentAccepted, consentVersion } = req.body || {};
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
  if (consentAccepted !== true || consentVersion !== CONSENT_VERSION) {
    return res.status(400).json({ error: "请阅读并同意测评数据处理与原文记录说明" });
  }
  if (USERS.some((u) => u.username === username)) {
    return res.status(409).json({ error: "该用户名已被注册" });
  }
  const nextId = USERS.reduce((m, u) => Math.max(m, u.id), 0) + 1;
  const user = makeUser({ id: nextId, username, password, role, name });
  user.consent = {
    version: CONSENT_VERSION,
    acceptedAt: new Date().toISOString(),
    scope: ["account", "final_transcript", "assessment_record", "teacher_summary"],
  };
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

function makeBindingCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = Array.from({ length: 6 }, () => alphabet[crypto.randomInt(alphabet.length)]).join("");
  } while (USERS.some((item) => item.role === "teacher" && item.bindCode === code));
  return code;
}

function getStoredUser(userId) {
  return USERS.find((item) => Number(item.id) === Number(userId));
}

function isBoundStudent(teacherId, studentId) {
  return USERS.some((item) => (
    item.role === "student"
    && Number(item.id) === Number(studentId)
    && Number(item.teacherId) === Number(teacherId)
  ));
}

function canAccessTracking(user, studentId) {
  if (user?.role === "teacher") return isBoundStudent(user.id, studentId);
  if (user?.role === "parent") {
    const parent = getStoredUser(user.id);
    return Number(parent?.childId) === Number(studentId);
  }
  return false;
}

function normalizeTrackingScores(scores) {
  if (!scores || typeof scores !== "object") return {};
  return Object.fromEntries(DIMENSION_KEYS.map((key) => {
    const raw = Number(scores[key]);
    return [key, Number.isInteger(raw) && raw >= 1 && raw <= 5 ? raw : null];
  }));
}

function hasTrackingScore(scores) {
  return Object.values(scores).some((value) => Number.isInteger(value) && value >= 1 && value <= 5);
}

// ── Teacher/student binding ─────────────────────────────────────────────────

app.get("/api/teacher/binding-code", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "teacher") return res.status(401).json({ error: "未授权" });

  const teacher = getStoredUser(user.id);
  if (!teacher) return res.status(401).json({ error: "未找到教师账号" });
  if (!teacher.bindCode) {
    teacher.bindCode = makeBindingCode();
    saveUsers();
  }
  res.json({ code: teacher.bindCode });
});

app.post("/api/teacher/binding-code", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "teacher") return res.status(401).json({ error: "未授权" });

  const teacher = getStoredUser(user.id);
  if (!teacher) return res.status(401).json({ error: "未找到教师账号" });
  teacher.bindCode = makeBindingCode();
  saveUsers();
  res.json({ code: teacher.bindCode });
});

app.get("/api/student/binding", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "student") return res.status(401).json({ error: "未授权" });

  const student = getStoredUser(user.id);
  const teacher = student?.teacherId ? getStoredUser(student.teacherId) : null;
  res.json({
    linked: Boolean(teacher?.role === "teacher"),
    teacher: teacher?.role === "teacher" ? { id: teacher.id, name: teacher.name } : null,
    transcriptShareWithTeacher: student?.transcriptShareWithTeacher === true,
  });
});

app.post("/api/student/bind-teacher", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "student") return res.status(401).json({ error: "未授权" });

  const code = String(req.body?.code || "").trim().toUpperCase();
  if (!code) return res.status(400).json({ error: "请输入教师提供的绑定码" });

  const teacher = USERS.find((item) => item.role === "teacher" && item.bindCode === code);
  if (!teacher) return res.status(404).json({ error: "未找到该绑定码，请向教师确认后重试" });

  const student = getStoredUser(user.id);
  if (!student) return res.status(401).json({ error: "未找到学生账号" });
  student.teacherId = teacher.id;
  saveUsers();
  res.json({ ok: true, teacher: { id: teacher.id, name: teacher.name }, transcriptShareWithTeacher: false });
});

app.post("/api/student/transcript-sharing", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "student") return res.status(401).json({ error: "未授权" });

  const student = getStoredUser(user.id);
  if (!student) return res.status(401).json({ error: "未找到学生账号" });
  if (!student.teacherId) return res.status(400).json({ error: "请先关联教师" });

  student.transcriptShareWithTeacher = req.body?.enabled === true;
  saveUsers();
  res.json({ ok: true, transcriptShareWithTeacher: student.transcriptShareWithTeacher });
});

// ── Student endpoints ─────────────────────────────────────────────────────────

app.post("/api/student/session", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "student") return res.status(401).json({ error: "未授权" });
  const { module, moduleName, score, duration, summary, scene, dimensions, evidence, strength, supportNeed, comment, suggestion, transcript, turnFeedback, trainingLevel, sceneSource, sceneTarget } = req.body || {};
  if (rejectBlockedContent(req, res, [
    ...(Array.isArray(transcript) ? transcript.filter((item) => item?.sender === "me").map((item) => item.text) : []),
    ...(Array.isArray(turnFeedback) ? turnFeedback.filter((item) => item?.sender === "me").map((item) => item.text) : []),
  ])) return;
  const session = {
    id: crypto.randomBytes(8).toString("hex"),
    studentId: user.id,
    studentName: user.name,
    studentUsername: user.username,
    module: module || "train",
    moduleName: moduleName || "测评模块",
    scene: scene || "",
    trainingLevel: ["guided", "supported", "independent"].includes(trainingLevel) ? trainingLevel : "",
    sceneSource: sceneSource === "generated" ? "generated" : "library",
    sceneTarget: sanitizeModelText(String(sceneTarget || "")).slice(0, 120),
    score: Number(score) || 0,
    duration: Number(duration) || 0,
    summary: sanitizeModelText(String(summary || "")).slice(0, 3000),
    dimensions: dimensions && typeof dimensions === "object" ? dimensions : {},
    evidence: sanitizeModelText(String(evidence || summary || "")).slice(0, 3000),
    strength: sanitizeModelText(String(strength || "")).slice(0, 3000),
    supportNeed: sanitizeModelText(String(supportNeed || "")).slice(0, 3000),
    comment: sanitizeModelText(String(comment || summary || "")).slice(0, 3000),
    suggestion: sanitizeModelText(String(suggestion || "")).slice(0, 3000),
    transcript: normalizeTranscript(transcript),
    turnFeedback: normalizeTurnFeedback(turnFeedback),
    timestamp: new Date().toISOString(),
  };
  SESSIONS.push(session);
  saveSessions();
  res.json({ ok: true, session });
});

app.get("/api/student/sessions", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "student") return res.status(401).json({ error: "未授权" });

  const sessions = SESSIONS.filter((s) => s.studentId === user.id)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 30);
  res.json(sessions);
});

// ── Longitudinal training observations ─────────────────────────────────────

app.get("/api/tracking/student/:id", (req, res) => {
  const user = getAuthUser(req);
  const studentId = Number(req.params.id);
  if (!user || !["parent", "teacher"].includes(user.role)) return res.status(401).json({ error: "未授权" });
  if (!canAccessTracking(user, studentId)) return res.status(403).json({ error: "无权查看该学员的观察记录" });

  const records = TRACKING
    .filter((record) => Number(record.studentId) === studentId && Number(record.observerId) === Number(user.id))
    .sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp));
  res.json({ records });
});

app.post("/api/tracking/student/:id", (req, res) => {
  const user = getAuthUser(req);
  const studentId = Number(req.params.id);
  if (!user || !["parent", "teacher"].includes(user.role)) return res.status(401).json({ error: "未授权" });
  if (!canAccessTracking(user, studentId)) return res.status(403).json({ error: "无权为该学员保存观察记录" });

  const scores = normalizeTrackingScores(req.body?.scores);
  if (!hasTrackingScore(scores)) return res.status(400).json({ error: "请至少填写一项观察" });
  const student = getStoredUser(studentId);
  if (!student || student.role !== "student") return res.status(404).json({ error: "学员不存在" });

  const record = {
    id: crypto.randomBytes(8).toString("hex"),
    studentId,
    studentName: student.name,
    observerId: user.id,
    observerName: user.name,
    observerRole: user.role,
    window: "过去两周",
    scores,
    note: sanitizeModelText(String(req.body?.note || "")).slice(0, 400),
    timestamp: new Date().toISOString(),
  };
  TRACKING.push(record);
  saveTracking();
  res.json({ ok: true, record });
});

// ── Teacher endpoints ──────────────────────────────────────────────────────

app.get("/api/teacher/students", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "teacher") return res.status(401).json({ error: "未授权" });
  const students = USERS.filter((u) => u.role === "student" && Number(u.teacherId) === Number(user.id)).map((s) => {
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
      lastSession: sorted[0]?.timestamp ? beijingDateKey(sorted[0].timestamp) : null,
      noteCount: NOTES.filter((n) => n.studentId === s.id).length,
    };
  });
  res.json(students);
});

app.get("/api/teacher/student/:id/sessions", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "teacher") return res.status(401).json({ error: "未授权" });
  const studentId = Number(req.params.id);
  if (!isBoundStudent(user.id, studentId)) return res.status(403).json({ error: "该学员未绑定到当前教师" });
  const student = getStoredUser(studentId);
  const canReadTranscript = student?.transcriptShareWithTeacher === true;
  const sessions = SESSIONS.filter((s) => s.studentId === studentId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 30)
    .map((session) => sessionForViewer(session, { includeTranscript: canReadTranscript }));
  res.json(sessions);
});

app.get("/api/teacher/student/:id/notes", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "teacher") return res.status(401).json({ error: "未授权" });
  const studentId = Number(req.params.id);
  if (!isBoundStudent(user.id, studentId)) return res.status(403).json({ error: "该学员未绑定到当前教师" });
  const notes = NOTES.filter((n) => n.studentId === studentId)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json(notes);
});

app.post("/api/teacher/student/:id/note/save", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "teacher") return res.status(401).json({ error: "未授权" });
  const studentId = Number(req.params.id);
  if (!isBoundStudent(user.id, studentId)) return res.status(403).json({ error: "该学员未绑定到当前教师" });
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
      ? sessions.map((s) => {
          const dimensionText = s.dimensions && Object.keys(s.dimensions).length
            ? `；维度分：${Object.entries(s.dimensions).map(([key, value]) => `${key}:${value}`).join("，")}`
            : "";
          return `${beijingDateTime(s.timestamp) || ""} ${s.moduleName || s.module || "测评"}·${s.scene || "未命名情境"} ${s.score}分：${s.summary || "暂无摘要"}${dimensionText}`;
        }).join("\n")
      : "暂无近期会话记录";

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: `你是“语依”系统中的教师端报告助手。
${MEASUREMENT_AI_BOUNDARY}
${SOCIAL_SKILL_DIMENSIONS}
根据教师观察和会话记录，输出结构化教育支持建议。只输出 JSON，不要 markdown。`,
        },
        {
          role: "user",
          content: `学员：${studentName || "该学员"}
教师观察：${observation}
近期会话记录：
${sessionSummary}

请生成：
1. suggestion：2-4 句报告批注，必须结合观察内容和近期记录，指出优势能力、需支持能力和下一步练习方向。
2. homework：1-2 条家庭支持任务，贴合该学员情况。
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

    const raw = completionText(completion);
    const parsed = safeParseJSON(raw);
    res.json(parsed || {
      suggestion: "根据近期表现，建议重点关注情境理解后的信息补充和问题解决表达，并在类似作业提醒、活动邀请等任务中继续收集行为证据。",
      homework: "每天选择一个生活场景，练习说明原因并提出一个清楚的下一步安排。",
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

function parentCanAccessStudent(user, studentId) {
  const parent = getStoredUser(user?.id);
  return user?.role === "parent" && Number(parent?.childId) === Number(studentId);
}

function ssdsRecordForViewer(record) {
  const { answers, ...summary } = record;
  return summary;
}

app.get("/api/parent/student/:id/ssds", (req, res) => {
  const user = getAuthUser(req);
  const studentId = Number(req.params.id);
  if (!user || user.role !== "parent") return res.status(401).json({ error: "未授权" });
  if (!parentCanAccessStudent(user, studentId)) return res.status(403).json({ error: "请先绑定该孩子账号" });

  const records = SSDS_RESPONSES
    .filter((record) => Number(record.studentId) === studentId && Number(record.parentId) === Number(user.id))
    .sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp))
    .map(ssdsRecordForViewer);
  res.json({ instrument: "SSDS 1.0 Mandarin", version: SSDS_VERSION, records });
});

app.post("/api/parent/student/:id/ssds", (req, res) => {
  const user = getAuthUser(req);
  const studentId = Number(req.params.id);
  if (!user || user.role !== "parent") return res.status(401).json({ error: "未授权" });
  if (!parentCanAccessStudent(user, studentId)) return res.status(403).json({ error: "请先绑定该孩子账号" });
  if (req.body?.acknowledged !== true) return res.status(400).json({ error: "请确认已按过去四周的一般表现完成填写" });

  const languageMode = req.body?.languageMode === "nonverbal" ? "nonverbal" : "verbal";
  const itemCount = languageMode === "nonverbal" ? 58 : 71;
  const answers = Object.fromEntries(Array.from({ length: itemCount }, (_, index) => {
    const number = index + 1;
    return [number, Number(req.body?.answers?.[number])];
  }));
  const scores = scoreSsds(answers, languageMode);
  if (!scores) return res.status(400).json({ error: "请完成所有必答题后再保存" });

  const student = getStoredUser(studentId);
  if (!student || student.role !== "student") return res.status(404).json({ error: "学员不存在" });
  const record = {
    id: crypto.randomBytes(8).toString("hex"),
    instrument: "SSDS 1.0 Mandarin",
    version: SSDS_VERSION,
    studentId,
    studentName: student.name,
    parentId: user.id,
    parentName: user.name,
    relationship: sanitizeModelText(String(req.body?.relationship || "")).slice(0, 80),
    languageMode,
    answers,
    scores,
    timestamp: new Date().toISOString(),
  };
  SSDS_RESPONSES.push(record);
  saveSsds();
  res.json({ ok: true, record: ssdsRecordForViewer(record) });
});

app.get("/api/parent/student/:id/summary", (req, res) => {
  const user = getAuthUser(req);
  if (!user || user.role !== "parent") return res.status(401).json({ error: "未授权" });
  const studentId = Number(req.params.id);
  if (!parentCanAccessStudent(user, studentId)) return res.status(403).json({ error: "请先绑定该孩子账号" });
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
  const dimensionScores = Object.fromEntries(DIMENSION_KEYS.map((key) => {
    const scores = allSessions
      .map((session) => Number(session.dimensions?.[key]))
      .filter(Number.isFinite);
    return [key, scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null];
  }));
  const notes = NOTES.filter((n) => n.studentId === studentId).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const latestSsds = SSDS_RESPONSES
    .filter((record) => Number(record.studentId) === studentId && Number(record.parentId) === Number(user.id))
    .sort((left, right) => new Date(right.timestamp) - new Date(left.timestamp))[0];
  res.json({
    student: { id: student.id, name: student.name, username: student.username },
    totalSessions: allSessions.length,
    weekSessions: weekSessions.length,
    avgScore,
    bestModule: bestModule?.moduleName || null,
    dimensionScores,
    modules,
    recentSessions: allSessions.slice(0, 10).map((session) => sessionForViewer(session)),
    recentThreeDaySessions: sessionsFromLatestDates(allSessions).map((session) => sessionForViewer(session)),
    notes,
    latestSsds: latestSsds ? ssdsRecordForViewer(latestSsds) : null,
  });
});

app.post("/api/parent/practice", async (req, res) => {
  try {
    const { childName, weekReport, trends, latestFeedback, latestTracking, latestSsds } = req.body;

    const reportSummary = weekReport
      ? `本周测评 ${weekReport.totalSessions} 次，平均分 ${weekReport.avgScore}，最强模块：${weekReport.bestModule}，进步：${weekReport.improvement}`
      : "本周测评数据暂无";

    const trendSummary = Array.isArray(trends) && trends.length
      ? `最近一周综合得分 ${trends[trends.length - 1]?.overall}，表达清晰 ${trends[trends.length - 1]?.clarity}，共情能力 ${trends[trends.length - 1]?.empathy}`
      : "";

    const feedbackNote = latestFeedback?.homework || "";
    const trackingScores = latestTracking?.scores && typeof latestTracking.scores === "object"
      ? DIMENSION_KEYS
        .map((key) => Number(latestTracking.scores[key]))
        .filter((score) => Number.isInteger(score) && score >= 1 && score <= 5)
      : [];
    const trackingSummary = trackingScores.length
      ? "最近两周训练观察平均 " + (trackingScores.reduce((sum, score) => sum + score, 0) / trackingScores.length).toFixed(1) + "/5；补充观察：" + sanitizeModelText(String(latestTracking?.note || "无")).slice(0, 300)
      : "暂无两周训练观察记录";
    const ssdsSummary = latestSsds?.scores?.total
      ? "最近 SSDS 原始总分 " + latestSsds.scores.total + "/" + latestSsds.scores.max + "，每题平均 " + latestSsds.scores.average + "/5；仅作纵向训练参考，不作诊断判断。"
      : "暂无 SSDS 结果";

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: `你是“语依”系统中的家庭支持助手。
${MEASUREMENT_AI_BOUNDARY}
根据孩子的互动记录和教师反馈为家长生成家庭支持建议。只输出 JSON，不要 markdown。活动要轻松、自然、适合亲子互动，不增加压力。`,
        },
        {
          role: "user",
          content: `孩子：${childName || "孩子"}
测评周报：${reportSummary}
能力趋势：${trendSummary}
教师支持任务：${feedbackNote || "无"}
两周训练观察：${trackingSummary}
SSDS 结果：${ssdsSummary}

请生成：
1. tip：1 句家庭支持的总体提示，温馨鼓励的语气。
2. activities：3 个家庭支持活动，每个有 title 和 desc，贴合孩子当前能力水平，适合日常生活中自然练习六维社会技能。
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

    const raw = completionText(completion);
    const parsed = safeParseJSON(raw);
    res.json(parsed || {
      tip: "把支持放在日常对话里，每次只练一个小目标，保持轻松和可预期。",
      activities: [
        { title: "作业提醒小演练", desc: "用一分钟模拟老师提醒交作业，让孩子练习说明完成情况、原因和下一步安排。" },
        { title: "情绪回应小对话", desc: "家长说出一个低落或着急的情境，让孩子先说出对方可能的感受，再给一句支持性回应。" },
        { title: "家庭计划协商", desc: "围绕周末安排练习表达意愿、询问细节和礼貌确认，重点支持对话维持与问题解决。" },
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
