export function generateStreamTwiml(params: {
  readonly websocketUrl: string;
  readonly greeting?: string;
}): string {
  const greeting = params.greeting ?? "Hello, how can I help you today?";

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<Response>",
    `  <Say>${escapeXml(greeting)}</Say>`,
    "  <Connect>",
    `    <Stream url="${escapeXml(params.websocketUrl)}" />`,
    "  </Connect>",
    "</Response>",
  ].join("\n");
}

export function generateSayTwiml(params: {
  readonly message: string;
  readonly voice?: string;
  readonly language?: string;
}): string {
  const voice = params.voice ?? "Polly.Joanna";
  const language = params.language ?? "en-US";

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<Response>",
    `  <Say voice="${escapeXml(voice)}" language="${escapeXml(language)}">${escapeXml(params.message)}</Say>`,
    "</Response>",
  ].join("\n");
}

export function generatePlayTwiml(params: {
  readonly audioUrl: string;
}): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    "<Response>",
    `  <Play>${escapeXml(params.audioUrl)}</Play>`,
    "</Response>",
  ].join("\n");
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
