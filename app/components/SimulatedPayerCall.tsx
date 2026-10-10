"use client";

import { useEffect, useRef, useState } from "react";
import type { ArScenario } from "../data/exploration";

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
  const transcript = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { transcript.current?.scrollTo({ top: transcript.current.scrollHeight, behavior: "smooth" }); }, [messages, asked]);
  useEffect(() => { if (!verified) input.current?.focus(); }, [step, verified]);

  const respond = (event: React.FormEvent) => {
    event.preventDefault();
    const answer = reply.trim();
    if (!answer || verified) return;
    const matched = callerAnswerMatches(step, answer, s);
    const response = matched ? step === 4 ? `Thank you, ${answers[0]}. I have verified the provider and ${s.patient.name} for ${s.patient.dos}. How may I help you today?` : prompts[step + 1] : corrections[step];
    setMessages(previous => [...previous, { speaker: "you", text: answer }, { speaker: "rep", text: response }]);
    onTurn(`Representative: ${messages[messages.length - 1].text}\nCaller: ${answer}\nRepresentative: ${response}`);
    setReply("");
    input.current?.focus();
    if (!matched) return;
    setAnswers(previous => [...previous, answer]);
    if (step === 4) onVerified(answers[0], answers[1]);
    else setStep(step + 1);
  };

  return <section className="payer-conversation payer-simulated-call" aria-label="Simulated payer call">
    <div className="payer-contact-heading"><div><span className="payer-dot"/> Provider services call<h2>Morgan · Payer representative</h2></div><span>{reference}</span></div>
    <p className="payer-call-caption">This conversation represents your phone call. Type your spoken responses below.</p>
    <div className="payer-transcript" role="log" aria-label="Call conversation" aria-live="polite" ref={transcript}>
      {messages.map((message, index) => <p className={message.speaker === "you" ? "payer-you" : "payer-rep"} key={index}><strong>{message.speaker === "you" ? "You" : "Morgan"}</strong>{message.text}</p>)}
      {asked.map(index => <div key={`question-${index}`}><p className="payer-you"><strong>You</strong>{questions[index].question}</p><p className="payer-rep"><strong>Morgan</strong>{questions[index].answer}{index === referenceIndex && <small>Current practice reference: {reference}. Historical case references remain separate.</small>}</p></div>)}
    </div>
    {!verified ? <form className="payer-call-reply" onSubmit={respond}><label htmlFor="payer-spoken-reply">Your response<input id="payer-spoken-reply" ref={input} value={reply} onChange={event => setReply(event.target.value)} placeholder={step >= 3 ? "Enter date, e.g. MM/DD/YYYY" : "Type what you would say…"} autoComplete="off" maxLength={160}/></label><button className="payer-primary" disabled={!reply.trim()}>Reply to representative</button></form> : <>
      <h3>What would you like to ask?</h3>
      <div className="payer-question-list payer-call-questions">{questions.map((question, index) => <button key={index} disabled={asked.includes(index)} onClick={() => onAsk(index)}>{asked.includes(index) ? "✓ " : "+ "}{question.question}</button>)}</div>
      <button className="payer-primary" disabled={!canEnd} onClick={onEnd}>End call & save contact</button>
      {!canEnd && <small>Capture the relevant case findings and contact reference before ending the call.</small>}
    </>}
  </section>;
}
