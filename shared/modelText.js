const INTERNAL_TAG = "(?:think|reasoning|analysis)(?:_[a-z0-9_-]+)?";

export function sanitizeModelText(value) {
  if (typeof value !== "string") return "";

  let cleaned = value;

  // Remove complete internal-reasoning blocks, including suffixed Coze tags.
  cleaned = cleaned.replace(
    new RegExp(`<${INTERNAL_TAG}\\b[^>]*>[\\s\\S]*?<\\/${INTERNAL_TAG}\\s*>`, "gi"),
    "",
  );

  // An unclosed opening tag means the remaining text is internal output.
  cleaned = cleaned.replace(
    new RegExp(`<${INTERNAL_TAG}\\b[^>]*>[\\s\\S]*$`, "gi"),
    "",
  );

  // Streaming services sometimes omit the closing bracket or add an unseen
  // suffix. Strip the whole marker line instead of exposing it to learners.
  cleaned = cleaned.replace(
    /<\/?(?:think|reasoning|analysis)[^>\r\n]*>?/gi,
    "",
  );

  // Remove any remaining regular internal markers.
  cleaned = cleaned.replace(
    new RegExp(`<\\/?${INTERNAL_TAG}(?:\\s[^>]*)?>?`, "gi"),
    "",
  );

  return cleaned.replace(/\n{3,}/g, "\n\n").trim();
}
