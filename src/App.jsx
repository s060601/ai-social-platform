import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "./config";

const scenes = [
  {
    id: 1,
    title: "老师提醒交作业",
    subtitle: "校园学习场景",
    role: "班主任",
    roleStyle: "你是班主任。先礼貌地叫住学生确认情况，不把忘交作业说成指责；学生说明后，用日常口吻回应，再自然询问下一步安排。",
    setting: "课间，老师发现你今天的作业还没有交，叫住你确认情况。",
    hint: "测评情境理解、责任说明、礼貌表达、对话维持和问题解决",
    target: "观察学员能否理解老师意图，并说明作业状态、困难与补救安排。",
    starter: "同学，方便耽误你一分钟吗？今天的作业我这里还没收到。",
    expected: ["理解老师在提醒交作业", "说明已交或未交原因", "表达歉意或接受提醒", "提出具体补交办法", "回应追问并维持对话"],
    indicators: ["情境理解", "社会语用", "礼貌规范", "对话维持", "问题解决"],
  },
  {
    id: 2,
    title: "同学邀请参加活动",
    subtitle: "同伴交往场景",
    role: "同学小南",
    roleStyle: "你是同龄同学小南。你在放学后约对方周末一起出去，语气轻松自然；根据对方的意愿顺着聊时间、地点或其他安排。",
    setting: "放学后，同学在教室门口约你周末一起出去。",
    hint: "测评回应邀请、表达意愿、协商细节和主动延续",
    target: "观察学员能否在同伴邀请中表达意愿、询问安排并保持自然交流。",
    starter: "周六下午我们打算去公园，你要一起吗？",
    expected: ["回应邀请", "说明愿意或不方便的原因", "主动询问时间地点", "保持友好语气"],
    indicators: ["社会语用", "对话维持", "礼貌规范"],
  },
  {
    id: 3,
    title: "向老师请求帮助",
    subtitle: "校园学习场景",
    role: "数学老师",
    roleStyle: "你是数学老师。发现学生做题卡住时，主动上前问一句；不催促、不直接给答案，先听学生说清哪里卡住。",
    setting: "做题时你停住了，老师走过来看了一眼。",
    hint: "测评清楚表达困难、提出请求和回应老师追问",
    target: "观察学员能否具体说明卡住的位置，并用适切方式请求支持。",
    starter: "这道题卡住了吗？要不要先说说你做到哪一步了？",
    expected: ["说出遇到的具体困难", "提出明确帮助请求", "回应老师的澄清问题"],
    indicators: ["情境理解", "社会语用", "问题解决"],
  },
  {
    id: 4,
    title: "和家长说明安排",
    subtitle: "家庭沟通场景",
    role: "妈妈",
    roleStyle: "你是放学后等孩子回家的妈妈。语气关心但不责备；先确认人是否安全、在哪里，再一起商量怎么回家。",
    setting: "放学后，家长到校门口接你，却一时没看见你。",
    hint: "测评家庭沟通中的原因说明、需求表达和协商能力",
    target: "观察学员能否向家长说明计划变动，并协商下一步安排。",
    starter: "我到学校门口了，没看到你，就打电话问问。你现在是在教室，还是已经出来了？",
    expected: ["说明原因", "回应家长担心", "提出清楚安排", "保持礼貌和稳定语气"],
    indicators: ["情境理解", "礼貌规范", "问题解决"],
  },
  {
    id: 5,
    title: "朋友情绪低落",
    subtitle: "情绪支持场景",
    role: "朋友小雨",
    roleStyle: "你是同龄朋友小雨。你今天心情不好，但不强迫对方安慰；对方愿意听时，再自然说一点自己的感受。",
    setting: "朋友私下跟你说今天心情不好。",
    hint: "测评情绪识别、共情回应和继续倾听",
    target: "观察学员能否识别对方情绪，并用支持性语言邀请对方表达。",
    starter: "我今天有点烦，不太想说话。",
    expected: ["识别对方失落情绪", "先回应感受", "避免评价或催促", "提出愿意倾听"],
    indicators: ["情绪回应", "社会语用", "对话维持"],
  },
  {
    id: 6,
    title: "同学私聊约搭档",
    subtitle: "网络交流场景",
    role: "同学小周",
    roleStyle: "你是同龄同学小周，在私聊里约对方周末义卖时一起负责收款。语气像真实聊天，不像公告；根据对方回复确认是否方便和具体安排。",
    setting: "放学回家后，你用电脑查看班级群里的周末义卖安排。同学私聊你，想和你一起负责收款。",
    hint: "测评线上表达的清晰度、边界感和社会规范",
    target: "观察学员能否在私聊中清楚表达意愿、确认安排并保持自然交流。",
    starter: "我刚在群里看到你也报了周末的义卖。要不要咱俩一起负责收款？",
    expected: ["回应邀请", "表达是否方便", "确认活动安排", "语气自然礼貌"],
    indicators: ["社会语用", "礼貌规范", "情境理解"],
  },
];

const voiceScenarios = [
  {
    id: 1,
    title: "老师来电询问缺勤",
    subtitle: "缺勤情况电话",
    caller: "班主任",
    opening: "同学，你今天没来上课，是什么情况呀？",
    hint: "测评电话中说明情况、回应关心和补充必要信息",
    sample: "老师，家里知道。我今天身体不太舒服，已经和家长说过了。",
    roleStyle: "你是一位关心学生情况的班主任。先问候、确认情况，语气平和，不责备；在学生说明后，再自然确认是否需要请假或转达家长。",
  },
  {
    id: 2,
    title: "同学打电话借笔记",
    subtitle: "同伴求助电话",
    caller: "同学小林",
    opening: "你数学笔记能借我拍一下吗？我昨天那页没记全。",
    hint: "练习回应同伴请求、说明是否方便和协商方式",
    sample: "可以，我等会儿拍给你。你是要昨天讲例题那一页吗？",
    roleStyle: "你是同龄同学小林，正在电话里借笔记。语气自然，不催促；可以确认是否方便、要哪一页、什么时候发。",
  },
  {
    id: 3,
    title: "家长来电接你放学",
    subtitle: "放学接送电话",
    caller: "家长",
    opening: "我到校门口啦，你还在教室吗？不着急，收拾好了跟我说一声，我在这儿等你。",
    hint: "练习说明当前位置、预计时间和临时安排",
    sample: "我还在教室收书包，大概五分钟后出来。",
    roleStyle: "你是正在校门口等孩子的家长。语气自然、关心，不催促；可以确认孩子在哪儿、还要多久，以及是否需要帮忙。",
  },
  {
    id: 4,
    title: "服务台确认位置",
    subtitle: "公共场所电话",
    caller: "服务台工作人员",
    opening: "你好，我是服务台的小周。老师说你可能在找集合点，你现在附近有什么明显的地方吗？",
    hint: "测评公共情境中的问题描述、求助表达和信息补充",
    sample: "您好，我找不到集合地点了。我现在在一楼入口，能请您告诉我怎么走吗？",
    roleStyle: "你是公共场所服务台的小周。语气清楚、耐心；先根据用户描述确认位置，再说明怎么走，必要时主动提出过去接人。",
  },
  {
    id: 5,
    title: "朋友打电话倾诉",
    subtitle: "情绪支持电话",
    caller: "朋友小雨",
    opening: "你现在方便说几句吗？我刚才和同学闹别扭了，心里挺堵的。",
    hint: "测评情绪识别、共情回应和继续倾听",
    sample: "听起来你今天真的很难受。我愿意听你说，发生什么了？",
    roleStyle: "你是同龄朋友小雨，想找朋友聊聊刚才的不愉快。语气真实、简短；不急着下结论，只有在对方愿意听时再慢慢说发生了什么。",
  },
  {
    id: 6,
    title: "同学来电约同行",
    subtitle: "活动安排电话",
    caller: "同学小周",
    opening: "喂，你现在方便说话吗？明天下午的活动我也去，咱们要不要一起过去？",
    hint: "练习回应同伴邀请、确认时间地点和协商出行安排",
    sample: "可以呀。我从学校门口过去，你想几点碰面？",
    roleStyle: "你是同龄同学小周，打电话约对方一起去参加活动。语气轻松、自然；可以一起确认是否方便、在哪里碰面、怎么过去。",
  },
];

const assessmentDimensions = [
  { key: "contextUnderstanding", label: "情境理解", desc: "能否理解对方意图、当前关系和任务要求。", score: 84 },
  { key: "socialPragmatics", label: "社会语用", desc: "表达是否贴合语境、对象和交流目的。", score: 80 },
  { key: "emotionResponse", label: "情绪回应", desc: "能否识别情绪并作出支持性回应。", score: 76 },
  { key: "normExpression", label: "礼貌规范", desc: "是否使用礼貌、清晰、合适的社会规范表达。", score: 86 },
  { key: "dialogueMaintenance", label: "对话维持", desc: "能否回应追问、补充信息并推动对话。", score: 78 },
  { key: "problemSolving", label: "问题解决", desc: "能否提出下一步安排、协商或补救方案。", score: 75 },
];

const taskCategories = [
  "校园学习场景",
  "同伴交往场景",
  "家庭沟通场景",
  "公共生活场景",
  "情绪支持场景",
  "网络交流场景",
];

const reportSections = [
  "社会技能综合得分",
  "六个一级维度得分",
  "具体行为表现证据",
  "优势能力分析",
  "需支持能力分析",
  "典型情境表现",
  "教育支持建议",
  "后续测评与个体化支持建议",
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
  { key: "train", label: "情境互动" },
  { key: "assist", label: "把话说清楚一点" },
  { key: "voice", label: "语音通话" },
  { key: "record", label: "我的记录" },
];

const STUDENT_HISTORY_KEY = "yuyi_student_history";

function getStudentHistoryKey() {
  const token = localStorage.getItem("yuyi_token");
  if (!token) return `${STUDENT_HISTORY_KEY}:anonymous`;

  try {
    const payload = token.split(".")[1]?.replace(/-/g, "+").replace(/_/g, "/");
    const user = JSON.parse(atob(payload));
    return `${STUDENT_HISTORY_KEY}:${user.id || user.username || "unknown"}`;
  } catch {
    return `${STUDENT_HISTORY_KEY}:unknown`;
  }
}

function recentDateModuleGroups(records, maxDates = 3) {
  const dates = [];
  const groupedByDate = {};

  records.forEach((record) => {
    const date = record.timestamp ? record.timestamp.slice(0, 10) : "未标注日期";
    if (!dates.includes(date) && dates.length < maxDates) dates.push(date);
    if (!dates.includes(date)) return;

    const moduleName = record.moduleName || record.module || "互动练习";
    const sceneName = record.scene || record.name || "未命名情境";
    const moduleKey = `${moduleName}::${sceneName}`;
    const day = (groupedByDate[date] ||= {});
    const moduleGroup = (day[moduleKey] ||= {
      key: moduleKey,
      moduleName,
      sceneName,
      sessions: [],
    });
    moduleGroup.sessions.push(record);
  });

  return dates.map((date) => ({
    date,
    modules: Object.values(groupedByDate[date] || {}),
  }));
}

