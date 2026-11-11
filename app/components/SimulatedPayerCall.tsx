"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ArScenario } from "../data/exploration";
import { matchesSpokenQuestion, speechRecognition, spokenPayerText, type CallSpeechRecognition } from "../lib/payerSpeech";

const clean = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
const date = (value: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(`${value} UTC`);
  return Number.isFinite(parsed.getTime()) ? parsed.toISOString().slice(0, 10) : "";
};
export function callerAnswerMatches(step: number, answer: string, s: ArScenario) {
  if (step === 0) return answer.trim().length >= 2;
  if (step === 1) return [s.patient.providerNpi, s.patient.providerTaxId].some(value => clean(value) === clean(answer));
  if (step === 2) return clean(answer) === clean(s.patient.memberId);
  if (step === 3) return date(answer) !== "" && date(answer) === date(s.patient.dob);
  if (step === 4) return date(answer) !== "" && date(answer) === date(s.patient.dos);
  return false;
}

type Props = {
  scenario: ArScenario;
  reference: string;
  verified: boolean;
  questions: { question: string; answer: string }[];
  asked: number[];
  referenceIndex: number;
  canEnd: boolean;
  onTurn: (text: string) => void;
  onVerified: (caller: string, provider: string) => void;
  onAsk: (index: number) => void;
  onEnd: () => void;
};

