import { getStore } from "@netlify/blobs";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { SEED_QUESTIONS } from "./seed.mts";

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export function error(message: string, status = 400) {
  return json({ error: message }, status);
}

export function dataStore() {
  return getStore({ name: "exam-system", consistency: "strong" });
}

export function certStore() {
  return getStore({ name: "certificates", consistency: "strong" });
}

export function siteUrl(req: Request) {
  const configured = Netlify.env.get("URL") || Netlify.env.get("SITE_URL");
  if (configured) return configured.replace(/\/$/, "");
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

export function adminPassword() {
  return Netlify.env.get("ADMIN_PASSWORD") || "BoostifyAdmin2026!";
}

export function sessionSecret() {
  return Netlify.env.get("ADMIN_SESSION_SECRET") || adminPassword() + "-session";
}

export function sign(value: string, secret = sessionSecret()) {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function makeToken(payload: Record<string, unknown>) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readToken<T extends Record<string, unknown>>(token: string | null | undefined): T | null {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expected = sign(body);
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

export function requireAdmin(req: Request) {
  const header = req.headers.get("authorization") || "";
  const m = header.match(/^Bearer\s+(.+)$/i);
  const data = readToken<{ role?: string; exp?: number }>(m?.[1]);
  if (!data || data.role !== "admin") return null;
  if (data.exp && Date.now() > data.exp) return null;
  return data;
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPhone(phone: string) {
  const digits = phone.replace(/[^\d+]/g, "");
  return digits.length >= 8 && digits.length <= 20;
}

export function newId() {
  return randomUUID();
}

export async function readJsonBody<T>(req: Request): Promise<T> {
  return (await req.json()) as T;
}

export type Question = {
  id: string;
  courseId: string;
  prompt: string;
  choices: string[];
  correctIndex: number;
  sortOrder: number;
  active: boolean;
};

export type Attempt = {
  id: string;
  courseId: string;
  fullName: string;
  phone: string;
  email: string;
  status: string;
  startedAt?: string;
  endsAt?: string;
  submittedAt?: string;
  scorePercent?: number;
  correctCount?: number;
  totalCount?: number;
  answers?: Record<string, number>;
  createdAt: string;
};

export type Certificate = {
  id: string;
  attemptId: string;
  courseId: string;
  fullName: string;
  email: string;
  certNumber: string;
  issuedAt: string;
  imageKey?: string | null;
  verifyUrl: string;
};

const COURSES = {
  basics: { id: "basics", title: "AI Basics", passScore: 80, durationMinutes: 60, certPrefix: "AI-BASICS" },
  dev: { id: "dev", title: "AI Development", passScore: 80, durationMinutes: 60, certPrefix: "AI-DEV" },
} as const;

export function getCourse(id: string) {
  return COURSES[id as keyof typeof COURSES] || null;
}

export async function ensureSeeded() {
  const store = dataStore();
  const flag = await store.get("seeded", { type: "json" });
  if (flag?.ok) return;

  await store.setJSON("questions:basics", SEED_QUESTIONS.basics);
  await store.setJSON("questions:dev", SEED_QUESTIONS.dev);
  await store.setJSON("counters", { basics: 0, dev: 0 });
  await store.setJSON("attempts-index", []);
  await store.setJSON("certs-index", []);
  await store.setJSON("seeded", { ok: true, at: new Date().toISOString() });
}

export async function listQuestions(courseId: string, activeOnly = false) {
  await ensureSeeded();
  const store = dataStore();
  const list = (await store.get(`questions:${courseId}`, { type: "json" })) as Question[] | null;
  const rows = Array.isArray(list) ? list : [];
  return rows
    .filter((q) => (activeOnly ? q.active : true))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id));
}

export async function saveQuestions(courseId: string, questions: Question[]) {
  await dataStore().setJSON(`questions:${courseId}`, questions);
}

export async function saveAttempt(attempt: Attempt) {
  const store = dataStore();
  await store.setJSON(`attempt:${attempt.id}`, attempt);
  const index = ((await store.get("attempts-index", { type: "json" })) as string[] | null) || [];
  if (!index.includes(attempt.id)) {
    index.unshift(attempt.id);
    await store.setJSON("attempts-index", index.slice(0, 500));
  }
}

export async function getAttempt(id: string) {
  return (await dataStore().get(`attempt:${id}`, { type: "json" })) as Attempt | null;
}

export async function listAttempts() {
  const store = dataStore();
  const index = ((await store.get("attempts-index", { type: "json" })) as string[] | null) || [];
  const rows: Attempt[] = [];
  for (const id of index.slice(0, 200)) {
    const a = await getAttempt(id);
    if (a) rows.push(a);
  }
  return rows;
}

export async function findCertByEmailCourse(email: string, courseId: string) {
  const key = `email-cert:${normalizeEmail(email)}:${courseId}`;
  const certNumber = await dataStore().get(key, { type: "text" });
  if (!certNumber) return null;
  return getCert(certNumber);
}

export async function getCert(certNumber: string) {
  return (await dataStore().get(`cert:${certNumber.toUpperCase()}`, { type: "json" })) as Certificate | null;
}

export async function saveCert(cert: Certificate) {
  const store = dataStore();
  await store.setJSON(`cert:${cert.certNumber.toUpperCase()}`, cert);
  await store.set(`email-cert:${normalizeEmail(cert.email)}:${cert.courseId}`, cert.certNumber);
  const index = ((await store.get("certs-index", { type: "json" })) as string[] | null) || [];
  if (!index.includes(cert.certNumber)) {
    index.unshift(cert.certNumber);
    await store.setJSON("certs-index", index.slice(0, 500));
  }
}

export async function listCerts() {
  const store = dataStore();
  const index = ((await store.get("certs-index", { type: "json" })) as string[] | null) || [];
  const rows: Certificate[] = [];
  for (const n of index.slice(0, 200)) {
    const c = await getCert(n);
    if (c) rows.push(c);
  }
  return rows;
}

export async function nextCertNumber(courseId: string) {
  const store = dataStore();
  const counters = ((await store.get("counters", { type: "json" })) as Record<string, number> | null) || {
    basics: 0,
    dev: 0,
  };
  counters[courseId] = (counters[courseId] || 0) + 1;
  await store.setJSON("counters", counters);
  const course = getCourse(courseId)!;
  const year = new Date().getFullYear();
  return `${course.certPrefix}-${year}-${String(counters[courseId]).padStart(4, "0")}`;
}
