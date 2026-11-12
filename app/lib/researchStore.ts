"use client";

import { useEffect, useState } from "react";
import type { ArScenario } from "../data/exploration";

export type ResearchEvent = {
  id: string; at: string; channel: "portal" | "phone" | "chat";
  type: string; text: string;
};
export type ResearchReceipt = {
  id: string; at: string; category: string; reference: string;
  documents: string[]; recipient: string; subject: string; letter: string;
  followUp: string; status: "Acknowledged";
};
export type ResearchRecord = {
  verified: boolean; views: string[]; events: ResearchEvent[];
  receipts: ResearchReceipt[]; closedChannels: string[];
};
export type LearnerSession = { code: string; name: string; email?: string; createdAt: string };
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const DATA_VERSION = "rcm-payer-2026-07-26-v1";
const SESSION_KEY = "rcm:active-session:v1";
const CHANGE_EVENT = "rcm-research-change";
export const emptyResearch = (): ResearchRecord => ({ verified: false, views: [], events: [], receipts: [], closedChannels: [] });

export function session(): LearnerSession | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); } catch { return null; }
}
export function startSession(name: string, code?: string, email = "") {
  const value = { name, email: email.trim(), code: code || Array.from(crypto.getRandomValues(new Uint8Array(24)), x => x.toString(16).padStart(2, "0")).join(""), createdAt: new Date().toISOString() };
  localStorage.setItem(SESSION_KEY, JSON.stringify(value));
  localStorage.setItem(`rcm:session:${value.code}`, JSON.stringify(value));
  window.dispatchEvent(new Event(CHANGE_EVENT));
  return value;
}
export function key(caseId: string, kind: string) { return `rcm:${session()?.code || "none"}:${caseId}:${kind}`; }
export function readWork<T>(caseId: string, kind: string): T | null {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(key(caseId, kind)) || "null"); } catch { return null; }
}
export function saveWork(caseId: string, kind: string, value: unknown) {
  try { localStorage.setItem(key(caseId, kind), JSON.stringify(value)); window.dispatchEvent(new Event(CHANGE_EVENT)); }
  catch { window.dispatchEvent(new Event("rcm-storage-error")); }
}
export function readResearch(caseId: string): ResearchRecord { return readWork<ResearchRecord>(caseId, "research") || emptyResearch(); }
export async function mutateResearch(caseId: string, edit: (record: ResearchRecord) => ResearchRecord) {
  const write = () => saveWork(caseId, "research", edit(readResearch(caseId)));
  if (navigator.locks) await navigator.locks.request(key(caseId, "research-lock"), write); else write();
}
export function addEvent(caseId: string, channel: ResearchEvent["channel"], type: string, text: string) {
  const event: ResearchEvent = { id: crypto.randomUUID(), at: new Date().toISOString(), channel, type, text };
  return mutateResearch(caseId, r => ({ ...r, events: [...r.events, event] }));
}
export function useResearch(caseId: string) {
  const [record, setRecord] = useState<ResearchRecord>(emptyResearch);
  useEffect(() => {
    const refresh = () => setRecord(readResearch(caseId));
    refresh(); window.addEventListener("storage", refresh); window.addEventListener(CHANGE_EVENT, refresh);
    return () => { window.removeEventListener("storage", refresh); window.removeEventListener(CHANGE_EVENT, refresh); };
  }, [caseId]);
  return record;
}
export function researchComplete(scenario: ArScenario, r: ResearchRecord) {
  const contact = r.closedChannels.some(c => c === "phone" || c === "chat");
  // These two cases require a payer-side action, not a passive status lookup.
  if (["AR-3119", "AR-3174"].includes(scenario.id)) return r.verified && contact;
  return r.verified && (contact || (r.views.includes("claims") && r.views.includes("authorization")));
}
export function researchReport(record: ResearchRecord) {
  return [
    `Search verification: ${record.verified ? "Matched" : "Not completed"}`,
    `Portal sections reviewed: ${record.views.join(", ") || "None"}`,
    ...record.events.map(e => `${e.at} · ${e.channel} · ${e.type}: ${e.text}`),
    ...record.receipts.flatMap(r => [
      `${r.at} · ${r.category} · ${r.reference} · ${r.status}`,
      `Recipient: ${r.recipient}; Subject: ${r.subject}`,
      `Documents: ${r.documents.join("; ")}; Follow-up: ${r.followUp}`,
      `Submitted letter: ${r.letter}`,
    ]),
    "Submission acknowledgments do not change claim payment, authorization or adjudication.",
  ];
}
