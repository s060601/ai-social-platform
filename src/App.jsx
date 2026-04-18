import { useMemo, useState } from "react";
import { API_BASE } from "./config";

const scenes = [
  {
    id: 1,
    title: "打招呼",
    subtitle: "校园相遇",
    hint: "练习自然开场和接话",
    starter: "刚下课，你也准备去操场吗？",
  },
  {
    id: 2,
    title: "加入聊天",
    subtitle: "课间交流",
    hint: "练习自然加入群体对话",
    starter: "我们在聊周末去哪玩，你有想法吗？",
  },
  {
    id: 3,
    title: "请求帮助",
    subtitle: "向老师表达需求",
    hint: "练习清楚表达问题和请求",
    starter: "你看起来有点困惑，是遇到什么问题了吗？",
  },
];

const voiceScenarios = [
  {
    id: 1,
    title: "老师来电",
    subtitle: "确认作业情况",
    caller: "班主任",
    opening: "你好，我是老师。我想确认一下你今天的作业完成得怎么样？",
    hint: "练习接电话、简短回应和礼貌结束通话",
    sample: "老师您好，我已经写了一部分，还有两题不会。",
  },
  {
    id: 2,
    title: "同学邀请",
    subtitle: "周末活动电话",
    caller: "同学小林",
    opening: "喂，我们周末想一起去公园，你愿意来吗？",
    hint: "练习回应邀请、表达意愿和继续沟通",
    sample: "可以呀，我愿意去。你们准备几点出发？",
  },
  {
    id: 3,
    title: "请假沟通",
    subtitle: "向老师说明情况",
    caller: "值班老师",
    opening: "你好，我这边在登记情况，你今天为什么没有按时到校呢？",
    hint: "练习说明原因、表达需求和保持清晰",
    sample: "老师您好，我今天早上身体不太舒服，所以来晚了。",
  },
];

const stories = [
  {
    id: 1,
    title: "我想加入同学的聊天",
    scene: "课间，两个同学正在聊周末去哪里玩。你站在旁边，也想加入。",
    options: [
      { id: "a", text: "突然插进去说：我也要去。", feedback: "这样有点突然，别人可能会觉得被打断。" },
      { id: "b", text: "先听一会儿，再说：我也对这个感兴趣，你们在说哪里呀？", feedback: "这是更自然的加入方式，既回应了话题，也给了别人接话空间。" },
      { id: "c", text: "一句话不说，直接走开。", feedback: "这样不会出错，但也失去了参与交流的机会。" },
    ],
    best: "b",
  },
  {
    id: 2,
    title: "我不会做题，想找老师帮忙",
    scene: "上课后半段，你发现一道题一直不会做，心里有点着急。",
    options: [
      { id: "a", text: "老师，这题我不会。", feedback: "已经表达了困难，但可以再更完整一点。" },
      { id: "b", text: "老师，我这一步没太看懂，可以再给我讲一下吗？", feedback: "这句话更清楚，也更容易得到帮助。" },
      { id: "c", text: "算了，不问了。", feedback: "这样可能会让问题一直留着，也会更焦虑。" },
    ],
    best: "b",
  },
  {
    id: 3,
    title: "别人拒绝了我一起玩",
    scene: "你问同学能不能一起参加活动，对方说今天已经约好了别人。",
    options: [
      { id: "a", text: "为什么不带我？", feedback: "这会让对方感到压力，也可能让气氛变僵。" },
      { id: "b", text: "好吧，那下次有机会可以叫我吗？", feedback: "这是更平和的回应，也保留了以后继续互动的可能。" },
      { id: "c", text: "那我再也不找你了。", feedback: "这是情绪化表达，容易伤害关系。" },
    ],
    best: "b",
  },
];

