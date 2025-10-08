export function calculateMessageParts(text: string): number {
  // SMS encoding: GSM-7 (160 chars) or UCS-2/UTF-16 (70 chars)
  // With concatenation: 153 chars (GSM-7) or 67 chars (UCS-2)

  const hasUnicode = /[^\u0000-\u007F]/.test(text);
  const length = text.length;

  if (hasUnicode) {
    // UCS-2 encoding
    if (length <= 70) return 1;
    return Math.ceil(length / 67);
  } else {
    // GSM-7 encoding
    if (length <= 160) return 1;
    return Math.ceil(length / 153);
  }
}

export function appendOptOutLine(message: string): string {
  const optOut = ' Reply STOP to opt out.';
  return message + optOut;
}

export function renderTemplate(template: string, variables: Record<string, string>): string {
  let rendered = template;

  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    rendered = rendered.replace(regex, value);
  }

  return rendered;
}

export function isStopKeyword(message: string): boolean {
  const normalized = message.trim().toUpperCase();
  const stopKeywords = ['STOP', 'END', 'UNSUBSCRIBE', 'CANCEL', 'OPT OUT', 'QUIT', 'OPTOUT'];
  return stopKeywords.includes(normalized);
}

export function isStartKeyword(message: string): boolean {
  const normalized = message.trim().toUpperCase();
  const startKeywords = ['START', 'SUBSCRIBE', 'YES', 'UNSTOP', 'OPTIN', 'OPT IN'];
  return startKeywords.includes(normalized);
}
