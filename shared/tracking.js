export const TRACKING_WINDOW_LABEL = "过去两周";

export const TRACKING_ITEMS = [
  {
    key: "contextUnderstanding",
    label: "理解当前情境",
    prompt: "能理解对方是谁、正在说什么，以及此刻需要回应什么。",
    support: "先用一句话复述眼前发生的事，再回应自己的想法。",
  },
  {
    key: "socialPragmatics",
    label: "贴合对象表达",
    prompt: "会根据老师、同学、家人或工作人员调整表达方式。",
    support: "在练习前先确认对方是谁，再选择更贴合关系的称呼和语气。",
  },
  {
    key: "emotionResponse",
    label: "回应对方感受",
    prompt: "能注意到对方高兴、着急、失落等状态，并作出合适回应。",
    support: "先试着说出对方可能的感受，再补一句支持或询问。",
  },
  {
    key: "normExpression",
    label: "清楚礼貌表达",
    prompt: "表达大意清楚，也会自然使用称呼、请、谢谢等礼貌用语。",
    support: "把想说的话分成“称呼、事情、谢谢”三个小部分练习。",
  },
  {
    key: "dialogueMaintenance",
    label: "接住并继续对话",
    prompt: "回应后能补充信息、追问或自然结束，让交流不突然中断。",
    support: "每次回应后，尝试多补一句信息或一个简单问题。",
  },
  {
    key: "problemSolving",
    label: "协商下一步",
    prompt: "遇到变动或困难时，能说明情况，并提出一个可执行的下一步。",
    support: "用“现在情况是……，我可以……吗？”练习说明与协商。",
  },
];

export const TRACKING_RESPONSE_OPTIONS = [
  { value: 1, label: "很少" },
  { value: 2, label: "偶尔" },
  { value: 3, label: "有时" },
  { value: 4, label: "经常" },
  { value: 5, label: "大多数时候" },
];

export const TRAINING_LEVELS = [
  {
    key: "guided",
    label: "引导练习",
    shortLabel: "引导",
    description: "提供目标、可用信息和一句可参考的开头。",
  },
  {
    key: "supported",
    label: "半引导",
    shortLabel: "半引导",
    description: "提供背景和一个关键提示，保留更多自己组织表达的空间。",
  },
  {
    key: "independent",
    label: "独立挑战",
    shortLabel: "独立",
    description: "只保留必要背景，按真实对话推进。",
  },
];

export function emptyTrackingScores() {
  return Object.fromEntries(TRACKING_ITEMS.map((item) => [item.key, null]));
}

export function trackingAverage(scores) {
  const values = TRACKING_ITEMS
    .map((item) => Number(scores?.[item.key]))
    .filter((value) => Number.isFinite(value) && value >= 1 && value <= 5);
  return values.length ? Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10 : null;
}

export function lowestTrackedItem(scores) {
  return TRACKING_ITEMS
    .map((item) => ({ ...item, value: Number(scores?.[item.key]) }))
    .filter((item) => Number.isFinite(item.value) && item.value >= 1 && item.value <= 5)
    .sort((left, right) => left.value - right.value)[0] || null;
}