const empathyCases = [
  {
    id: 1,
    title: "朋友考试失利",
    message: "我这次又没考好，感觉自己怎么努力都没用。",
    options: [
      { id: "a", text: "这有什么，大不了下次再考。", feedback: "这句话想安慰对方，但容易显得轻描淡写。" },
      { id: "b", text: "听起来你现在真的很难受，要不要和我说说最担心的是什么？", feedback: "这更有共情感，先接住情绪，再邀请对方继续表达。" },
      { id: "c", text: "那肯定是你没认真复习。", feedback: "这会让对方更受挫，不太适合作为回应。" },
    ],
    best: "b",
  },
  {
    id: 2,
    title: "同学被排除在外",
    message: "他们出去玩都没叫我，我感觉自己特别多余。",
    options: [
      { id: "a", text: "别想太多，可能只是忘了。", feedback: "有安慰意图，但没有先回应对方被忽视的感受。" },
      { id: "b", text: "被忽略确实会很难受，你现在是不是有点失落？", feedback: "先点出对方可能的情绪，这是更好的共情开头。" },
      { id: "c", text: "那你也别理他们了。", feedback: "这样容易让情绪升级，不利于后续关系处理。" },
    ],
    best: "b",
  },
  {
    id: 3,
    title: "家人工作压力大",
    message: "今天事情太多了，我现在一句话都不想说。",
    options: [
      { id: "a", text: "那你先休息一下，我在这儿，等你想说的时候再说。", feedback: "这是比较温和的支持方式，既理解情绪，也不给压力。" },
      { id: "b", text: "你怎么总是这样。", feedback: "这会让对方更难放松，也缺少理解。" },
      { id: "c", text: "那你赶紧把事做完。", feedback: "这更像催促，不是共情。" },
    ],
    best: "a",
  },
];

const navs = [
  { key: "home", label: "首页" },
  { key: "train", label: "训练模块" },
  { key: "assist", label: "辅助模块" },
  { key: "voice", label: "语音通话" },
  { key: "story", label: "社交故事" },
  { key: "empathy", label: "共情模拟" },
  { key: "record", label: "成长记录" },
];

