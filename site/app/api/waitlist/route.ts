import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { NextResponse } from "next/server";

type WaitlistRole = "Platform Eng" | "Security" | "Product" | "Other";

type WaitlistEntry = {
  id: string;
  email: string;
  role: WaitlistRole;
  company: string | null;
  created_at: string;
  ip: string;
};

type WaitlistBody = {
  email?: unknown;
  role?: unknown;
  company?: unknown;
  website?: unknown;
};

const allowedRoles = new Set<WaitlistRole>(["Platform Eng", "Security", "Product", "Other"]);
const rateWindowMs = 10 * 60 * 1000;
const rateLimitMax = 5;
const requestBuckets = new Map<string, number[]>();

function getClientIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const [first] = forwarded.split(",");
    if (first) return first.trim();
  }
  return request.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(ip: string) {
  const now = Date.now();
  const existing = requestBuckets.get(ip) || [];
  const valid = existing.filter((time) => now - time < rateWindowMs);
  if (valid.length >= rateLimitMax) {
    requestBuckets.set(ip, valid);
    return true;
  }
  valid.push(now);
  requestBuckets.set(ip, valid);
  return false;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function loadEntries(filePath: string): Promise<WaitlistEntry[]> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WaitlistEntry[]) : [];
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  const ip = getClientIp(request);

  if (isRateLimited(ip)) {
    return NextResponse.json({ message: "Too many requests. Please try again later." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as WaitlistBody | null;
  if (!body) {
    return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
  }

  const honeypot = typeof body.website === "string" ? body.website.trim() : "";
  if (honeypot.length > 0) {
    return NextResponse.json({ message: "Submitted successfully." }, { status: 200 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const role = typeof body.role === "string" ? (body.role.trim() as WaitlistRole) : "";
  const company = typeof body.company === "string" ? body.company.trim() : "";

  if (!isValidEmail(email)) {
    return NextResponse.json({ message: "Please provide a valid email." }, { status: 400 });
  }

  if (!allowedRoles.has(role)) {
    return NextResponse.json({ message: "Please select a valid role." }, { status: 400 });
  }

  const dataPath = join(process.cwd(), "data", "waitlist.json");
  await mkdir(dirname(dataPath), { recursive: true });

  const entries = await loadEntries(dataPath);
  if (entries.some((entry) => entry.email === email)) {
    return NextResponse.json({ message: "You are already on the waitlist." }, { status: 200 });
  }

  const nextEntry: WaitlistEntry = {
    id: randomUUID(),
    email,
    role,
    company: company || null,
    created_at: new Date().toISOString(),
    ip,
  };

  entries.push(nextEntry);
  await writeFile(dataPath, `${JSON.stringify(entries, null, 2)}\n`, "utf8");

  return NextResponse.json({ message: "Thanks! You are on the waitlist." }, { status: 200 });
}
