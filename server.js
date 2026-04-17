console.log("🔥 server.js 已启动");
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://ai-social-platform.vercel.app",
    ],
  })
);
app.use(express.json());

const port = process.env.PORT || 3001;

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

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "server is running" });
});

app.get("/", (req, res) => {
  res.send("backend is running");
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "server is running" });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { sceneTitle, sceneHint, starter, messages } = req.body;

    if (!sceneTitle || !starter || !Array.isArray(messages)) {
      return res.status(400).json({ error: "参数不完整" });
    }

    const systemPrompt = `
你是一个“孤独症青少年社会技能训练平台”中的互动角色。
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

app.get("/", (req, res) => {
  res.send("backend is running");
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "server is running" });
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

app.get("/", (req, res) => {
  res.send("backend is running");
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "server is running" });
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

app.get("/", (req, res) => {
  res.send("backend is running");
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "server is running" });
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
你的任务不是闲聊，而是根据当前社交场景，生成一句用户可以直接参考的回复。

要求：
1. 只输出一句中文，不要解释。
2. 语气自然、简短、口语化。
3. 必须紧扣当前场景，不要跑题。
4. 回复长度控制在10到25个字左右。
5. 如果是开场阶段，要像真实聊天里的第一轮回应。`,
        },
        {
          role: "user",
          content: `当前场景：${sceneTitle}\n训练目标：${sceneHint}\n开场白：${starter}`,
        },
        ...formattedMessages,
      ],
      temperature: 0.7,
    });

    const suggestion =
      completion.choices?.[0]?.message?.content?.trim() ||
      "你好，我刚下课，正准备过去。";

    res.json({ suggestion });
  } catch (error) {
    console.error("/api/suggest error:", error);
    res.status(500).json({
      error: "示范生成失败",
      detail: error?.message || "unknown error",
    });
  }
});

    const prompt = `
你是一个“沟通练习”产品中的示范回复助手。
你的任务不是和用户闲聊，而是根据当前社交场景，生成一句适合用户直接参考的回复。

要求：
1. 只输出一句中文，不要解释。
2. 语气自然、简短、口语化。
3. 必须紧扣当前场景，不要跑题。
4. 回复长度控制在 10 到 25 个字左右。
5. 如果是开场场景，要像真实聊天里的第一轮回应。
6. 如果已有对话历史，要结合最后一条对方消息来生成。

当前场景：${sceneTitle}
训练目标：${sceneHint}
开场白：${starter}
对话历史：${JSON.stringify(messages || [])}
`;

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
    });

    const suggestion =
      completion.choices?.[0]?.message?.content?.trim() || "你好，我刚下课，正准备过去。";

    res.json({ suggestion });
  } catch (error) {
    console.error("/api/suggest error:", error);
    res.status(500).json({
      error: "示范生成失败",
      detail: error?.message || "unknown error",
    });
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