export default function AISocialSkillsPlatform() {
  const [activeTab, setActiveTab] = useState("home");
  const [sceneId, setSceneId] = useState(1);
  const [input, setInput] = useState("");
  const [assistInput, setAssistInput] = useState("");
  const [assistOutput, setAssistOutput] = useState(null);
  const [messages, setMessages] = useState([{ sender: "other", text: scenes[0].starter }]);
  const [history, setHistory] = useState([
    { name: "打招呼", score: 84 },
    { name: "加入聊天", score: 79 },
    { name: "请求帮助", score: 88 },
    { name: "语音通话", score: 81 },
    { name: "社交故事", score: 86 },
    { name: "共情模拟", score: 83 },
  ]);
  const [lastScore, setLastScore] = useState(84);
  const [scoreDetail, setScoreDetail] = useState({
    politeness: 20,
    relevance: 22,
    clarity: 21,
    continuation: 21,
    comment: "整体不错。",
    suggestion: "你好，我正准备去操场。你也是吗？",
  });
  const [chatLoading, setChatLoading] = useState(false);
  const [assistLoading, setAssistLoading] = useState(false);
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  const [voiceScenarioId, setVoiceScenarioId] = useState(1);
  const [voiceConnected, setVoiceConnected] = useState(false);
  const [voiceInput, setVoiceInput] = useState("");
  const [voiceMessages, setVoiceMessages] = useState([{ sender: "caller", text: voiceScenarios[0].opening }]);
  const [voiceStatus, setVoiceStatus] = useState("等待接听");
  const [voiceFeedback, setVoiceFeedback] = useState("接听后进行一轮通话练习，系统会根据你的表达给出反馈。")

  const [storyId, setStoryId] = useState(1);
  const [selectedOption, setSelectedOption] = useState("");
  const [storyFeedback, setStoryFeedback] = useState("请选择一个你最可能会说的话。")

  const [empathyId, setEmpathyId] = useState(1);
  const [selectedEmpathy, setSelectedEmpathy] = useState("");
  const [empathyFeedback, setEmpathyFeedback] = useState("请选择一个你最可能会说的话。")

  const currentScene = useMemo(() => scenes.find((s) => s.id === sceneId) || scenes[0], [sceneId]);
  const currentVoice = useMemo(() => voiceScenarios.find((s) => s.id === voiceScenarioId) || voiceScenarios[0], [voiceScenarioId]);
  const currentStory = useMemo(() => stories.find((s) => s.id === storyId) || stories[0], [storyId]);
  const currentEmpathy = useMemo(() => empathyCases.find((s) => s.id === empathyId) || empathyCases[0], [empathyId]);

  function switchScene(scene) {
    setSceneId(scene.id);
    setMessages([{ sender: "other", text: scene.starter }]);
    setInput("");
    setActiveTab("train");
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || chatLoading) return;

    const userMessage = { sender: "me", text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setChatLoading(true);

    try {
      const [chatRes, scoreRes] = await Promise.all([
        fetch(`${API_BASE}/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sceneTitle: currentScene.title,
            sceneHint: currentScene.hint,
            starter: currentScene.starter,
            messages: nextMessages,
          }),
        }),
        fetch(`${API_BASE}/api/score", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sceneTitle: currentScene.title,
            sceneHint: currentScene.hint,
            userReply: text,
          }),
        }),
      ]);

      const chatData = await chatRes.json();
      const scoreData = await scoreRes.json();

      if (!chatRes.ok) throw new Error(chatData?.detail || chatData?.error || "聊天失败");
      if (!scoreRes.ok) throw new Error(scoreData?.detail || scoreData?.error || "评分失败");

      setMessages((prev) => [...prev, { sender: "other", text: chatData.reply || "我明白你的意思了。" }]);
      setLastScore(scoreData.score || 0);
      setScoreDetail({
        politeness: scoreData.politeness || 0,
        relevance: scoreData.relevance || 0,
        clarity: scoreData.clarity || 0,
        continuation: scoreData.continuation || 0,
        comment: scoreData.comment || "",
        suggestion: scoreData.suggestion || "",
      });
      setHistory((prev) => {
        const filtered = prev.filter((item) => item.name !== currentScene.title);
        return [...filtered, { name: currentScene.title, score: scoreData.score || 0 }];
      });
    } catch (error) {
      setMessages((prev) => [...prev, { sender: "other", text: `出错了：${error.message}` }]);
    } finally {
      setChatLoading(false);
    }
  }

  async function improveAssist() {
    const text = assistInput.trim();
    if (!text || assistLoading) return;
    setAssistLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/assist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || data?.error || "润色失败");
      setAssistOutput(data);
    } catch (error) {
      setAssistOutput({ natural: `出错了：${error.message}`, polite: "", short: "" });
    } finally {
      setAssistLoading(false);
    }
  }

  async function generateLiveSuggestion() {
  if (suggestionLoading) return;
  setSuggestionLoading(true);

  try {
    const res = await fetch(`${API_BASE}/api/suggest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        sceneTitle: currentScene.title,
        sceneHint: currentScene.hint,
        starter: currentScene.starter,
        messages,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data?.detail || data?.error || "生成失败");
    }

    setInput(data?.suggestion || "你好，我刚下课，正准备过去。");
  } catch (error) {
    setInput(`出错了：${error.message}`);
  } finally {
    setSuggestionLoading(false);
  }
}

  function switchVoiceScenario(item) {
    setVoiceScenarioId(item.id);
    setVoiceMessages([{ sender: "caller", text: item.opening }]);
    setVoiceInput("");
    setVoiceConnected(false);
    setVoiceStatus("等待接听");
    setVoiceFeedback("接听后进行一轮通话练习，系统会根据你的表达给出反馈。")
  }

  function startVoiceCall() {
    setVoiceConnected(true);
    setVoiceStatus(`通话中 · ${currentVoice.caller}`);
    setVoiceMessages([{ sender: "caller", text: currentVoice.opening }]);
  }

  function endVoiceCall() {
    setVoiceConnected(false);
    setVoiceStatus("通话已结束");
  }

  function sendVoiceReply() {
    const text = voiceInput.trim();
    if (!text || !voiceConnected) return;

    let callerReply = "好的，我知道了。";
    let feedback = "表达基本清楚，可以再更完整一点。";
    let score = 80;

    if (text.includes("您好") || text.includes("老师")) score += 4;
    if (text.length > 10) score += 4;
    if (text.includes("吗") || text.includes("？")) score += 3;

    if (currentVoice.id === 1) {
      if (text.includes("不会") || text.includes("还没")) {
        callerReply = "好，我知道了。不会的地方明天也可以继续来问我。";
        feedback = "你能说明自己的完成情况，也表达了困难，比较适合电话沟通。";
      } else {
        callerReply = "好的，那你记得按时完成。";
        feedback = "可以再补充一点具体信息，让对方更容易理解。";
      }
    } else if (currentVoice.id === 2) {
      if (text.includes("可以") || text.includes("愿意")) {
        callerReply = "太好了，那我晚点把时间发给你。";
        feedback = "回应自然，也表达了参与意愿。如果再主动问一句时间，会更完整。";
      } else {
        callerReply = "没关系，下次有机会再一起。";
        feedback = "已经表达了态度，但可以说得更礼貌、更完整一些。";
      }
    } else {
      if (text.includes("不舒服") || text.includes("来晚")) {
        callerReply = "明白了，那你先注意休息，有需要再联系老师。";
        feedback = "你把原因说清楚了，适合请假或说明情况的电话场景。";
      } else {
        callerReply = "好的，你可以再说得具体一点。";
        feedback = "电话里更需要把原因讲明白，这样对方才容易理解。";
      }
    }

    const finalScore = Math.min(100, score);
    setVoiceMessages((prev) => [...prev, { sender: "me", text }, { sender: "caller", text: callerReply }]);
    setVoiceFeedback(`${feedback} 本轮参考得分：${finalScore} 分。`);
    setHistory((prev) => {
      const filtered = prev.filter((item) => item.name !== "语音通话");
      return [...filtered, { name: "语音通话", score: finalScore }];
    });
    setVoiceInput("");
  }

  function chooseStoryOption(option) {
    setSelectedOption(option.id);
    const text = option.feedback + (option.id === currentStory.best ? " 这是更推荐的回应方式。" : " 你可以试试更平和、更清楚的表达。");
    setStoryFeedback(text);
    const score = option.id === currentStory.best ? 92 : option.id === "a" ? 68 : 74;
    setHistory((prev) => {
      const filtered = prev.filter((item) => item.name !== "社交故事");
      return [...filtered, { name: "社交故事", score }];
    });
  }

  function chooseEmpathy(option) {
    setSelectedEmpathy(option.id);
    const text = option.feedback + (option.id === currentEmpathy.best ? " 这更像先理解情绪、再给回应。" : " 你可以先接住对方感受，再继续表达。");
    setEmpathyFeedback(text);
    const score = option.id === currentEmpathy.best ? 93 : option.id === "a" ? 75 : 60;
    setHistory((prev) => {
      const filtered = prev.filter((item) => item.name !== "共情模拟");
      return [...filtered, { name: "共情模拟", score }];
    });
  }

  const avg = Math.round(history.reduce((a, b) => a + b.score, 0) / history.length);

  const styles = {
    page: { minHeight: "100vh", background: "#f5f7fb", color: "#1f2a44", fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif' },
    shell: { maxWidth: "1280px", margin: "0 auto", padding: "20px" },
    topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ffffff", borderRadius: "20px", padding: "14px 18px", boxShadow: "0 8px 28px rgba(27,39,94,0.06)", border: "1px solid #e8edf5", marginBottom: "18px", position: "sticky", top: "10px", zIndex: 20 },
    navWrap: { display: "flex", gap: "10px", flexWrap: "wrap" },
    navBtn: (active) => ({ padding: "10px 16px", borderRadius: "12px", border: active ? "1px solid #4f7cff" : "1px solid #e1e7f0", background: active ? "#4f7cff" : "#fff", color: active ? "#fff" : "#445474", fontWeight: 700, cursor: "pointer" }),
    hero: { background: "linear-gradient(135deg, #4f7cff 0%, #79a7ff 100%)", color: "white", borderRadius: "28px", padding: "30px", boxShadow: "0 18px 45px rgba(79,124,255,0.22)", marginBottom: "18px" },
    grid: { display: "grid", gridTemplateColumns: "320px 1fr", gap: "18px" },
    card: { background: "#fff", borderRadius: "24px", padding: "20px", border: "1px solid #e8edf5", boxShadow: "0 8px 28px rgba(27,39,94,0.06)" },
    sectionTitle: { fontSize: "13px", color: "#7584a3", marginBottom: "8px", fontWeight: 700 },
    primaryBtn: { border: "none", background: "#4f7cff", color: "white", borderRadius: "12px", padding: "11px 16px", fontWeight: 700, cursor: "pointer" },
    secondaryBtn: { border: "1px solid #d9e2f0", background: "#fff", color: "#4f5f7f", borderRadius: "12px", padding: "11px 16px", fontWeight: 700, cursor: "pointer" },
    dangerBtn: { border: "1px solid #ffd5d8", background: "#fff2f3", color: "#d14b5a", borderRadius: "12px", padding: "11px 16px", fontWeight: 700, cursor: "pointer" },
    input: { width: "100%", borderRadius: "16px", border: "1px solid #d9e2f0", padding: "14px", boxSizing: "border-box", resize: "vertical", fontSize: "15px", outline: "none" },
    bubble: (mine) => ({ alignSelf: mine ? "flex-end" : "flex-start", background: mine ? "#4f7cff" : "#f2f5fa", color: mine ? "#fff" : "#24314f", borderRadius: mine ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "12px 14px", maxWidth: "78%", lineHeight: 1.65, marginBottom: "10px" }),
    sceneBtn: (active) => ({ width: "100%", textAlign: "left", background: active ? "#eef4ff" : "#fff", border: active ? "2px solid #4f7cff" : "1px solid #e2e8f2", borderRadius: "16px", padding: "14px", marginBottom: "10px", cursor: "pointer" }),
    optionBtn: (active) => ({ width: "100%", textAlign: "left", background: active ? "#eef4ff" : "#fff", border: active ? "2px solid #4f7cff" : "1px solid #e2e8f2", borderRadius: "16px", padding: "14px", marginBottom: "12px", cursor: "pointer", lineHeight: 1.7 }),
    badge: { display: "inline-block", padding: "6px 10px", background: "#eef4ff", color: "#4567da", borderRadius: "999px", fontSize: "12px", fontWeight: 700, marginRight: "8px" },
  };

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.topbar}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "20px" }}>沟通练习</div>
            <div style={{ color: "#7584a3", fontSize: "13px", marginTop: "4px" }}>训练模块 · 辅助模块 · 语音通话 · 社交故事 · 共情模拟</div>
          </div>
          <div style={styles.navWrap}>
            {navs.map((nav) => (
              <button key={nav.key} style={styles.navBtn(activeTab === nav.key)} onClick={() => setActiveTab(nav.key)}>
                {nav.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "home" && (
          <>
            <div style={styles.hero}>
              <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "10px" }}>更自然地说，更安心地回应</div>
              <h1 style={{ margin: 0, fontSize: "42px", lineHeight: 1.15 }}>把日常沟通练得更轻松一点</h1>
              <p style={{ margin: "14px 0 0 0", lineHeight: 1.9, fontSize: "17px", maxWidth: "900px" }}>
                你可以在这里练习聊天开场、加入对话、请求帮助、电话沟通、理解他人情绪，并把常用表达同步到外部聊天平台接口。
              </p>
              <div style={{ display: "flex", gap: "12px", marginTop: "18px", flexWrap: "wrap" }}>
                <button style={styles.primaryBtn} onClick={() => setActiveTab("train")}>进入训练模块</button>
                <button style={styles.secondaryBtn} onClick={() => setActiveTab("assist")}>进入辅助模块</button>
                <button style={styles.secondaryBtn} onClick={() => setActiveTab("empathy")}>体验共情模拟</button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "18px", marginBottom: "18px" }}>
              <div style={styles.card}><div style={styles.sectionTitle}>训练模块</div><h3 style={{ marginTop: 0 }}>文本社交训练</h3><p style={{ color: "#60708f", lineHeight: 1.8 }}>围绕打招呼、加入聊天、请求帮助等场景，进行实时对话训练和反馈。</p></div>
              <div style={styles.card}><div style={styles.sectionTitle}>辅助模块</div><h3 style={{ marginTop: 0 }}>聊天表达辅助</h3><p style={{ color: "#60708f", lineHeight: 1.8 }}>把不会说的话改写成更自然、更礼貌、更简洁的版本。</p></div>
              <div style={styles.card}><div style={styles.sectionTitle}>语音通话</div><h3 style={{ marginTop: 0 }}>电话场景模拟</h3><p style={{ color: "#60708f", lineHeight: 1.8 }}>练习接听、说明情况、回应邀请和结束通话。</p></div>
              <div style={styles.card}><div style={styles.sectionTitle}>共情模拟</div><h3 style={{ marginTop: 0 }}>理解情绪并回应</h3><p style={{ color: "#60708f", lineHeight: 1.8 }}>在别人失落、受挫、疲惫时，练习更有共情感的表达方式。</p></div>
            </div>

            <div style={styles.card}>
              <div style={styles.sectionTitle}>外部聊天平台接入</div>
              <div style={{ marginBottom: "12px" }}>
                <span style={styles.badge}>API 预留</span>
                <span style={styles.badge}>聊天助手</span>
                <span style={styles.badge}>消息回调</span>
              </div>
              <p style={{ color: "#60708f", lineHeight: 1.9, margin: 0 }}>
                当前已预留外部聊天平台接入思路，可对接企业微信、飞书、Telegram Bot、Discord Bot 等开放 API 平台；若要接入真实聊天软件，需要对应平台的开发者权限、密钥和回调地址配置。
              </p>
            </div>
          </>
        )}

        {activeTab === "train" && (
          <div style={styles.grid}>
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div style={styles.card}>
                <div style={styles.sectionTitle}>训练模块</div>
                {scenes.map((scene) => (
                  <button key={scene.id} style={styles.sceneBtn(scene.id === sceneId)} onClick={() => switchScene(scene)}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <strong>{scene.title}</strong>
                      <span style={{ color: "#7f8cab", fontSize: "13px" }}>{scene.subtitle}</span>
                    </div>
                    <div style={{ color: "#60708f", fontSize: "14px" }}>{scene.hint}</div>
                  </button>
                ))}
              </div>

              <div style={styles.card}>
                <div style={styles.sectionTitle}>当前训练目标</div>
                <h3 style={{ marginTop: 0 }}>{currentScene.title}</h3>
                <p style={{ color: "#60708f", lineHeight: 1.8 }}>{currentScene.hint}</p>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div style={styles.card}>
                <div style={styles.sectionTitle}>对话练习</div>
                <div style={{ background: "#fbfcff", border: "1px solid #ebf0f7", borderRadius: "18px", padding: "16px", minHeight: "280px", display: "flex", flexDirection: "column" }}>
                  {messages.map((msg, idx) => <div key={idx} style={styles.bubble(msg.sender === "me")}>{msg.text}</div>)}
                  {chatLoading && <div style={styles.bubble(false)}>正在思考中…</div>}
                </div>
                <div style={{ marginTop: "14px" }}>
                  <textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="输入你的回答……" style={{ ...styles.input, minHeight: "90px" }} />
                  <div style={{ display: "flex", gap: "10px", marginTop: "12px", flexWrap: "wrap" }}>
                    <button style={styles.primaryBtn} onClick={sendMessage}>发送</button>
                    <button style={styles.secondaryBtn} onClick={generateLiveSuggestion}>{suggestionLoading ? "生成中..." : "AI示范一句"}</button>
                  </div>
                </div>
              </div>

              <div style={styles.card}>
                <div style={styles.sectionTitle}>训练反馈</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
                  <div style={{ background: "#f7f9fd", borderRadius: "14px", padding: "14px" }}><div style={{ color: "#7584a3", fontSize: "13px" }}>礼貌表达</div><div style={{ fontSize: "24px", fontWeight: 800, marginTop: "6px" }}>{scoreDetail.politeness}</div></div>
                  <div style={{ background: "#f7f9fd", borderRadius: "14px", padding: "14px" }}><div style={{ color: "#7584a3", fontSize: "13px" }}>情境相关</div><div style={{ fontSize: "24px", fontWeight: 800, marginTop: "6px" }}>{scoreDetail.relevance}</div></div>
                  <div style={{ background: "#f7f9fd", borderRadius: "14px", padding: "14px" }}><div style={{ color: "#7584a3", fontSize: "13px" }}>表达清晰</div><div style={{ fontSize: "24px", fontWeight: 800, marginTop: "6px" }}>{scoreDetail.clarity}</div></div>
                  <div style={{ background: "#f7f9fd", borderRadius: "14px", padding: "14px" }}><div style={{ color: "#7584a3", fontSize: "13px" }}>延续对话</div><div style={{ fontSize: "24px", fontWeight: 800, marginTop: "6px" }}>{scoreDetail.continuation}</div></div>
                </div>
                <div style={{ marginTop: "14px", background: "#eef4ff", borderRadius: "14px", padding: "14px" }}>
                  当前总分：<strong>{lastScore}</strong> 分
                  <div style={{ marginTop: "8px", lineHeight: 1.7 }}>{scoreDetail.comment}</div>
                  <div style={{ marginTop: "8px", color: "#4f5f7f" }}>示例优化：{scoreDetail.suggestion}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "assist" && (
          <div style={{ maxWidth: "880px", margin: "0 auto" }}>
            <div style={styles.card}>
              <div style={styles.sectionTitle}>辅助模块</div>
              <h2 style={{ marginTop: 0 }}>把不会说的话，改成更自然的话</h2>
              <p style={{ color: "#60708f", lineHeight: 1.8 }}>这里更偏向真实使用场景，也可以作为外部聊天平台 API 的中间辅助层。</p>
              <textarea value={assistInput} onChange={(e) => setAssistInput(e.target.value)} placeholder="例如：老师这题我不会 / 我也想一起去" style={{ ...styles.input, minHeight: "120px" }} />
              <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                <button style={styles.primaryBtn} onClick={improveAssist}>{assistLoading ? "生成中..." : "生成建议"}</button>
                <button style={styles.secondaryBtn} onClick={() => setAssistInput("")}>清空</button>
              </div>
              <div style={{ marginTop: "16px", display: "grid", gap: "12px" }}>
                <div style={{ background: "#f7f9fd", borderRadius: "16px", padding: "16px" }}><div style={{ color: "#7584a3", fontSize: "13px", marginBottom: "6px" }}>更自然</div><div>{assistOutput?.natural || "这里会显示更自然的表达。"}</div></div>
                <div style={{ background: "#f7f9fd", borderRadius: "16px", padding: "16px" }}><div style={{ color: "#7584a3", fontSize: "13px", marginBottom: "6px" }}>更礼貌</div><div>{assistOutput?.polite || "这里会显示更礼貌的表达。"}</div></div>
                <div style={{ background: "#f7f9fd", borderRadius: "16px", padding: "16px" }}><div style={{ color: "#7584a3", fontSize: "13px", marginBottom: "6px" }}>更简短</div><div>{assistOutput?.short || "这里会显示更简短的表达。"}</div></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "voice" && (
          <div style={styles.grid}>
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div style={styles.card}>
                <div style={styles.sectionTitle}>选择通话情境</div>
                {voiceScenarios.map((item) => (
                  <button key={item.id} style={styles.sceneBtn(item.id === voiceScenarioId)} onClick={() => switchVoiceScenario(item)}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <strong>{item.title}</strong>
                      <span style={{ color: "#7f8cab", fontSize: "13px" }}>{item.subtitle}</span>
                    </div>
                    <div style={{ color: "#60708f", fontSize: "14px" }}>{item.hint}</div>
                  </button>
                ))}
              </div>

              <div style={styles.card}>
                <div style={styles.sectionTitle}>通话状态</div>
                <div style={{ fontSize: "28px", fontWeight: 800, marginBottom: "8px" }}>{currentVoice.caller}</div>
                <div style={{ color: "#60708f", marginBottom: "14px" }}>{voiceStatus}</div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button style={styles.primaryBtn} onClick={startVoiceCall}>接听</button>
                  <button style={styles.dangerBtn} onClick={endVoiceCall}>挂断</button>
                  <button style={styles.secondaryBtn} onClick={() => setVoiceInput(currentVoice.sample)}>示范一句</button>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div style={styles.card}>
                <div style={styles.sectionTitle}>通话模拟</div>
                <div style={{ background: "#fbfcff", border: "1px solid #ebf0f7", borderRadius: "18px", padding: "16px", minHeight: "280px", display: "flex", flexDirection: "column" }}>
                  {voiceMessages.map((msg, idx) => <div key={idx} style={styles.bubble(msg.sender === "me")}>{msg.text}</div>)}
                </div>
                <div style={{ marginTop: "14px" }}>
                  <textarea value={voiceInput} onChange={(e) => setVoiceInput(e.target.value)} placeholder="输入你在通话中会说的话……" style={{ ...styles.input, minHeight: "90px" }} />
                  <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                    <button style={styles.primaryBtn} onClick={sendVoiceReply}>发送通话回应</button>
                  </div>
                </div>
              </div>

              <div style={styles.card}>
                <div style={styles.sectionTitle}>通话反馈</div>
                <div style={{ background: "#eef4ff", borderRadius: "14px", padding: "16px", lineHeight: 1.8 }}>{voiceFeedback}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "story" && (
          <div style={styles.grid}>
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div style={styles.card}>
                <div style={styles.sectionTitle}>选择故事</div>
                {stories.map((item) => (
                  <button key={item.id} style={styles.sceneBtn(item.id === storyId)} onClick={() => { setStoryId(item.id); setSelectedOption(""); setStoryFeedback("请选择一个你最可能会说的话。"); }}>
                    <strong>{item.title}</strong>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div style={styles.card}>
                <div style={styles.sectionTitle}>社交故事</div>
                <h2 style={{ marginTop: 0 }}>{currentStory.title}</h2>
                <div style={{ background: "#f7f9fd", borderRadius: "16px", padding: "16px", lineHeight: 1.85, color: "#31415f", marginBottom: "16px" }}>{currentStory.scene}</div>
                {currentStory.options.map((option) => (
                  <button key={option.id} style={styles.optionBtn(selectedOption === option.id)} onClick={() => chooseStoryOption(option)}>
                    {option.text}
                  </button>
                ))}
              </div>

              <div style={styles.card}>
                <div style={styles.sectionTitle}>故事反馈</div>
                <div style={{ background: "#eef4ff", borderRadius: "14px", padding: "16px", lineHeight: 1.8 }}>{storyFeedback}</div>
                <div style={{ marginTop: "14px" }}>
                  <button style={styles.primaryBtn} onClick={() => setActiveTab("train")}>进入情境训练</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "empathy" && (
          <div style={styles.grid}>
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div style={styles.card}>
                <div style={styles.sectionTitle}>选择共情情境</div>
                {empathyCases.map((item) => (
                  <button key={item.id} style={styles.sceneBtn(item.id === empathyId)} onClick={() => { setEmpathyId(item.id); setSelectedEmpathy(""); setEmpathyFeedback("请选择一个你最可能会说的话。"); }}>
                    <strong>{item.title}</strong>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div style={styles.card}>
                <div style={styles.sectionTitle}>共情能力模拟</div>
                <h2 style={{ marginTop: 0 }}>{currentEmpathy.title}</h2>
                <div style={{ background: "#f7f9fd", borderRadius: "16px", padding: "16px", lineHeight: 1.85, color: "#31415f", marginBottom: "16px" }}>
                  对方说：{currentEmpathy.message}
                </div>
                {currentEmpathy.options.map((option) => (
                  <button key={option.id} style={styles.optionBtn(selectedEmpathy === option.id)} onClick={() => chooseEmpathy(option)}>
                    {option.text}
                  </button>
                ))}
              </div>

              <div style={styles.card}>
                <div style={styles.sectionTitle}>共情反馈</div>
                <div style={{ background: "#eef4ff", borderRadius: "14px", padding: "16px", lineHeight: 1.8 }}>{empathyFeedback}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "record" && (
          <div style={{ maxWidth: "880px", margin: "0 auto" }}>
            <div style={styles.card}>
              <div style={styles.sectionTitle}>成长记录</div>
              <h2 style={{ marginTop: 0 }}>最近表现</h2>
              <div style={{ background: "#eef4ff", borderRadius: "16px", padding: "16px", marginBottom: "16px" }}>平均得分：<strong>{avg}</strong> 分</div>
              {history.map((item) => (
                <div key={item.name} style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: "1px solid #edf1f7" }}>
                  <span>{item.name}</span>
                  <strong style={{ color: "#4f7cff" }}>{item.score} 分</strong>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
