console.log("🔥 server.js 已启动");

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
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
