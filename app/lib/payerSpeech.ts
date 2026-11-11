const reference = /\b(reference|confirmation|tracking|ref|call id)\b/i;
const caseTopics: Record<string, RegExp[]> = {
  "AR-3106": [/pric|group(er|ing)|case.rate|reimburse|rate/i, /reprocess|previous request|prior request|still open|pending/i, /reconsider|pricing review|support|attach|document/i],
  "AR-3119": [/record|document|paperwork|missing/i, /liability|determination|adjuster decision|responsib/i, /escalat|supervisor|manager/i],
  "AR-3142": [/recei|accept|receipt|on file/i, /link|taxonomy|reference field|associate/i, /appeal|packet|include|attach|document/i],
  "AR-3160": [/other (payer|insurance|coverage)|primary|coordination|\bcob\b/i, /correct|resubmi|primary (eob|paid|process)|adjudicat/i, /patient|member|bill|transfer|responsib/i],
  "AR-3174": [/units?|quantity|j1745|how many/i, /link|reprocess|full auth|corrected claim/i, /turnaround|how long|business days|time frame|timeline/i],
  "DM-5101": [/medical necessity|medical.necessity|authoriz|denial|denied/i, /clinician|review|records?|packet/i, /appeal|channel|where|deadline|submit|due/i],
  "DM-5102": [/authoriz|approval|inpatient|outpatient|observation|classif/i, /mapping|reprocess|correct|by phone|provider services/i, /documents?|packet|include|deadline|due|attach/i],
  "DM-5103": [/referral|specialty|valid/i, /appeal|correct|resubmi|rebill/i, /timely|filing|deadline|preserve|receipt/i],
  "DM-5104": [/diagnos|authoriz|denial|denied/i, /correct|resubmi|coding|replace/i, /deadline|filing|due|last day/i],
  "DM-5105": [/units?|quantity|j1745|how many/i, /reprocess|truncat|quantity|55100842/i, /dispute|appeal|deadline|due|next level/i],
};
const generalTopics = [
  /cover|eligib|active|enroll|insur/i,
  /deductible|out.of.pocket|\boop\b|accumulat/i,
  /authoriz|referral|approval/i,
  /status|payment|paid|adjudicat|claim on file/i,
  /deadline|time limit|filing|appeal window|days to appeal/i,
  /guarantee|ensure|does.*mean|will.*pay/i,
];

export function matchesSpokenQuestion(caseId: string, index: number, caseQuestionCount: number, prompt: string, spoken: string) {
  const text = spoken.trim().toLowerCase();
  if (text.split(/\s+/).length < 2 || /^(hello|good morning|thank you|thanks)[.!]?$/i.test(text)) return false;
  if (prompt.toLowerCase().replace(/[^\w ]/g, "") === text.replace(/[^\w ]/g, "")) return true;
  if (!/[?]|\b(what|how|why|when|where|which|is|was|are|has|have|did|do|can|could|will|would|may|please|check|confirm|verify|tell|need|calling|wondering)\b/i.test(text)) return false;
  const topic = index >= caseQuestionCount ? generalTopics[index - caseQuestionCount]
    : reference.test(prompt) ? reference : caseTopics[caseId]?.[index];
  return Boolean(topic?.test(text));
}

type SpeechResult = { isFinal: boolean; length: number; [index: number]: { transcript: string } };
export type CallSpeechRecognition = {
  lang: string;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: ArrayLike<SpeechResult> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

export function speechRecognition() {
  const browser = window as Window & {
    SpeechRecognition?: new () => CallSpeechRecognition;
    webkitSpeechRecognition?: new () => CallSpeechRecognition;
  };
  return browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
}

export function spokenPayerText(text: string) {
  return text.replace(/\b(NPI|TIN|ICN|EOB|COB|MAR|EFT|OOP|PCP)\b/g, acronym => acronym.split("").join(" "))
    .replace(/\s*>\s*/g, ", then ")
    .replace(/;\s*/g, ". ");
}

const digitWords: Record<string, string> = {
  zero: "0", oh: "0", one: "1", two: "2", three: "3", four: "4",
  five: "5", six: "6", seven: "7", eight: "8", nine: "9",
};

export function spokenCallerAnswer(step: number, spoken: string) {
  const text = spoken.trim().replace(/[.!?]+$/, "");
  if (step === 0) return text.replace(/^(?:hello[, ]+|hi[, ]+)?(?:my name is|this is|i am|i['’]m)\s+/i, "");
  if (step === 1 || step === 2) {
    return text
      .replace(/^(?:(?:the|my|our)\s+)?(?:(?:provider\s+)?(?:n[. ]?p[. ]?i|t[. ]?i[. ]?n|tax(?: identification)?(?: id)?|member id)(?: number)?\s*(?:is\b|:)?\s*)/i, "")
      .replace(/\b(?:dash|hyphen)\b/gi, "-")
      .replace(/\b(zero|oh|one|two|three|four|five|six|seven|eight|nine)\b/gi, word => digitWords[word.toLowerCase()])
      .toUpperCase();
  }
  return text
    .replace(/^(?:(?:the|patient['’]s)\s+)?(?:date of (?:birth|service)|d[. ]?o[. ]?[bs])\s*(?:is\b|:)?\s*/i, "")
    .replace(/\b(\d{1,2})(?:st|nd|rd|th)\b/gi, "$1")
    .replace(/^(\d{1,2})\s+(\d{1,2})\s+(\d{4})$/, "$1/$2/$3");
}
