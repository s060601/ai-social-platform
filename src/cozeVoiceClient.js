import { RealtimeClient, EventNames, RealtimeUtils } from "@coze/realtime-api";
import { API_BASE } from "./config";

function normalizeText(value) {
  if (typeof value !== "string") return "";

  const text = value.trim();
  if (!text) return "";

  if ((text.startsWith("{") && text.endsWith("}")) || (text.startsWith("[") && text.endsWith("]"))) {
    try {
      return pickText(JSON.parse(text));
    } catch {
      return "";
    }
  }

  return text;
}

function pickText(event) {
  if (!event || typeof event !== "object") return "";

  const direct = [
    event.text,
    event.transcript,
    event.content,
    event.delta,
    event.message?.content,
    event.message?.text,
    event.data?.text,
    event.data?.transcript,
    event.data?.content,
    event.data?.delta,
    event.data?.message?.content,
    event.data?.message?.text,
  ];

  for (const item of direct) {
    const text = normalizeText(item);
    if (text) return text;
  }

  return "";
}

function readEventType(eventName, event) {
  return String(event?.event_type || eventName || "");
}

function readRole(event) {
  return String(
    event?.role ||
      event?.data?.role ||
      event?.message?.role ||
      event?.data?.message?.role ||
      ""
  ).toLowerCase();
}

function makeMessageEvent(eventName, event) {
  const type = readEventType(eventName, event);
  const role = readRole(event);
  const isUserRole = role === "user";
  const isAssistantRole = role === "assistant" || role === "bot";
  const isUserTranscript = type.includes("audio_transcript") || isUserRole;
  const isAssistantMessage = type.includes("conversation.message") || type.includes("audio.sentence");
  const shouldShowText = isUserTranscript || isAssistantMessage || isAssistantRole;
  const text = shouldShowText ? pickText(event) : "";

  return {
    type,
    text,
    sender: isUserTranscript ? "me" : "caller",
    isFinal:
      type.includes("completed") ||
      type.includes("message.completed") ||
      type.includes("audio_transcript.completed"),
    isTranscript: isUserTranscript,
    isAssistantMessage: isAssistantMessage && !isUserTranscript,
    isSpeaking: type.includes("speech_started"),
    isStopped: type.includes("speech_stopped"),
    raw: event,
  };
}

export async function createCozeVoiceSession({
  audioInputDeviceId,
  prologueContent,
  onStatus,
  onMessage,
  onTranscript,
  onAssistantText,
  onEvent,
  onError,
}) {
  const permission = await RealtimeUtils.checkDevicePermission();

  if (!permission.audio) {
    throw new Error("需要允许浏览器使用麦克风");
  }

  const configRes = await fetch(`${API_BASE}/api/voice/coze-config`);
  const config = await configRes.json();

  if (!configRes.ok) {
    throw new Error(config?.detail || config?.error || "获取实时语音配置失败");
  }

  const client = new RealtimeClient({
    baseURL: config.baseURL,
    accessToken: config.accessToken,
    botId: config.botId,
    voiceId: config.voiceId || undefined,
    connectorId: config.connectorId || "1024",
    userId: `voice-user-${Date.now()}`,
    debug: true,
    allowPersonalAccessTokenInBrowser: true,
    audioMutedDefault: false,
    isAutoSubscribeAudio: true,
    prologueContent,
  });

  client.on(EventNames.CONNECTED, () => {
    onStatus?.("已连接，可以开始说话");
  });

  client.on(EventNames.DISCONNECTED, () => {
    onStatus?.("通话已结束");
  });

  client.on(EventNames.ERROR, (_, event) => {
    const message = event?.message || event?.error?.message || "实时语音连接出错";
    onError?.(message);
  });

  client.on(EventNames.ALL_SERVER, (eventName, event) => {
    onEvent?.(eventName, event);

    const message = makeMessageEvent(eventName, event);

    if (message.type.includes("speech_started")) {
      onStatus?.(message.type.includes("user") ? "正在听你说话..." : "AI 正在回应...");
      onEvent?.(eventName, { ...event, uiSignal: message.type.includes("user") ? "user_speaking" : "ai_speaking" });
    }

    if (message.type.includes("speech_stopped")) {
      onStatus?.(message.type.includes("user") ? "正在识别你的话..." : "可以继续说话");
      onEvent?.(eventName, { ...event, uiSignal: message.type.includes("user") ? "user_stopped" : "ai_stopped" });
    }

    if (!message.text) return;

    if (message.isTranscript) {
      onTranscript?.(message);
      return;
    }

    if (message.isAssistantMessage) {
      onAssistantText?.(message);
      return;
    }

    onMessage?.(message);
  });

  client.on(EventNames.ALL_CLIENT, (eventName, event) => {
    onEvent?.(eventName, event);
  });

  await client.connect();

  if (audioInputDeviceId) {
    await client.setAudioInputDevice(audioInputDeviceId);
  }

  await client.setAudioEnable(true);

  return {
    disconnect() {
      client.disconnect();
    },
    interrupt() {
      client.interrupt();
    },
    setMicrophone(enabled) {
      client.setAudioEnable(enabled);
    },
    setAudioInputDevice(deviceId) {
      return client.setAudioInputDevice(deviceId);
    },
    sendText(text) {
      return client.sendMessage({
        id: `event_${Date.now()}`,
        event_type: "conversation.message.create",
        data: {
          role: "user",
          content_type: "text",
          content: text,
        },
      });
    },
  };
}