function normalizeComparableText(value) {
  return String(value || "")
    .replace(/\s+/g, "")
    .replace(/[，。！？、,.!?;；:：“”‘’'"（）()【】\[\]…—-]/g, "")
    .toLowerCase();
}

function getStudentOriginalTexts(item) {
  const transcriptTexts = Array.isArray(item.transcript)
    ? item.transcript
      .filter((turn) => turn?.speaker === "student" || turn?.sender === "me")
      .map((turn) => turn?.text)
    : [];
  const feedbackTexts = Array.isArray(item.turnFeedback)
    ? item.turnFeedback.map((turn) => turn?.text)
    : [];
  return [...transcriptTexts, ...feedbackTexts]
    .map((text) => String(text || "").trim())
    .filter(Boolean);
}

function isStudentOriginal(value, studentTexts) {
  const normalized = normalizeComparableText(value);
  return Boolean(normalized) && studentTexts.some((text) => normalizeComparableText(text) === normalized);
}

function containsStudentOriginal(value, studentTexts) {
  const normalized = normalizeComparableText(value);
  return Boolean(normalized) && studentTexts.some((text) => {
    const original = normalizeComparableText(text);
    return original.length >= 2 && normalized.includes(original);
  });
}

function getUsefulSessionFeedback(item) {
  const studentTexts = getStudentOriginalTexts(item);
  const feedbacks = Array.isArray(item.turnFeedback) ? item.turnFeedback : [];
  const pickUseful = (candidates) => candidates.find((value) => {
    const text = String(value || "").trim();
    return text && !isStudentOriginal(text, studentTexts) && !containsStudentOriginal(text, studentTexts);
  }) || "";

  return {
    analysis: pickUseful([
      item.evidence,
      item.comment,
      item.summary,
      ...feedbacks.slice().reverse().map((turn) => turn?.analysis),
    ]),
    suggestion: pickUseful([
      item.suggestion,
      item.supportNeed,
      ...feedbacks.slice().reverse().map((turn) => turn?.suggestion),
    ]),
  };
}

function getLowestScoredDimensionAdvice(item) {
  const dimensions = item?.dimensions || {};
  const dimensionAdvice = [
    ["contextUnderstanding", "先接住对方正在说的事，再补充自己的情况。"],
    ["socialPragmatics", "可以把想法说得更完整一点，让对方更容易明白。"],
    ["emotionResponse", "可以先回应一下对方的感受或态度，再说自己的想法。"],
    ["normExpression", "可以自然地加上称呼、请或谢谢，让表达更合适。"],
    ["dialogueMaintenance", "回应后可以再补一句问题或想法，让对话继续下去。"],
    ["problemSolving", "说明情况后，可以试着补一句你打算怎么做。"],
  ]
    .map(([key, advice]) => ({ key, advice, value: Number(dimensions[key]) }))
    .filter((item) => Number.isFinite(item.value) && item.value > 0)
    .sort((a, b) => a.value - b.value);
  return dimensionAdvice[0]?.advice || "可以根据对方的回应，再补充一句自己的想法。";
}

function getScoreGuidedFeedback(item) {
  const feedback = getUsefulSessionFeedback(item);
  const studentTexts = getStudentOriginalTexts(item);
  const strength = String(item?.strength || "").trim();
  const usefulStrength = strength && !isStudentOriginal(strength, studentTexts) && !containsStudentOriginal(strength, studentTexts)
    ? strength
    : "";
  const score = Number(item?.score) || 0;

  if (score >= 80) {
    return {
      analysis: feedback.analysis,
      guidanceLabel: "做得很好",
      guidance: usefulStrength || "这次回应比较完整，也贴合当前情境，可以保持这样的表达方式。",
    };
  }

  if (score >= 60) {
    return {
      analysis: feedback.analysis,
      guidanceLabel: "下次可以试试",
      guidance: feedback.suggestion || getLowestScoredDimensionAdvice(item),
    };
  }

  return {
    analysis: feedback.analysis || "这次的回应信息还不够，暂时难以完整判断你的想法。",
    guidanceLabel: "可以从这里开始",
    guidance: feedback.suggestion || getLowestScoredDimensionAdvice(item),
  };
}

function getTurnSpecificFeedback(turn, feedbackEntries, session, isLatestStudentTurn) {
  if (!turn || (turn.speaker !== "student" && turn.sender !== "me")) return null;

  const originalText = normalizeComparableText(turn.text);
  if (!originalText) return null;

  const matched = feedbackEntries
    .slice()
    .reverse()
    .find((entry) => {
      const entryText = normalizeComparableText(entry?.text);
      return entryText && entryText === originalText && (entry?.analysis || entry?.suggestion);
    });

  if (!matched) {
    // Earlier records stored one scored response as session-level feedback rather
    // than in turnFeedback. It belongs only to that session's final student turn.
    if (!isLatestStudentTurn) return null;
    const sessionFeedback = getScoreGuidedFeedback(session);
    if (!sessionFeedback.analysis && !sessionFeedback.guidance) return null;
    return {
      analysis: sessionFeedback.analysis,
      suggestion: sessionFeedback.guidance,
      guidanceLabel: sessionFeedback.guidanceLabel,
    };
  }

  const analysis = String(matched.analysis || "").trim();
  const suggestion = String(matched.suggestion || "").trim();
  if (!analysis && !suggestion) return null;

  return { analysis, suggestion, guidanceLabel: "下次可以试试" };
}

function getSessionTranscript(session) {
  return Array.isArray(session?.transcript)
    ? session.transcript.filter((turn) => String(turn?.text || "").trim())
    : [];
}

function isTranscriptContinuation(previousTranscript, nextTranscript) {
  if (!previousTranscript.length || nextTranscript.length < previousTranscript.length) return false;

  return previousTranscript.every((turn, index) => {
    const nextTurn = nextTranscript[index];
    const sameSpeaker = (turn.speaker || turn.sender) === (nextTurn?.speaker || nextTurn?.sender);
    return sameSpeaker && normalizeComparableText(turn.text) === normalizeComparableText(nextTurn?.text);
  });
}

function buildCompletePracticeAttempts(sessions) {
  const orderedSnapshots = [...sessions].sort((left, right) => {
    const timeDiff = new Date(left.timestamp || 0) - new Date(right.timestamp || 0);
    if (timeDiff !== 0) return timeDiff;
    return getSessionTranscript(left).length - getSessionTranscript(right).length;
  });
  const attempts = [];

  orderedSnapshots.forEach((snapshot) => {
    const transcript = getSessionTranscript(snapshot);
    const currentAttempt = attempts[attempts.length - 1];
    const elapsed = currentAttempt
      ? Math.abs(new Date(snapshot.timestamp || 0) - new Date(currentAttempt.latest.timestamp || 0))
      : Infinity;
    const isSamePractice = currentAttempt
      && elapsed <= 10 * 60 * 1000
      && isTranscriptContinuation(currentAttempt.transcript, transcript);

    if (!isSamePractice) {
      attempts.push({
        id: snapshot.id || `${snapshot.timestamp}-${attempts.length}`,
        latest: snapshot,
        transcript,
        snapshots: [snapshot],
      });
      return;
    }

    currentAttempt.snapshots.push(snapshot);
    currentAttempt.latest = snapshot;
    if (transcript.length >= currentAttempt.transcript.length) currentAttempt.transcript = transcript;
  });

  return attempts
    .map((attempt) => {
      const feedbackByTurnIndex = new Map();
      attempt.snapshots.forEach((snapshot) => {
        const snapshotTranscript = getSessionTranscript(snapshot);
        const feedbackEntries = Array.isArray(snapshot.turnFeedback) ? snapshot.turnFeedback : [];
        feedbackEntries.forEach((feedback) => {
          const feedbackText = normalizeComparableText(feedback?.text);
          const turnIndex = snapshotTranscript.reduce((matchedIndex, turn, index) => {
            const isStudentTurn = turn.speaker === "student" || turn.sender === "me";
            return isStudentTurn && normalizeComparableText(turn.text) === feedbackText ? index : matchedIndex;
          }, -1);
          if (turnIndex >= 0) feedbackByTurnIndex.set(turnIndex, feedback);
        });

        // Older snapshots kept the feedback on the session itself rather than
        // inside turnFeedback. Each snapshot is created after one student reply,
        // so attach that saved feedback to the snapshot's final student turn.
        const latestStudentTurn = snapshotTranscript.reduce((latestIndex, turn, index) => (
          turn.speaker === "student" || turn.sender === "me" ? index : latestIndex
        ), -1);
        if (latestStudentTurn >= 0 && !feedbackByTurnIndex.has(latestStudentTurn)) {
          const sessionFeedback = getScoreGuidedFeedback(snapshot);
          if (sessionFeedback.analysis || sessionFeedback.guidance) {
            feedbackByTurnIndex.set(latestStudentTurn, {
              text: snapshotTranscript[latestStudentTurn].text,
              analysis: sessionFeedback.analysis,
              suggestion: sessionFeedback.guidance,
              guidanceLabel: sessionFeedback.guidanceLabel,
            });
          }
        }
      });
      return { ...attempt, feedbackByTurnIndex };
    })
    .reverse();
}

export default function AISocialSkillsPlatform() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("home");
  const [showReportDetails, setShowReportDetails] = useState(false);
  const [showDimensionGuide, setShowDimensionGuide] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);
  const [assessmentCompleted, setAssessmentCompleted] = useState(false);
  const [sceneId, setSceneId] = useState(1);
  const [input, setInput] = useState("");
  const [assistInput, setAssistInput] = useState("");
  const [assistOutput, setAssistOutput] = useState(null);
  const [messages, setMessages] = useState([{ sender: "other", text: scenes[0].starter }]);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [teacherBinding, setTeacherBinding] = useState({ loading: true, linked: false, teacher: null, transcriptShareWithTeacher: false });
  const [bindingCodeInput, setBindingCodeInput] = useState("");
  const [bindingSubmitting, setBindingSubmitting] = useState(false);
  const [bindingMessage, setBindingMessage] = useState("");
  const [lastScore, setLastScore] = useState(0);
  const [scoreDetail, setScoreDetail] = useState({
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
    evidence: "",
    strength: "",
    supportNeed: "",
    comment: "",
    suggestion: "",
  });
  const [chatLoading, setChatLoading] = useState(false);
  const [chatNotice, setChatNotice] = useState("");
  const [assistLoading, setAssistLoading] = useState(false);
  const [suggestionLoading, setSuggestionLoading] = useState(false);

  const [voiceScenarioId, setVoiceScenarioId] = useState(1);
  const [voiceConnected, setVoiceConnected] = useState(false);
  const [voiceInput, setVoiceInput] = useState("");
  const [voiceMessages, setVoiceMessages] = useState([{ sender: "caller", text: voiceScenarios[0].opening }]);
  const [voiceStatus, setVoiceStatus] = useState("等待接听");
  const [voiceFeedback, setVoiceFeedback] = useState("通话开始后，会显示本次回应记录。");
  const voiceSessionRef = useRef(null);
  const voiceMessagesRef = useRef([]);
  const voiceTurnFeedbackRef = useRef([]);
  const voiceTranscriptTimerRef = useRef(null);
  const [voiceLiveMessages, setVoiceLiveMessages] = useState([]);
  const [voiceMicOn, setVoiceMicOn] = useState(true);
  const [voiceError, setVoiceError] = useState("");
  const [voicePartialText, setVoicePartialText] = useState("");
  const [voicePartialSender, setVoicePartialSender] = useState("caller");
  const [voiceSuggestionLoading, setVoiceSuggestionLoading] = useState(false);
  const [voiceSummary, setVoiceSummary] = useState(null);
  const [voiceLastScore, setVoiceLastScore] = useState(null);
  const [voiceMicLevel, setVoiceMicLevel] = useState(0);
  const [voiceAiSpeaking, setVoiceAiSpeaking] = useState(false);
  const [voiceWaiting, setVoiceWaiting] = useState(false);
  const [voiceInputDevices, setVoiceInputDevices] = useState([]);
  const [voiceSelectedInputId, setVoiceSelectedInputId] = useState("");
  const [voiceMicDiagnostic, setVoiceMicDiagnostic] = useState("");
  const [voiceSocialScores, setVoiceSocialScores] = useState({
    contextUnderstanding: 0,
    socialPragmatics: 0,
    emotionResponse: 0,
    normExpression: 0,
    dialogueMaintenance: 0,
    problemSolving: 0,
    clarity: 0,
    relevance: 0,
    initiative: 0,
  });

  function simplifyVoiceText(text) {
    return String(text || "")
      .replace(/[，。！？,.!?~\s]/g, "")
      .trim();
  }

  function isRepeatOfRecentUser(text, messages = voiceMessagesRef.current) {
    const current = simplifyVoiceText(text);
    if (!current) return false;

    return messages
      .slice(-4)
      .some((item) => {
        if (item.sender !== "me") return false;
        const userText = simplifyVoiceText(item.text);
        if (!userText) return false;
        return current === userText || current.includes(userText) || userText.includes(current);
      });
  }

  function formatVoiceError(message) {
    const text = String(message || "");

    if (text.includes("4028") || text.includes("Insufficient coze credits balance")) {
      return "扣子实时语音额度不足，语音识别可能正常，但无法生成下一句回复。";
    }

    if (text.includes("4052") || text.includes("s2s feature is not enabled")) {
      return "当前扣子 Bot 未开通实时语音对话（S2S）能力。";
    }

    if (text.includes("4100") || text.includes("authentication is invalid")) {
      return "扣子实时语音鉴权失败，请检查当前 Token、Bot ID 和发布状态。";
    }

    if (text.includes("4101") || text.includes("permission")) {
      return "当前 Token 没有调用这个扣子 Bot 或实时语音能力的权限。";
    }

    return text && text !== "实时语音连接出错"
      ? `扣子语音服务返回：${text}`
      : "扣子没有生成下一句回复，请检查 Bot 状态和实时语音配置。";
  }

  async function commitVoiceTranscript(text) {
    const finalText = String(text || "").trim();
    if (!finalText) return;

    try {
      await checkUserContent(finalText);
    } catch (error) {
      setVoiceFeedback(error.message);
      setVoiceWaiting(false);
      return;
    }

    pushVoiceMessage({ sender: "me", text: finalText });
    setVoiceInput("");
    setVoicePartialText("");
    setVoiceWaiting(true);
    evaluateVoiceTurn(finalText);
  }

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
  const recentHistoryGroups = recentDateModuleGroups(history);

  function normalizeHistoryItem(session) {
    const dimensions = session.dimensions && typeof session.dimensions === "object" ? session.dimensions : {};
    const fallbackName = session.module === "assessment"
      ? "情境互动"
      : session.module === "voice_assessment"
        ? "语音通话"
        : session.module === "story"
          ? "社交故事"
          : session.module === "empathy"
            ? "共情任务"
            : "历史互动";

    return {
      id: session.id || `${session.module || "session"}-${session.timestamp || Date.now()}`,
      name: session.scene || session.moduleName || fallbackName,
      score: Number(session.score) || 0,
      module: session.module || "",
      moduleName: session.moduleName || "",
      scene: session.scene || "",
      summary: session.summary || "",
      dimensions,
      evidence: session.evidence || session.summary || "",
      strength: session.strength || "",
      supportNeed: session.supportNeed || "",
      comment: session.comment || session.summary || "",
      suggestion: session.suggestion || "",
      transcript: Array.isArray(session.transcript) ? session.transcript : [],
      turnFeedback: Array.isArray(session.turnFeedback) ? session.turnFeedback : [],
      timestamp: session.timestamp || "",
    };
  }

  function hasDimensionScores(item) {
    const dimensions = item?.dimensions || {};
    return assessmentDimensions.some((dimension) => Number(dimensions[dimension.key]) > 0);
  }

  function scoreDetailFromHistoryItem(item) {
    const dimensions = item?.dimensions || {};
    return {
      contextUnderstanding: dimensions.contextUnderstanding ?? 0,
      socialPragmatics: dimensions.socialPragmatics ?? 0,
      emotionResponse: dimensions.emotionResponse ?? 0,
      normExpression: dimensions.normExpression ?? 0,
      dialogueMaintenance: dimensions.dialogueMaintenance ?? 0,
      problemSolving: dimensions.problemSolving ?? 0,
      politeness: dimensions.politeness ?? 0,
      relevance: dimensions.relevance ?? 0,
      clarity: dimensions.clarity ?? 0,
      continuation: dimensions.continuation ?? 0,
      evidence: item?.evidence || item?.summary || "",
      strength: item?.strength || "",
      supportNeed: item?.supportNeed || "",
      comment: item?.comment || item?.summary || "",
      suggestion: item?.suggestion || "",
    };
  }

  function syncReportFromHistory(items) {
    const latest = items?.[0];
    if (!latest) {
      setLastScore(0);
      setScoreDetail(scoreDetailFromHistoryItem(null));
      return;
    }

    setLastScore(latest.score || 0);
    setScoreDetail(scoreDetailFromHistoryItem(items.find(hasDimensionScores) || null));
  }

  function readLocalHistory() {
    try {
      const saved = JSON.parse(localStorage.getItem(getStudentHistoryKey()) || "[]");
      return Array.isArray(saved) ? saved.map(normalizeHistoryItem) : [];
    } catch {
      return [];
    }
  }

  function writeLocalHistory(items) {
    localStorage.setItem(getStudentHistoryKey(), JSON.stringify(items.slice(0, 30)));
  }

  function pushHistoryItem(item) {
    setHistory((prev) => {
      const filtered = prev.filter((entry) => entry.id !== item.id && entry.name !== item.name);
      const next = [item, ...filtered].slice(0, 30);
      writeLocalHistory(next);
      syncReportFromHistory(next);
      return next;
    });
  }

  async function saveStudentSession(payload) {
    const localItem = normalizeHistoryItem({
      ...payload,
      id: `local-${Date.now()}`,
      timestamp: new Date().toISOString(),
    });
    const token = localStorage.getItem("yuyi_token");
    if (!token) {
      pushHistoryItem(localItem);
      return null;
    }

    try {
      const res = await fetch(`${API_BASE}/api/student/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        const error = new Error(data?.message || data?.detail || data?.error || "记录保存失败");
        error.code = data?.code;
        throw error;
      }
      return data.session || null;
    } catch (error) {
      // Do not write blocked content to localStorage as a fallback.
      if (error?.code !== "CONTENT_BLOCKED") pushHistoryItem(localItem);
      throw error;
    }
  }

  async function loadStudentHistory() {
    const token = localStorage.getItem("yuyi_token");
    if (!token) {
      const localHistory = readLocalHistory();
      setHistory(localHistory);
      syncReportFromHistory(localHistory);
      return;
    }

    setHistoryLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/student/sessions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "记录读取失败");
      const serverHistory = Array.isArray(data) ? data.map(normalizeHistoryItem) : [];
      const nextHistory = serverHistory.length ? serverHistory : readLocalHistory();
      setHistory(nextHistory);
      syncReportFromHistory(nextHistory);
    } catch {
      const localHistory = readLocalHistory();
      setHistory(localHistory);
      syncReportFromHistory(localHistory);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function loadTeacherBinding() {
    const token = localStorage.getItem("yuyi_token");
    if (!token) {
      setTeacherBinding({ loading: false, linked: false, teacher: null, transcriptShareWithTeacher: false });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/student/binding`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "读取关联信息失败");
      setTeacherBinding({
        loading: false,
        linked: Boolean(data.linked),
        teacher: data.teacher || null,
        transcriptShareWithTeacher: data.transcriptShareWithTeacher === true,
      });
    } catch {
      setTeacherBinding({ loading: false, linked: false, teacher: null, transcriptShareWithTeacher: false });
    }
  }

  async function bindTeacher() {
    const code = bindingCodeInput.trim().toUpperCase();
    const token = localStorage.getItem("yuyi_token");
    if (!code || bindingSubmitting) return;
    if (!token) {
      setBindingMessage("请先以学生身份登录后再关联教师。");
      return;
    }

    setBindingSubmitting(true);
    setBindingMessage("");
    try {
      const res = await fetch(`${API_BASE}/api/student/bind-teacher`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "关联失败");
      setTeacherBinding({ loading: false, linked: true, teacher: data.teacher || null, transcriptShareWithTeacher: false });
      setBindingCodeInput("");
      setBindingMessage("关联成功。");
    } catch (error) {
      setBindingMessage(error.message || "关联失败，请稍后重试。");
    } finally {
      setBindingSubmitting(false);
    }
  }

  async function setTranscriptSharing(enabled) {
    const token = localStorage.getItem("yuyi_token");
    if (!token || bindingSubmitting) return;

    setBindingSubmitting(true);
    setBindingMessage("");
    try {
      const res = await fetch(`${API_BASE}/api/student/transcript-sharing`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "设置失败");
      setTeacherBinding((current) => ({ ...current, transcriptShareWithTeacher: data.transcriptShareWithTeacher === true }));
      setBindingMessage(enabled ? "已授权关联教师查看完整交流原文。" : "已停止向关联教师展示完整交流原文。");
    } catch (error) {
      setBindingMessage(error.message || "设置失败，请稍后重试。");
    } finally {
      setBindingSubmitting(false);
    }
  }

  useEffect(() => {
    loadStudentHistory();
    loadTeacherBinding();
  }, []);

  function switchScene(scene) {
    setSceneId(scene.id);
    setMessages([{ sender: "other", text: scene.starter }]);
    setInput("");
    setAssessmentCompleted(false);
    setActiveTab("train");
  }

  async function checkUserContent(text) {
    const res = await fetch(`${API_BASE}/api/moderation/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || "这段内容暂时不能提交，请换一种表达后再试。");
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || chatLoading) return;

    setChatNotice("");
    try {
      await checkUserContent(text);
    } catch (error) {
      setChatNotice(error.message);
      return;
    }

    const userMessage = { sender: "me", text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setChatLoading(true);

    try {
      const [chatRes, scoreRes] = await Promise.all([
        fetch(`${API_BASE}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sceneTitle: currentScene.title,
            sceneRole: currentScene.role,
            sceneRoleStyle: currentScene.roleStyle,
            sceneHint: currentScene.hint,
            starter: currentScene.starter,
            messages: nextMessages,
          }),
        }),
        fetch(`${API_BASE}/api/score`, {
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

      if (!chatRes.ok) throw new Error(chatData?.message || chatData?.detail || chatData?.error || "聊天失败");
      if (!scoreRes.ok) throw new Error(scoreData?.message || scoreData?.detail || scoreData?.error || "评分失败");

      setMessages((prev) => [...prev, { sender: "other", text: chatData.reply || "我明白你的意思了。" }]);
      const finalMessages = [...nextMessages, { sender: "other", text: chatData.reply || "" }];
      setAssessmentCompleted(true);
      setLastScore(scoreData.score || 0);
      setScoreDetail({
        contextUnderstanding: scoreData.contextUnderstanding ?? scoreData.relevance ?? 0,
        socialPragmatics: scoreData.socialPragmatics ?? scoreData.clarity ?? 0,
        emotionResponse: scoreData.emotionResponse ?? 0,
        normExpression: scoreData.normExpression ?? scoreData.politeness ?? 0,
        dialogueMaintenance: scoreData.dialogueMaintenance ?? scoreData.continuation ?? 0,
        problemSolving: scoreData.problemSolving ?? 0,
        politeness: scoreData.politeness || 0,
        relevance: scoreData.relevance || 0,
        clarity: scoreData.clarity || 0,
        continuation: scoreData.continuation || 0,
        evidence: scoreData.evidence || "",
        strength: scoreData.strength || "",
        supportNeed: scoreData.supportNeed || "",
        comment: scoreData.comment || "",
        suggestion: scoreData.suggestion || "",
      });
      if (scoreData.score) {
        const sessionPayload = {
          module: "assessment",
          moduleName: "情境动态测评",
          scene: currentScene.title,
          score: scoreData.score,
          summary: scoreData.evidence || scoreData.comment || "",
          dimensions: {
            contextUnderstanding: scoreData.contextUnderstanding ?? scoreData.relevance ?? 0,
            socialPragmatics: scoreData.socialPragmatics ?? scoreData.clarity ?? 0,
            emotionResponse: scoreData.emotionResponse ?? 0,
            normExpression: scoreData.normExpression ?? scoreData.politeness ?? 0,
            dialogueMaintenance: scoreData.dialogueMaintenance ?? scoreData.continuation ?? 0,
            problemSolving: scoreData.problemSolving ?? 0,
          },
          evidence: scoreData.evidence || "",
          strength: scoreData.strength || "",
          supportNeed: scoreData.supportNeed || "",
          comment: scoreData.comment || "",
          suggestion: scoreData.suggestion || "",
          turnFeedback: [{
            sender: "me",
            text,
            analysis: scoreData.evidence || scoreData.comment || "",
            suggestion: scoreData.suggestion || "",
            dimensions: {
              contextUnderstanding: scoreData.contextUnderstanding ?? scoreData.relevance ?? 0,
              socialPragmatics: scoreData.socialPragmatics ?? scoreData.clarity ?? 0,
              emotionResponse: scoreData.emotionResponse ?? 0,
              normExpression: scoreData.normExpression ?? scoreData.politeness ?? 0,
              dialogueMaintenance: scoreData.dialogueMaintenance ?? scoreData.continuation ?? 0,
              problemSolving: scoreData.problemSolving ?? 0,
            },
          }],
          transcript: finalMessages
            .filter((message) => String(message?.text || "").trim())
            .map((message) => ({ sender: message.sender, text: message.text.trim(), source: "text" })),
        };
        pushHistoryItem(normalizeHistoryItem({
          ...sessionPayload,
          id: `local-${Date.now()}`,
          timestamp: new Date().toISOString(),
        }));
        saveStudentSession(sessionPayload)
          .then((session) => {
            if (session) pushHistoryItem(normalizeHistoryItem(session));
          })
          .catch(() => {});
      }
    } catch (error) {
      setMessages((prev) => [...prev, { sender: "other", text: `出错了：${error.message}` }]);
    } finally {
      setChatLoading(false);
    }
  }

  async function improveAssist() {
    const text = assistInput.trim();
    if (!text || assistLoading) return;
    try {
      await checkUserContent(text);
    } catch (error) {
      setChatNotice(error.message);
      return;
    }
    setAssistLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.detail || data?.error || "润色失败");
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

  function pushVoiceMessage(message) {
    if (!message?.text?.trim()) return;

    const text = message.text.trim();
    const current = voiceMessagesRef.current;
    const last = current[current.length - 1];
    if (last?.sender === message.sender && last?.text === text) return;
    if (message.sender === "caller" && isRepeatOfRecentUser(text, current)) return;

    const next = [...current, { sender: message.sender, text }];
    voiceMessagesRef.current = next;
    setVoiceLiveMessages(next);
  }

  async function refreshVoiceInputDevices() {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setVoiceMicDiagnostic("当前浏览器不支持列出麦克风设备。");
      return [];
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const inputs = devices.filter((device) => device.kind === "audioinput");
    setVoiceInputDevices(inputs);

    return inputs;
  }

  async function changeVoiceInputDevice(deviceId) {
    setVoiceSelectedInputId(deviceId);
    setVoiceMicDiagnostic("");

    if (voiceConnected) {
      await voiceSessionRef.current?.setAudioInputDevice?.(deviceId);
    }
  }

  async function evaluateVoiceTurn(text) {
    if (!text.trim()) return;

    setVoiceFeedback("正在分析这一句的社交表达...");

    try {
      const res = await fetch(`${API_BASE}/api/voice/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneTitle: currentVoice.title,
          sceneRole: currentVoice.caller,
          sceneHint: currentVoice.hint,
          userReply: text,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || data?.detail || data?.error || "反馈失败");

      setVoiceLastScore(data.score ?? null);
      setVoiceSocialScores({
        contextUnderstanding: data.contextUnderstanding ?? voiceSocialScores.contextUnderstanding,
        socialPragmatics: data.socialPragmatics ?? voiceSocialScores.socialPragmatics,
        emotionResponse: data.emotionResponse ?? voiceSocialScores.emotionResponse,
        normExpression: data.normExpression ?? voiceSocialScores.normExpression,
        dialogueMaintenance: data.dialogueMaintenance ?? voiceSocialScores.dialogueMaintenance,
        problemSolving: data.problemSolving ?? voiceSocialScores.problemSolving,
        clarity: data.clarity ?? voiceSocialScores.clarity,
        relevance: data.relevance ?? voiceSocialScores.relevance,
        initiative: data.initiative ?? voiceSocialScores.initiative,
      });
      setVoiceFeedback(`${data.feedback || "表达基本清楚。"} 示例：${data.example || text}`);
      voiceTurnFeedbackRef.current = [
        ...voiceTurnFeedbackRef.current,
        {
          sender: "me",
          text: text.trim(),
          analysis: data.feedback || "",
          suggestion: data.example || "",
          dimensions: {
            contextUnderstanding: data.contextUnderstanding ?? data.relevance ?? 0,
            socialPragmatics: data.socialPragmatics ?? data.clarity ?? 0,
            emotionResponse: data.emotionResponse ?? 0,
            normExpression: data.normExpression ?? 0,
            dialogueMaintenance: data.dialogueMaintenance ?? data.initiative ?? 0,
            problemSolving: data.problemSolving ?? 0,
          },
        },
      ];
    } catch (error) {
      setVoiceFeedback(`这一句已经记录。反馈生成失败：${error.message}`);
    }
  }

  async function summarizeVoiceCall(messagesForSummary = voiceMessagesRef.current) {
    const userResponses = messagesForSummary.filter(
      (message) => message?.sender === "me" && String(message.text || "").trim(),
    );

    if (!userResponses.length) {
      setVoiceSummary(null);
      setVoiceLastScore(null);
      setVoiceFeedback("本次未检测到有效语音回应，未生成评分或保存记录。");
      return;
    }

    setVoiceFeedback("正在生成本次通话纪要...");

    try {
      const res = await fetch(`${API_BASE}/api/voice/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneTitle: currentVoice.title,
          sceneRole: currentVoice.caller,
          sceneHint: currentVoice.hint,
          messages: messagesForSummary,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data?.error === "no_user_response") {
          setVoiceSummary(null);
          setVoiceLastScore(null);
          setVoiceFeedback("本次未检测到有效语音回应，未生成评分或保存记录。");
          return;
        }
        throw new Error(data?.message || data?.detail || data?.error || "总结失败");
      }

      setVoiceSummary(data);
      setVoiceLastScore(data.score ?? voiceLastScore);
      setVoiceSocialScores({
        contextUnderstanding: data.contextUnderstanding ?? voiceSocialScores.contextUnderstanding,
        socialPragmatics: data.socialPragmatics ?? voiceSocialScores.socialPragmatics,
        emotionResponse: data.emotionResponse ?? voiceSocialScores.emotionResponse,
        normExpression: data.normExpression ?? voiceSocialScores.normExpression,
        dialogueMaintenance: data.dialogueMaintenance ?? voiceSocialScores.dialogueMaintenance,
        problemSolving: data.problemSolving ?? voiceSocialScores.problemSolving,
        clarity: data.clarity ?? voiceSocialScores.clarity,
        relevance: data.relevance ?? voiceSocialScores.relevance,
        initiative: data.initiative ?? voiceSocialScores.initiative,
      });
      setVoiceFeedback(`${data.summary || "本次通话已结束。"} ${data.nextStep ? `下一步：${data.nextStep}` : ""}`);
      if (typeof data.score === "number") {
        const sessionPayload = {
          module: "voice_assessment",
          moduleName: "语音动态测评",
          scene: currentVoice.title,
          score: data.score,
          summary: data.summary || "",
          dimensions: {
            contextUnderstanding: data.contextUnderstanding ?? data.relevance ?? 0,
            socialPragmatics: data.socialPragmatics ?? data.clarity ?? 0,
            emotionResponse: data.emotionResponse ?? 0,
            normExpression: data.normExpression ?? 0,
            dialogueMaintenance: data.dialogueMaintenance ?? data.initiative ?? 0,
            problemSolving: data.problemSolving ?? 0,
          },
          evidence: data.summary || "",
          strength: data.strength || "",
          supportNeed: data.nextStep || "",
          comment: data.summary || "",
          suggestion: data.nextStep || "",
          turnFeedback: voiceTurnFeedbackRef.current,
          transcript: messagesForSummary
            .filter((message) => String(message?.text || "").trim())
            .map((message) => ({ sender: message.sender, text: message.text.trim(), source: "voice" })),
        };
        pushHistoryItem(normalizeHistoryItem({
          ...sessionPayload,
          id: `local-${Date.now()}`,
          timestamp: new Date().toISOString(),
        }));
        saveStudentSession(sessionPayload)
          .then((session) => {
            if (session) pushHistoryItem(normalizeHistoryItem(session));
          })
          .catch(() => {});
      }
    } catch (error) {
      setVoiceFeedback(`通话已结束，但纪要生成失败：${error.message}`);
    }
  }

  async function generateVoiceSuggestion() {
    if (voiceSuggestionLoading) return;

    setVoiceSuggestionLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/voice/suggestion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sceneTitle: currentVoice.title,
          sceneRole: currentVoice.caller,
          sceneHint: currentVoice.hint,
          messages: voiceMessagesRef.current,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || data?.error || "示范生成失败");

      setVoiceInput(data.suggestion || currentVoice.sample);
    } catch (error) {
      setVoiceInput(`出错了：${error.message}`);
    } finally {
      setVoiceSuggestionLoading(false);
    }
  }

  function switchVoiceScenario(item) {
    voiceSessionRef.current?.disconnect();
    voiceSessionRef.current = null;
    window.clearTimeout(voiceTranscriptTimerRef.current);

    setVoiceScenarioId(item.id);
    setVoiceMessages([{ sender: "caller", text: item.opening }]);
    voiceMessagesRef.current = [];
    voiceTurnFeedbackRef.current = [];
    setVoiceLiveMessages([]);
    setVoiceInput("");
    setVoiceConnected(false);
    setVoiceMicOn(true);
    setVoiceError("");
    setVoicePartialText("");
    setVoicePartialSender("caller");
    setVoiceSummary(null);
    setVoiceLastScore(null);
    setVoiceSocialScores({
      contextUnderstanding: 0,
      socialPragmatics: 0,
      emotionResponse: 0,
      normExpression: 0,
      dialogueMaintenance: 0,
      problemSolving: 0,
      clarity: 0,
      relevance: 0,
      initiative: 0,
    });
    setVoiceAiSpeaking(false);
    setVoiceWaiting(false);
    setVoiceMicDiagnostic("");
    setVoiceMicLevel(0);
    setVoiceStatus("等待接听");
    setVoiceFeedback("通话开始后，会显示本次回应记录。");
  }

  async function startVoiceCall() {
    if (voiceConnected) return;

    setVoiceError("");
    setVoiceSummary(null);
    setVoiceLastScore(null);
    setVoiceSocialScores({
      contextUnderstanding: 0,
      socialPragmatics: 0,
      emotionResponse: 0,
      normExpression: 0,
      dialogueMaintenance: 0,
      problemSolving: 0,
      clarity: 0,
      relevance: 0,
      initiative: 0,
    });
    setVoicePartialText("");
    setVoicePartialSender("caller");
    setVoiceAiSpeaking(false);
    setVoiceWaiting(true);
    setVoiceStatus("正在准备通话...");
    setVoiceConnected(true);
    voiceMessagesRef.current = [{ sender: "caller", text: currentVoice.opening }];
    voiceTurnFeedbackRef.current = [];
    setVoiceLiveMessages(voiceMessagesRef.current);

    try {
      setVoiceStatus("正在准备通话...");
      const { createCozeVoiceSession } = await import("./cozeVoiceClient");
      await refreshVoiceInputDevices();
      const inputDeviceId = voiceSelectedInputId || "";
      const session = await createCozeVoiceSession({
        audioInputDeviceId: inputDeviceId,
        prologueContent: currentVoice.opening,
        onStatus: setVoiceStatus,
        onTranscript: (message) => {
          setVoicePartialText(message.text);
          setVoicePartialSender("me");
          setVoiceStatus(message.isFinal ? "已听到，等待回应..." : "正在听你说话...");

          if (message.isFinal) {
            window.clearTimeout(voiceTranscriptTimerRef.current);
            commitVoiceTranscript(message.text);
          }
        },
        onAssistantText: (message) => {
          if (isRepeatOfRecentUser(message.text)) return;

          setVoiceStatus(message.isFinal ? "可以继续说话" : "对方正在回应...");
          setVoiceAiSpeaking(!message.isFinal);

          if (message.isFinal) {
            pushVoiceMessage({ sender: "caller", text: message.text });
            setVoicePartialText("");
            setVoicePartialSender("caller");
            setVoiceWaiting(false);
            setVoiceAiSpeaking(false);
          } else {
            setVoicePartialText(message.text);
            setVoicePartialSender("caller");
          }
        },
        onMessage: (message) => {
          pushVoiceMessage(message);
        },
        onError: (message) => {
          const friendlyMessage = formatVoiceError(message);
          setVoiceError(friendlyMessage);
          setVoiceStatus(friendlyMessage);
          setVoiceWaiting(false);
          setVoiceAiSpeaking(false);
        },
        onEvent: (_, event) => {
          if (event?.uiSignal === "user_speaking") {
            setVoiceMicLevel(72);
            setVoiceWaiting(false);
          }
          if (event?.uiSignal === "user_stopped") {
            setVoiceMicLevel(12);
            setVoiceWaiting(true);
          }
          if (event?.uiSignal === "ai_speaking") {
            setVoiceAiSpeaking(true);
            setVoiceWaiting(false);
          }
          if (event?.uiSignal === "ai_stopped") {
            setVoiceAiSpeaking(false);
            setVoiceWaiting(false);
          }
        },
      });

      voiceSessionRef.current = session;
      setVoiceMicLevel(12);
      setVoiceStatus(`通话中 · ${currentVoice.caller}`);
    } catch (error) {
      const friendlyMessage = formatVoiceError(error.message);
      setVoiceConnected(false);
      setVoiceStatus("等待接听");
      setVoiceError(friendlyMessage);
      setVoiceWaiting(false);
      setVoiceAiSpeaking(false);
      setVoiceMicLevel(0);
    }
  }

  async function endVoiceCall() {
    voiceSessionRef.current?.disconnect();
    voiceSessionRef.current = null;
    window.clearTimeout(voiceTranscriptTimerRef.current);
    setVoiceConnected(false);
    setVoiceMicOn(true);
    setVoicePartialText("");
    setVoicePartialSender("caller");
    setVoiceWaiting(false);
    setVoiceAiSpeaking(false);
    setVoiceMicLevel(0);
    setVoiceStatus("通话已结束");
    await summarizeVoiceCall();
  }

  function interruptAiVoice() {
    voiceSessionRef.current?.interrupt();
  }

  function toggleVoiceMic() {
    const next = !voiceMicOn;
    setVoiceMicOn(next);
    voiceSessionRef.current?.setMicrophone(next);
    if (next) {
      setVoiceMicLevel(voiceConnected ? 12 : 0);
    } else {
      setVoiceMicLevel(0);
    }
  }

  async function sendVoiceReply() {
    const text = voiceInput.trim();
    if (!text) return;

    try {
      await checkUserContent(text);
    } catch (error) {
      setVoiceFeedback(error.message);
      return;
    }

    if (voiceSessionRef.current?.sendText) {
      pushVoiceMessage({ sender: "me", text });
      setVoiceInput("");
      setVoiceStatus("已发送，等待回应...");
      setVoiceWaiting(true);
      await evaluateVoiceTurn(text);
      await voiceSessionRef.current.sendText(text);
      return;
    }

    const fallbackReplies = {
      1: "嗯，知道了。你现在感觉还好吗？需要我帮你和其他老师说一声吗？",
      2: "好呀，谢谢你。你方便的时候发我就行。",
      3: "好，我就在校门口。慢慢来，出来了跟我说一声。",
      4: "好，我大概知道你在哪儿了。你先别着急，我带你确认一下怎么走。",
      5: "嗯，我在听。你愿意的话，跟我说说怎么回事？",
      6: "好呀，那我们到时候在校门口碰面？",
    };
    let callerReply = fallbackReplies[currentVoice.id] || "好，我知道了。";
    let feedback = "已记录本次回应。";
    let score = 80;

    if (text.includes("您好") || text.includes("老师")) score += 4;
    if (text.length > 10) score += 4;
    if (text.includes("吗") || text.includes("？")) score += 3;

    if (/(不方便|不行|不了|不用|不去)/.test(text)) {
      const declineReplies = {
        2: "没事，那我再问问别人。",
        3: "好，没关系。你忙完再跟我说，我在这儿等你。",
        5: "没关系，你想说的时候再找我。",
        6: "好呀，没事。那你自己过去也注意路上安全。",
      };
      callerReply = declineReplies[currentVoice.id] || "好，我知道了。";
    }

    const finalScore = Math.min(100, score);
    setVoiceMessages((prev) => [...prev, { sender: "me", text }, { sender: "caller", text: callerReply }]);
    setVoiceFeedback(`${feedback} 本轮参考得分：${finalScore} 分。`);
    setVoiceSocialScores({
      contextUnderstanding: finalScore,
      socialPragmatics: Math.max(0, finalScore - 4),
      emotionResponse: currentVoice.id === 5 ? finalScore : Math.max(0, finalScore - 10),
      normExpression: Math.min(100, finalScore + 2),
      dialogueMaintenance: Math.max(0, finalScore - 6),
      problemSolving: Math.max(0, finalScore - 8),
      clarity: finalScore,
      relevance: Math.max(0, finalScore - 4),
      initiative: Math.max(0, finalScore - 6),
    });
    const voiceReplyPayload = {
      module: "voice_assessment",
      moduleName: "语音动态测评",
      scene: currentVoice.title,
      score: finalScore,
      summary: feedback,
      dimensions: {
        contextUnderstanding: finalScore,
        socialPragmatics: Math.max(0, finalScore - 4),
        emotionResponse: currentVoice.id === 5 ? finalScore : Math.max(0, finalScore - 10),
        normExpression: Math.min(100, finalScore + 2),
        dialogueMaintenance: Math.max(0, finalScore - 6),
        problemSolving: Math.max(0, finalScore - 8),
      },
      evidence: feedback,
      strength: "能够围绕当前通话内容给出回应。",
      supportNeed: "可以继续练习补充更多细节，并主动提出下一步。",
      comment: feedback,
      suggestion: "",
      transcript: [
        { sender: "caller", text: currentVoice.opening, source: "text" },
        { sender: "me", text, source: "text" },
        { sender: "caller", text: callerReply, source: "text" },
      ],
    };
    pushHistoryItem(normalizeHistoryItem({
      ...voiceReplyPayload,
      id: `local-${Date.now()}`,
      timestamp: new Date().toISOString(),
    }));
    saveStudentSession(voiceReplyPayload)
      .then((session) => {
        if (session) pushHistoryItem(normalizeHistoryItem(session));
      })
      .catch(() => {});
    setVoiceInput("");
  }

  function chooseStoryOption(option) {
    setSelectedOption(option.id);
    const text = option.feedback + (option.id === currentStory.best ? " 这是更推荐的回应方式。" : " 你可以试试更平和、更清楚的表达。");
    setStoryFeedback(text);
    const score = option.id === currentStory.best ? 92 : option.id === "a" ? 68 : 74;
    const storyPayload = {
      module: "story",
      moduleName: "社交故事",
      scene: currentStory.title,
      score,
      summary: option.feedback,
      dimensions: {
        contextUnderstanding: score,
        socialPragmatics: score,
        emotionResponse: Math.max(0, score - 6),
        normExpression: option.id === currentStory.best ? 90 : Math.max(0, score - 8),
        dialogueMaintenance: Math.max(0, score - 5),
        problemSolving: Math.max(0, score - 10),
      },
      evidence: option.feedback,
      strength: option.id === currentStory.best ? "能够选择更贴合情境的回应。" : "能够尝试回应当前情境。",
      supportNeed: option.id === currentStory.best ? "继续练习在真实场景中自然表达。" : "可以继续练习更清楚、更礼貌地表达自己的意思。",
      comment: text,
      suggestion: "",
    };
    pushHistoryItem(normalizeHistoryItem({
      ...storyPayload,
      id: `local-${Date.now()}`,
      timestamp: new Date().toISOString(),
    }));
    saveStudentSession(storyPayload)
      .then((session) => {
        if (session) pushHistoryItem(normalizeHistoryItem(session));
      })
      .catch(() => {});
  }

  function chooseEmpathy(option) {
    setSelectedEmpathy(option.id);
    const text = option.feedback + (option.id === currentEmpathy.best ? " 这更像先理解情绪、再给回应。" : " 你可以先接住对方感受，再继续表达。");
    setEmpathyFeedback(text);
    const score = option.id === currentEmpathy.best ? 93 : option.id === "a" ? 75 : 60;
    const empathyPayload = {
      module: "empathy",
      moduleName: "共情任务",
      scene: currentEmpathy.title,
      score,
      summary: option.feedback,
      dimensions: {
        contextUnderstanding: Math.max(0, score - 4),
        socialPragmatics: Math.max(0, score - 6),
        emotionResponse: score,
        normExpression: Math.max(0, score - 5),
        dialogueMaintenance: Math.max(0, score - 8),
        problemSolving: Math.max(0, score - 12),
      },
      evidence: option.feedback,
      strength: option.id === currentEmpathy.best ? "能够先接住对方感受，再给出回应。" : "能够尝试回应对方的情绪。",
      supportNeed: option.id === currentEmpathy.best ? "继续练习自然追问和保持倾听。" : "可以先说出对方的感受，再补充一句支持或追问。",
      comment: text,
      suggestion: "",
    };
    pushHistoryItem(normalizeHistoryItem({
      ...empathyPayload,
      id: `local-${Date.now()}`,
      timestamp: new Date().toISOString(),
    }));
    saveStudentSession(empathyPayload)
      .then((session) => {
        if (session) pushHistoryItem(normalizeHistoryItem(session));
      })
      .catch(() => {});
  }

  const avg = history.length ? Math.round(history.reduce((a, b) => a + b.score, 0) / history.length) : 0;
  const voiceMetricItems = [
    { label: "情境理解", value: voiceSocialScores.contextUnderstanding || voiceSocialScores.relevance },
    { label: "社会语用", value: voiceSocialScores.socialPragmatics || voiceSocialScores.clarity },
    { label: "情绪回应", value: voiceSocialScores.emotionResponse },
    { label: "礼貌规范", value: voiceSocialScores.normExpression },
    { label: "对话维持", value: voiceSocialScores.dialogueMaintenance || voiceSocialScores.initiative },
    { label: "问题解决", value: voiceSocialScores.problemSolving },
  ];
  const assessmentScoreItems = assessmentDimensions.map((dimension) => ({
    ...dimension,
    value: scoreDetail[dimension.key] ?? 0,
  }));
  const hasReportDetails = assessmentScoreItems.some((item) => Number(item.value) > 0);

  const styles = {
    page: { minHeight: "100vh", background: "#f5f7fb", color: "#1f2a44", fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif' },
    shell: { maxWidth: "1280px", margin: "0 auto", padding: "20px" },
    topbar: { display: "flex", justifyContent: "space-between", alignItems: "center", background: "#ffffff", borderRadius: "20px", padding: "14px 18px", boxShadow: "0 8px 28px rgba(27,39,94,0.06)", border: "1px solid #e8edf5", marginBottom: "18px", position: "sticky", top: "10px", zIndex: 20 },
    navWrap: { display: "flex", gap: "10px", flexWrap: "wrap" },
    navBtn: (active) => ({ padding: "10px 16px", borderRadius: "12px", border: active ? "1px solid #4f7cff" : "1px solid #e1e7f0", background: active ? "#4f7cff" : "#fff", color: active ? "#fff" : "#445474", fontWeight: 700, cursor: "pointer" }),
    hero: { background: "linear-gradient(135deg, #4f7cff 0%, #79a7ff 100%)", color: "white", borderRadius: "24px", padding: "26px", boxShadow: "0 18px 45px rgba(79,124,255,0.18)", marginBottom: "18px" },
    grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "18px" },
    card: { background: "#fff", borderRadius: "24px", padding: "20px", border: "1px solid #e8edf5", boxShadow: "0 8px 28px rgba(27,39,94,0.06)" },
    sectionTitle: { fontSize: "13px", color: "#7584a3", marginBottom: "8px", fontWeight: 700 },
    primaryBtn: { border: "none", background: "#4f7cff", color: "white", borderRadius: "12px", padding: "11px 16px", fontWeight: 700, cursor: "pointer" },
    secondaryBtn: { border: "1px solid #d9e2f0", background: "#fff", color: "#4f5f7f", borderRadius: "12px", padding: "11px 16px", fontWeight: 700, cursor: "pointer" },
    dangerBtn: { border: "1px solid #ffd5d8", background: "#fff2f3", color: "#d14b5a", borderRadius: "12px", padding: "11px 16px", fontWeight: 700, cursor: "pointer" },
    input: { width: "100%", borderRadius: "16px", border: "1px solid #d9e2f0", padding: "14px", boxSizing: "border-box", resize: "vertical", fontSize: "15px", outline: "none" },
    bubble: (mine) => ({ alignSelf: mine ? "flex-end" : "flex-start", marginLeft: mine ? "auto" : 0, marginRight: mine ? 0 : "auto", background: mine ? "#4f7cff" : "#f2f5fa", color: mine ? "#fff" : "#24314f", borderRadius: mine ? "18px 18px 4px 18px" : "18px 18px 18px 4px", padding: "12px 14px", maxWidth: "78%", lineHeight: 1.65, marginBottom: "10px" }),
    sceneBtn: (active) => ({ width: "100%", textAlign: "left", background: active ? "#eef4ff" : "#fff", border: active ? "2px solid #4f7cff" : "1px solid #e2e8f2", borderRadius: "16px", padding: "14px", marginBottom: "10px", cursor: "pointer" }),
    optionBtn: (active) => ({ width: "100%", textAlign: "left", background: active ? "#eef4ff" : "#fff", border: active ? "2px solid #4f7cff" : "1px solid #e2e8f2", borderRadius: "16px", padding: "14px", marginBottom: "12px", cursor: "pointer", lineHeight: 1.7 }),
    badge: { display: "inline-block", padding: "6px 10px", background: "#eef4ff", color: "#4567da", borderRadius: "999px", fontSize: "12px", fontWeight: 700, marginRight: "8px" },
    twoLineText: { display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" },
  };

  return (
    <div style={styles.page}>
      <div style={styles.shell}>
        <div style={styles.topbar}>
          <div>
            <div style={{ fontWeight: 800, fontSize: "20px" }}>语依</div>
            <div style={{ color: "#7584a3", fontSize: "13px", marginTop: "4px" }}>日常沟通练习与支持</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={styles.navWrap}>
              {navs.map((nav) => (
                <button key={nav.key} style={styles.navBtn(activeTab === nav.key)} onClick={() => setActiveTab(nav.key)}>
                  {nav.label}
                </button>
              ))}
            </div>
            <button
              style={{ border: "1px solid #e1e7f0", background: "#fff", color: "#7584a3", borderRadius: "10px", padding: "8px 14px", fontWeight: 600, cursor: "pointer", fontSize: "13px" }}
              onClick={() => navigate("/")}
            >
              切换身份
            </button>
          </div>
        </div>

        {activeTab === "home" && (
          <>
            <div style={styles.hero}>
              <div style={{ fontSize: "14px", opacity: 0.9, marginBottom: "10px" }}>日常对话 · 电话练习 · 表达支持</div>
              <h1 style={{ margin: 0, fontSize: "34px", lineHeight: 1.18 }}>今天想从哪个场景开始？</h1>
              <div style={{ display: "flex", gap: "12px", marginTop: "18px", flexWrap: "wrap" }}>
                <button style={styles.primaryBtn} onClick={() => setActiveTab("train")}>开始情境互动</button>
                <button style={styles.secondaryBtn} onClick={() => setActiveTab("voice")}>进入语音通话</button>
                <button style={styles.secondaryBtn} onClick={() => setActiveTab("record")}>查看我的记录</button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "18px" }}>
              <button style={{ ...styles.card, textAlign: "left", cursor: "pointer" }} onClick={() => setActiveTab("train")}>
                <div style={styles.sectionTitle}>情境互动</div>
                <h3 style={{ margin: 0, fontSize: "22px" }}>老师提醒交作业</h3>
                <div style={{ color: "#60708f", marginTop: "8px", lineHeight: 1.6 }}>从校园学习场景开始。</div>
              </button>
              <button style={{ ...styles.card, textAlign: "left", cursor: "pointer" }} onClick={() => setActiveTab("voice")}>
                <div style={styles.sectionTitle}>语音通话</div>
                <h3 style={{ margin: 0, fontSize: "22px" }}>电话场景模拟</h3>
                <div style={{ color: "#60708f", marginTop: "8px", lineHeight: 1.6 }}>像接到真实电话一样回应。</div>
              </button>
              <button style={{ ...styles.card, textAlign: "left", cursor: "pointer" }} onClick={() => setActiveTab("assist")}>
                <div style={styles.sectionTitle}>表达辅助</div>
                <h3 style={{ margin: 0, fontSize: "22px" }}>把话说清楚一点</h3>
                <div style={{ color: "#60708f", marginTop: "8px", lineHeight: 1.6 }}>把想说的话整理得更自然。</div>
              </button>
              <button style={{ ...styles.card, textAlign: "left", cursor: "pointer" }} onClick={() => setActiveTab("record")}>
                <div style={styles.sectionTitle}>我的记录</div>
                <h3 style={{ margin: 0, fontSize: "22px" }}>查看最近表现</h3>
                <div style={{ color: "#60708f", marginTop: "8px", lineHeight: 1.6 }}>看看最近练习留下的反馈。</div>
              </button>
            </div>
          </>
        )}

        {activeTab === "train" && (
          <div style={styles.grid}>
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div style={styles.card}>
                <div style={styles.sectionTitle}>选择一个情境</div>
                {scenes.map((scene) => (
                  <button key={scene.id} style={styles.sceneBtn(scene.id === sceneId)} onClick={() => switchScene(scene)}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <strong>{scene.title}</strong>
                      <span style={{ color: "#7f8cab", fontSize: "13px" }}>{scene.subtitle}</span>
                    </div>
                  </button>
                ))}
              </div>

              <div style={styles.card}>
                <div style={styles.sectionTitle}>现在的情况</div>
                <h3 style={{ marginTop: 0 }}>{currentScene.title}</h3>
                <div style={{ background: "#f7f9fd", borderRadius: "16px", padding: "14px", color: "#31415f", lineHeight: 1.75 }}>
                  {currentScene.setting}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div style={styles.card}>
                <div style={styles.sectionTitle}>对话</div>
                <div style={{ background: "#fbfcff", border: "1px solid #ebf0f7", borderRadius: "18px", padding: "16px", minHeight: "280px", display: "flex", flexDirection: "column" }}>
                  {messages.map((msg, idx) => <div key={idx} style={styles.bubble(msg.sender === "me")}>{msg.text}</div>)}
                  {chatLoading && <div style={styles.bubble(false)}>正在思考中…</div>}
                </div>
                <div style={{ marginTop: "14px" }}>
                  <textarea value={input} onChange={(e) => { setInput(e.target.value); setChatNotice(""); }} placeholder="你会怎么回？" style={{ ...styles.input, minHeight: "90px" }} />
                  {chatNotice && <div style={{ color: "#c54b5b", marginTop: "8px", lineHeight: 1.6 }}>{chatNotice}</div>}
                  <div style={{ display: "flex", gap: "10px", marginTop: "12px", flexWrap: "wrap" }}>
                    <button style={styles.primaryBtn} onClick={sendMessage}>发送</button>
                  </div>
                </div>
              </div>

              <div style={styles.card}>
                <div style={styles.sectionTitle}>本次记录</div>
                {assessmentCompleted ? (
                  <div style={{ background: "#eef4ff", borderRadius: "14px", padding: "14px" }}>
                    <div style={{ lineHeight: 1.7 }}>{scoreDetail.evidence || scoreDetail.comment}</div>
                    {scoreDetail.strength && <div style={{ marginTop: "8px", color: "#2f6f55" }}>已体现：{scoreDetail.strength}</div>}
                    {scoreDetail.supportNeed && <div style={{ marginTop: "8px", color: "#7a5a20" }}>可补充：{scoreDetail.supportNeed}</div>}
                    {scoreDetail.suggestion && <div style={{ marginTop: "8px", color: "#4f5f7f" }}>参考表达：{scoreDetail.suggestion}</div>}
                  </div>
                ) : (
                  <div style={{ background: "#f7f9fd", borderRadius: "14px", padding: "16px", color: "#60708f", lineHeight: 1.8 }}>
                    发送后会生成本次记录。
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "assist" && (
          <div style={{ maxWidth: "880px", margin: "0 auto" }}>
            <div style={styles.card}>
              <div style={styles.sectionTitle}>表达辅助</div>
              <h2 style={{ marginTop: 0 }}>把想说的话整理得更自然</h2>
              <p style={{ color: "#60708f", lineHeight: 1.8 }}>输入一句你想说的话，系统会给出几种更清楚、更礼貌的表达。</p>
              <textarea value={assistInput} onChange={(e) => { setAssistInput(e.target.value); setChatNotice(""); }} placeholder="例如：老师这题我不会 / 我也想一起去" style={{ ...styles.input, minHeight: "120px" }} />
              {chatNotice && <div style={{ color: "#c54b5b", marginTop: "8px", lineHeight: 1.6 }}>{chatNotice}</div>}
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
                  </button>
                ))}
              </div>

              <div style={styles.card}>
                <div style={styles.sectionTitle}>通话状态</div>
                <div style={{ fontSize: "28px", fontWeight: 800, marginBottom: "8px" }}>{currentVoice.caller}</div>
                <div style={{ color: "#60708f", marginBottom: "14px" }}>{voiceStatus}</div>
                <div style={{ background: "#eef4ff", borderRadius: "14px", padding: "12px", color: "#445474", lineHeight: 1.7, marginBottom: "14px" }}>
                  当前通话会自动记录回应。
                </div>
                <div style={{ display: "grid", gap: "10px", marginBottom: "14px" }}>
                  <label style={{ display: "grid", gap: "6px", color: "#7584a3", fontSize: "13px" }}>
                    麦克风设备
                    <select
                      value={voiceSelectedInputId}
                      onChange={(event) => changeVoiceInputDevice(event.target.value)}
                      onFocus={refreshVoiceInputDevices}
                      style={{ width: "100%", border: "1px solid #d9e2f0", borderRadius: "12px", padding: "10px", color: "#1f2a44", background: "#fff" }}
                    >
                      <option value="">默认麦克风</option>
                      {voiceInputDevices.map((device, index) => (
                        <option key={device.deviceId || index} value={device.deviceId}>
                          {device.label || `麦克风 ${index + 1}`}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#7584a3", fontSize: "13px", marginBottom: "6px" }}>
                      <span>语音检测</span>
                      <span>{voiceMicOn ? (voiceMicLevel >= 60 ? "正在听你说话" : voiceConnected ? "待机" : "未接通") : "已关闭"}</span>
                    </div>
                    <div style={{ height: "10px", background: "#eef2f8", borderRadius: "999px", overflow: "hidden" }}>
                      <div style={{ width: `${voiceMicOn ? voiceMicLevel : 0}%`, height: "100%", background: "#4f7cff", borderRadius: "999px", transition: "width 260ms ease" }} />
                    </div>
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", color: "#7584a3", fontSize: "13px", marginBottom: "6px" }}>
                      <span>对方状态</span>
                      <span>{voiceAiSpeaking ? "正在说话" : voiceWaiting ? "等待回应" : voiceConnected ? "可继续说" : "未接通"}</span>
                    </div>
                    <div style={{ height: "10px", background: "#eef2f8", borderRadius: "999px", overflow: "hidden" }}>
                      <div style={{ width: voiceAiSpeaking ? "100%" : voiceWaiting ? "55%" : voiceConnected ? "18%" : "0%", height: "100%", background: voiceAiSpeaking ? "#22a06b" : "#7f8cab", borderRadius: "999px", transition: "width 200ms ease" }} />
                    </div>
                  </div>
                  {voiceMicDiagnostic && (
                    <div style={{ color: "#d14b5a", fontSize: "13px", lineHeight: 1.6 }}>
                      {voiceMicDiagnostic}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <button style={styles.primaryBtn} onClick={startVoiceCall}>
                    {voiceConnected ? "通话中" : "接听"}
                  </button>
                  <button style={styles.dangerBtn} onClick={endVoiceCall}>
                    挂断
                  </button>
                  <button style={styles.secondaryBtn} onClick={toggleVoiceMic}>
                    {voiceMicOn ? "关闭麦克风" : "打开麦克风"}
                  </button>
                  <button style={styles.secondaryBtn} onClick={interruptAiVoice}>
                    暂停对方
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div style={styles.card}>
                <div style={styles.sectionTitle}>通话互动</div>
                <div style={{ background: "#fbfcff", border: "1px solid #ebf0f7", borderRadius: "18px", padding: "16px", minHeight: "280px", display: "flex", flexDirection: "column" }}>
                  {(voiceLiveMessages.length ? voiceLiveMessages : voiceMessages).map((msg, idx) => (
                    <div key={idx} style={styles.bubble(msg.sender === "me")}>
                      {msg.text}
                    </div>
                  ))}
                  {voicePartialText && (
                    <div style={{ ...styles.bubble(voicePartialSender === "me"), opacity: 0.75 }}>
                      {voicePartialText}
                    </div>
                  )}
                </div>

                <div style={{ marginTop: "14px" }}>
                  <textarea value={voiceInput} onChange={(e) => setVoiceInput(e.target.value)} placeholder="也可以在这里输入你的回应……" style={{ ...styles.input, minHeight: "90px" }} />
                  <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                    <button style={styles.primaryBtn} onClick={sendVoiceReply}>发送回应</button>
                  </div>
                </div>
              </div>

              <div style={styles.card}>
                <div style={styles.sectionTitle}>通话记录</div>
                {voiceLastScore !== null || voiceSummary ? (
                  <>
                    {voiceLastScore !== null && (
                      <div style={{ marginBottom: "12px", fontSize: "26px", fontWeight: 800 }}>
                        本轮参考：{voiceLastScore} 分
                      </div>
                    )}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: "10px", marginBottom: "12px" }}>
                      {voiceMetricItems.map((item) => (
                        <div key={item.label} style={{ background: "#f7f9fd", borderRadius: "8px", padding: "12px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", color: "#7584a3", fontSize: "13px", marginBottom: "8px" }}>
                            <span>{item.label}</span>
                            <strong style={{ color: "#1f2a44" }}>{item.value || 0}</strong>
                          </div>
                          <div style={{ height: "8px", background: "#e8edf5", borderRadius: "999px", overflow: "hidden" }}>
                            <div style={{ width: `${Math.max(0, Math.min(100, item.value || 0))}%`, height: "100%", background: "#4f7cff", borderRadius: "999px", transition: "width 240ms ease" }} />
                          </div>
                        </div>
                      ))}
                    </div>
                    {voiceSummary ? (
                      <div style={{ display: "grid", gap: "10px" }}>
                        <div style={{ background: "#eef4ff", borderRadius: "14px", padding: "14px", lineHeight: 1.8 }}>
                          <strong>本次纪要：</strong>{voiceSummary.summary}
                        </div>
                        <div style={{ background: "#f7f9fd", borderRadius: "14px", padding: "14px", lineHeight: 1.8 }}>
                          <strong>已体现：</strong>{voiceSummary.strength}
                        </div>
                        <div style={{ background: "#f7f9fd", borderRadius: "14px", padding: "14px", lineHeight: 1.8 }}>
                          <strong>可补充：</strong>{voiceSummary.nextStep}
                        </div>
                      </div>
                    ) : (
                      <div style={{ background: "#eef4ff", borderRadius: "14px", padding: "16px", lineHeight: 1.8 }}>{voiceFeedback}</div>
                    )}
                  </>
                ) : (
                  <div style={{ background: "#f7f9fd", borderRadius: "14px", padding: "16px", color: "#60708f", lineHeight: 1.8 }}>
                    通话回应后，这里会生成记录。
                  </div>
                )}
                {voiceError && (
                  <div style={{ marginTop: "12px", color: "#d14b5a", lineHeight: 1.7 }}>
                    {voiceError}
                  </div>
                )}
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
                  <button style={styles.primaryBtn} onClick={() => setActiveTab("train")}>进入情境互动</button>
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
            <div style={{ display: "grid", gap: "18px" }}>
              <div style={styles.card}>
                <div style={styles.sectionTitle}>关联教师</div>
                {teacherBinding.loading ? (
                  <div style={{ color: "#60708f" }}>正在读取关联信息...</div>
                ) : teacherBinding.linked ? (
                  <div style={{ color: "#31415f", lineHeight: 1.7 }}>
                    <div>已关联教师：<strong>{teacherBinding.teacher?.name || "教师"}</strong></div>
                    <div style={{ marginTop: "10px", color: "#60708f", fontSize: "14px" }}>
                      教师默认只能查看测评结果、行为摘要和支持建议。完整交流原文由你决定是否授权查看。
                    </div>
                    <button
                      style={{ ...styles.secondaryBtn, marginTop: "10px", padding: "8px 12px", fontSize: "13px" }}
                      onClick={() => setTranscriptSharing(!teacherBinding.transcriptShareWithTeacher)}
                      disabled={bindingSubmitting}
                    >
                      {teacherBinding.transcriptShareWithTeacher ? "停止共享完整原文" : "授权教师查看完整原文"}
                    </button>
                    {bindingMessage && <div style={{ color: "#2f6f55", marginTop: "8px", fontSize: "14px" }}>{bindingMessage}</div>}
                  </div>
                ) : (
                  <div>
                    <div style={{ color: "#60708f", lineHeight: 1.7, marginBottom: "12px" }}>输入教师提供的绑定码后，教师才能查看你的练习记录。</div>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <input
                        value={bindingCodeInput}
                        onChange={(event) => setBindingCodeInput(event.target.value.toUpperCase())}
                        placeholder="输入 6 位绑定码"
                        maxLength={6}
                        style={{ ...styles.input, flex: "1 1 220px", minHeight: "44px", padding: "10px 12px" }}
                      />
                      <button style={styles.primaryBtn} onClick={bindTeacher} disabled={bindingSubmitting}>
                        {bindingSubmitting ? "关联中..." : "关联教师"}
                      </button>
                    </div>
                    {bindingMessage && <div style={{ color: "#d14b5a", marginTop: "10px", fontSize: "14px" }}>{bindingMessage}</div>}
                  </div>
                )}
              </div>

              <div style={styles.card}>
                <div style={styles.sectionTitle}>我的记录</div>
                <h2 style={{ marginTop: 0 }}>社会技能综合画像</h2>
                <div style={{ background: "#eef4ff", borderRadius: "16px", padding: "16px", marginBottom: "16px" }}>
                  社会技能综合得分：<strong>{avg}</strong> 分
                  <div style={{ color: "#60708f", lineHeight: 1.8, marginTop: "8px" }}>
                    当前结果来自情境任务、语音任务、社交故事和共情任务的综合记录，仅用于教育支持和后续个体化练习安排。
                  </div>
                </div>
                <button
                  style={styles.secondaryBtn}
                  onClick={() => setShowReportDetails((value) => !value)}
                >
                  {showReportDetails ? "收起报告明细" : "查看报告明细"}
                </button>
                <button
                  style={{ ...styles.secondaryBtn, marginLeft: "10px" }}
                  onClick={() => setShowDimensionGuide((value) => !value)}
                >
                  {showDimensionGuide ? "收起维度说明" : "社会技能维度说明"}
                </button>
                {showDimensionGuide && (
                  <div style={{ display: "grid", gap: "10px", marginTop: "16px" }}>
                    {assessmentDimensions.map((dimension) => (
                      <div key={dimension.key} style={{ background: "#f7f9fd", borderRadius: "12px", padding: "12px 14px", lineHeight: 1.7 }}>
                        <strong>{dimension.label}</strong>：{dimension.desc}
                      </div>
                    ))}
                  </div>
                )}
                {showReportDetails && (
                  <div style={{ display: "grid", gap: "14px", marginTop: "16px" }}>
                    {hasReportDetails ? (
                      <>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "12px" }}>
                          {assessmentScoreItems.map((item) => (
                            <div key={item.key} style={{ background: "#f7f9fd", borderRadius: "14px", padding: "14px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                                <strong>{item.label}</strong>
                                <span style={{ color: "#4f7cff", fontWeight: 800 }}>{item.value}</span>
                              </div>
                              <div style={{ height: "8px", background: "#e8edf5", borderRadius: "999px", overflow: "hidden" }}>
                                <div style={{ width: `${Math.max(0, Math.min(100, item.value || 0))}%`, height: "100%", background: "#4f7cff", borderRadius: "999px" }} />
                              </div>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: "grid", gap: "12px" }}>
                          <div style={{ background: "#f7f9fd", borderRadius: "14px", padding: "14px", lineHeight: 1.8 }}>
                            <strong>具体行为表现：</strong>{scoreDetail.evidence || scoreDetail.comment}
                          </div>
                          <div style={{ background: "#e8f8f1", borderRadius: "14px", padding: "14px", lineHeight: 1.8 }}>
                            <strong>优势能力：</strong>{scoreDetail.strength || "能在熟悉任务中接住对方话题，并尝试给出回应。"}
                          </div>
                          <div style={{ background: "#fff8e6", borderRadius: "14px", padding: "14px", lineHeight: 1.8 }}>
                            <strong>需支持能力：</strong>{scoreDetail.supportNeed || "继续练习主动补充信息、提出下一步方案和自然结束对话。"}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div style={{ background: "#f7f9fd", borderRadius: "14px", padding: "18px", color: "#60708f", lineHeight: 1.8, textAlign: "center" }}>
                        当前记录只有总分，暂无维度明细。完成一次新的情境互动或语音通话后，这里会显示完整报告。
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={styles.card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px", marginBottom: "4px" }}>
                  <div style={styles.sectionTitle}>近三日互动记录</div>
                  <div style={{ color: "#7584a3", fontSize: "13px" }}>按日期和情境整理，可展开查看</div>
                </div>
                {historyLoading ? (
                  <div style={{ padding: "18px 0", color: "#60708f", textAlign: "center" }}>正在读取记录...</div>
                ) : history.length ? (
                  recentHistoryGroups.map((group) => (
                    <div key={group.date} style={{ marginTop: "18px" }}>
                      <div style={{ color: "#60708f", fontWeight: 800, fontSize: "14px", paddingBottom: "8px", borderBottom: "1px solid #edf1f7" }}>{group.date}</div>
                      {group.modules.map((moduleGroup, moduleIndex) => {
                        const historyId = `${group.date}-${moduleGroup.key}-${moduleIndex}`;
                        const expanded = expandedHistoryId === historyId;
                        const practiceAttempts = buildCompletePracticeAttempts(moduleGroup.sessions);
                        const latestAttempt = practiceAttempts[0];
                        const latestSession = latestAttempt?.latest || moduleGroup.sessions[0];
                        return (
                          <div key={historyId} style={{ padding: "14px 0", borderBottom: "1px solid #edf1f7" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: "14px", alignItems: "center" }}>
                              <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 800 }}>{moduleGroup.moduleName} · {moduleGroup.sceneName}</div>
                                <div style={{ color: "#7584a3", fontSize: "13px", marginTop: "4px" }}>
                                  当天 {practiceAttempts.length} 次完整练习 · 最近一次 {latestSession.timestamp?.slice(11, 16) || "时间未标注"}
                                </div>
                              </div>
                              <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                                <strong style={{ color: "#4f7cff", whiteSpace: "nowrap" }}>最近 {latestSession.score} 分</strong>
                                <button style={{ ...styles.secondaryBtn, padding: "8px 12px", fontSize: "13px" }} onClick={() => setExpandedHistoryId(expanded ? null : historyId)}>
                                  {expanded ? "收起本组记录" : "查看本组记录"}
                                </button>
                              </div>
                            </div>
                            {expanded && (
                              <div style={{ display: "grid", gap: "12px", marginTop: "14px" }}>
                                <div style={{ background: "#eef4ff", borderRadius: "14px", padding: "12px 14px", color: "#60708f", lineHeight: 1.7, fontSize: "14px" }}>
                                  每次练习内已按你的具体回应整理反馈。点击“查看这句反馈”可查看对应观察和下一步练习建议。
                                </div>
                                {practiceAttempts.map((attempt, attemptIndex) => {
                                  const item = attempt.latest;
                                  const transcript = attempt.transcript;
                                  const latestStudentTurnIndex = transcript.reduce((latestIndex, turn, turnIndex) => (
                                    turn.speaker === "student" || turn.sender === "me" ? turnIndex : latestIndex
                                  ), -1);
                                  return (
                                    <div
                                      key={attempt.id || `${historyId}-${attemptIndex}`}
                                      style={{
                                        display: "grid",
                                        gap: "10px",
                                        padding: attemptIndex === 0 ? "2px 0 16px" : "16px 0",
                                        borderTop: attemptIndex === 0 ? "none" : "1px solid #dfe7f2",
                                        lineHeight: 1.7,
                                      }}
                                    >
                                      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", color: "#60708f", fontSize: "14px", fontWeight: 700 }}>
                                        <span>{item.timestamp?.slice(11, 16) || "时间未标注"}</span>
                                        <span style={{ color: "#4f7cff" }}>{item.score} 分</span>
                                      </div>
                                      {transcript.length ? transcript.map((turn, turnIndex) => {
                                        const isStudentTurn = turn.speaker === "student" || turn.sender === "me";
                                        const savedTurnFeedback = attempt.feedbackByTurnIndex.get(turnIndex);
                                        const turnFeedback = savedTurnFeedback
                                          ? getTurnSpecificFeedback(turn, [savedTurnFeedback], item, false)
                                          : (isStudentTurn ? getTurnSpecificFeedback(turn, [], item, turnIndex === latestStudentTurnIndex) : null);
                                        return (
                                          <div key={`${historyId}-transcript-${attemptIndex}-${turnIndex}`}>
                                            <div><strong>{isStudentTurn ? "我" : "对方"}：</strong>{turn.text}</div>
                                            {turnFeedback && (
                                              <details style={{ marginTop: "8px", background: "#fff", border: "1px solid #e5ebf5", borderRadius: "10px", padding: "0 10px" }}>
                                                <summary style={{ cursor: "pointer", padding: "9px 0", color: "#3f68ca", fontWeight: 700, fontSize: "14px" }}>查看这句反馈</summary>
                                                <div style={{ display: "grid", gap: "8px", padding: "0 0 10px", color: "#31415f" }}>
                                                  {turnFeedback.analysis && <div><strong>观察：</strong>{turnFeedback.analysis}</div>}
                                                  {turnFeedback.suggestion && <div><strong>{turnFeedback.guidanceLabel || "下次可以试试"}：</strong>{turnFeedback.suggestion}</div>}
                                                </div>
                                              </details>
                                            )}
                                          </div>
                                        );
                                      }) : <div style={{ color: "#7584a3" }}>这次互动没有保存可展示的原文。</div>}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))
                ) : (
                  <div style={{ padding: "18px 0", color: "#60708f", textAlign: "center" }}>
                    暂无保存的互动记录。完成一次练习后，这里会自动更新。
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

