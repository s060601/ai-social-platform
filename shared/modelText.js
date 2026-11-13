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

  // Remove stray or malformed markers such as </think_never_used_xxx.
  cleaned = cleaned.replace(
    new RegExp(`<\\/?${INTERNAL_TAG}(?:\\s[^>]*)?>?`, "gi"),
    "",
  );

  return cleaned.replace(/\n{3,}/g, "\n\n").trim();
}