export function SimulatedPayerCall({ scenario: s, reference, verified, questions, asked, referenceIndex, canEnd, onTurn, onVerified, onAsk, onEnd }: Props) {
  const prompts = [
    `Thank you for calling ${s.patient.payer} provider services. My name is Morgan. May I have your name, please?`,
    "Thank you. What is the provider’s NPI or tax identification number?",
    "I have the provider record. May I have the member ID?",
    "Thank you. What is the patient’s date of birth?",
    "And what date of service are you calling about?",
  ];
  const corrections = [
    "Could you give me your name, please?",
    "I’m unable to match that provider number. Could you check the NPI or tax ID and read it to me again?",
    "I’m not finding a matching member with that ID. Could you check it and try again?",
    "That date of birth does not match the member record. Could you confirm it again?",
    "I’m not finding this claim for that date. Could you check the date of service and confirm it again?",
  ];
  const [step, setStep] = useState(0);
  const [reply, setReply] = useState("");
  const [answers, setAnswers] = useState<string[]>([]);
  const [messages, setMessages] = useState<{ speaker: "you" | "rep"; text: string }[]>([{ speaker: "rep", text: prompts[0] }]);
  const [selected, setSelected] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const [microphoneReady, setMicrophoneReady] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [notice, setNotice] = useState("");
  const recognition = useRef<CallSpeechRecognition | null>(null);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const greeting = useRef(prompts[0]);
  const lastResponse = messages.findLast(message => message.speaker === "rep")?.text ?? greeting.current;

  const playReply = useCallback((text: string) => {
    if (!("speechSynthesis" in window)) {
      setNotice("Voice playback is unavailable in this browser. Open the transcript to read Morgan’s reply.");
      return;
    }
    const speech = window.speechSynthesis;
    const voices = speech.getVoices().filter(voice => /^en-US$/i.test(voice.lang));
    const line = new SpeechSynthesisUtterance(spokenPayerText(text));
    line.lang = "en-US";
    line.rate = .96;
    line.voice = voices.find(voice => voice.localService && /premium|enhanced|natural/i.test(voice.name))
      ?? voices.find(voice => voice.localService && /Samantha|Ava|Jenny|Aria/i.test(voice.name))
      ?? voices.find(voice => voice.localService) ?? null;
    utterance.current = line;
    speech.cancel();
    line.onend = () => { if (utterance.current === line) setSpeaking(false); };
    line.onerror = event => {
      if (utterance.current !== line) return;
      setSpeaking(false);
      if (!["canceled", "interrupted"].includes(event.error)) setNotice("Select Replay Rep to hear the reply.");
    };
    setSpeaking(true);
    speech.speak(line);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => playReply(greeting.current), 0);
    return () => {
      window.clearTimeout(timer);
      recognition.current?.abort();
      recognition.current = null;
      const pending = utterance.current;
      utterance.current = null;
      if (pending && "speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, [playReply]);

  const addTurn = (caller: string, response: string) => {
    setMessages(previous => [...previous, { speaker: "you", text: caller }, { speaker: "rep", text: response }]);
    playReply(response);
  };

  const respond = (event: React.FormEvent) => {
    event.preventDefault();
    const answer = reply.trim();
    if (!answer || verified || speaking) return;
    const matched = callerAnswerMatches(step, answer, s);
    const response = matched ? step === 4 ? "Thanks, I found the claim for that date. How can I help you today?" : prompts[step + 1] : corrections[step];
    addTurn(answer, response);
    onTurn(`Representative: ${lastResponse}
Caller: ${answer}
Representative: ${response}`);
    setReply("");
    if (!matched) return;
    setAnswers(previous => [...previous, answer]);
    if (step === 4) onVerified(answers[0], answers[1]);
    else setStep(step + 1);
  };

  const listen = () => {
    if (selected === null || asked.includes(selected) || speaking || recognition.current) return;
    const Recognition = speechRecognition();
    if (!Recognition) {
      setNotice("Speech recognition is unavailable. Try opening the Lab in Chrome to practice by phone.");
      return;
    }
    const index = selected;
    const question = questions[index];
    const mic = new Recognition();
    recognition.current = mic;
    mic.lang = "en-US";
    mic.continuous = false;
    mic.maxAlternatives = 3;
    let handled = false;
    mic.onstart = () => { if (recognition.current === mic) setMicrophoneReady(true); };
    mic.onresult = event => {
      if (recognition.current !== mic || handled) return;
      const result = Array.from(event.results).find(item => item.isFinal);
      if (!result) return;
      handled = true;
      const variants = Array.from(result, alternative => alternative.transcript);
      const spoken = variants.find(text => matchesSpokenQuestion(s.id, index, s.callQuestions.length, question.question, text));
      if (!spoken) {
        const clarification = "Sorry, I didn’t catch what you’re asking about. Could you ask that again?";
        addTurn(variants[0] || "", clarification);
        setNotice("Try asking the selected question again, using your own words or the suggested wording.");
        return;
      }
      const response = index === referenceIndex
        ? `Your reference for this practice call is ${reference}. The original case notes say: ${question.answer}`
        : question.answer;
      addTurn(spoken, response);
      onAsk(index);
      setSelected(null);
      setNotice("");
    };
    mic.onerror = event => {
      if (recognition.current !== mic) return;
      handled = true;
      const denied = event.error === "not-allowed" || event.error === "service-not-allowed";
      setNotice(denied ? "Allow microphone access for the Lab, then try again."
        : event.error === "no-speech" ? "No speech was detected. Select Ask Aloud and try again."
        : "Speech recognition could not connect. Try again or use a supported browser.");
    };
    mic.onend = () => {
      if (recognition.current !== mic) return;
      recognition.current = null;
      setListening(false);
      setMicrophoneReady(false);
      if (!handled) setNotice("No question was recognized. Select Ask Aloud and try again.");
    };
    setNotice("");
    setListening(true);
    try { mic.start(); }
    catch {
      recognition.current = null;
      setListening(false);
      setNotice("The microphone could not start. Check your browser permissions and try again.");
    }
  };

  return <section className="payer-conversation payer-simulated-call" aria-label="Simulated Payer Call">
    <div className="payer-contact-heading"><div><span className="payer-dot"/> Provider Services Call<h2>Morgan · Payer Representative</h2></div><span role="status">{speaking ? "Morgan Is Speaking" : microphoneReady ? "Listening" : listening ? "Connecting Microphone" : "Connected"}</span></div>
    <div className="payer-voice-tools">
      <button type="button" onClick={() => playReply(lastResponse)} disabled={listening || speaking}>Replay Rep</button>
      {speaking && <button type="button" onClick={() => { utterance.current = null; window.speechSynthesis.cancel(); setSpeaking(false); }}>Stop Playback</button>}
    </div>
    {notice && <p className="payer-feedback" role="status">{notice}</p>}
    {!verified ? <form className="payer-call-reply" onSubmit={respond}>
      <label htmlFor="payer-spoken-reply">{["Caller Name", "Provider NPI Or TIN", "Member ID", "Date Of Birth", "Date Of Service"][step]}
        <input id="payer-spoken-reply" value={reply} onChange={event => setReply(event.target.value)} placeholder={step >= 3 ? "MM/DD/YYYY" : undefined} autoComplete="off" maxLength={160}/>
      </label>
      <button className="payer-primary" disabled={!reply.trim() || speaking}>Confirm</button>
    </form> : <>
      <h3>Questions To Ask</h3>
      <div className="payer-question-list payer-call-questions">{questions.map((question, index) =>
        <button key={index} disabled={asked.includes(index) || listening || speaking} aria-pressed={selected === index} onClick={() => { setSelected(index); setNotice(""); }}>
          {asked.includes(index) ? "✓ " : ""}{question.question}
        </button>
      )}</div>
      {selected !== null && <div className="payer-ask-aloud">
        <p>Ask in your own words or use the suggested question. Your browser processes speech. Use fictional case information only.</p>
        {listening
          ? <button type="button" className="payer-primary" onClick={() => recognition.current?.stop()} disabled={!microphoneReady}>Finish Speaking</button>
          : <button type="button" className="payer-primary" onClick={listen} disabled={speaking}>Ask Aloud</button>}
      </div>}
      <button className="payer-primary" disabled={!canEnd || listening || speaking} onClick={onEnd}>End Call &amp; Save Contact</button>
      {!canEnd && <small>Capture the relevant case findings and call reference before ending the call.</small>}
    </>}
    <details className="payer-call-transcript">
      <summary>Call Transcript</summary>
      <div className="payer-transcript" aria-label="Call Conversation">
        {messages.map((message, index) => <p className={message.speaker === "you" ? "payer-you" : "payer-rep"} key={index}>
          <strong>{message.speaker === "you" ? "You" : "Morgan"}</strong>{message.text}
        </p>)}
      </div>
    </details>
  </section>;
}
