import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { NextResponse } from "next/server";

type DemoRole = "Platform Eng" | "Security" | "Product" | "Founder" | "Other";

type DemoRequestEntry = {
  id: string;
  email: string;
  role: DemoRole;
  company: string;
  use_case: string;
  created_at: string;
  ip: string;
};

type DemoRequestBody = {
  email?: unknown;
  role?: unknown;
  company?: unknown;
  use_case?: unknown;
  website?: unknown;
};

const allowedRoles = new Set<DemoRole>(["Platform Eng", "Security", "Product", "Founder", "Other"]);
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

function isDemoRole(value: string): value is DemoRole {
  return allowedRoles.has(value as DemoRole);
}

async function loadEntries(filePath: string): Promise<DemoRequestEntry[]> {
  try {
    const raw = await readFile(filePath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DemoRequestEntry[]) : [];
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  const ip = getClientIp(request);

  if (isRateLimited(ip)) {
    return NextResponse.json({ message: "Too many requests. Please try again later." }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) as DemoRequestBody | null;
  if (!body) {
    return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
  }

  const honeypot = typeof body.website === "string" ? body.website.trim() : "";
  if (honeypot.length > 0) {
    return NextResponse.json({ message: "Submitted successfully." }, { status: 200 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const roleValue = typeof body.role === "string" ? body.role.trim() : "";
  const company = typeof body.company === "string" ? body.company.trim() : "";
  const useCase = typeof body.use_case === "string" ? body.use_case.trim() : "";

  if (!isValidEmail(email)) {
    return NextResponse.json({ message: "Please provide a valid email." }, { status: 400 });
  }

  if (!isDemoRole(roleValue)) {
    return NextResponse.json({ message: "Please select a valid role." }, { status: 400 });
  }

  if (!company) {
    return NextResponse.json({ message: "Please provide your company name." }, { status: 400 });
  }

  if (useCase.length < 12) {
    return NextResponse.json(
      { message: "Please share a little more about what you want to cover in the demo." },
      { status: 400 }
    );
  }

  const dataPath = join(process.cwd(), "data", "demo-requests.json");
  await mkdir(dirname(dataPath), { recursive: true });

  const entries = await loadEntries(dataPath);
  if (entries.some((entry) => entry.email === email)) {
    return NextResponse.json(
      { message: "We already have your demo request and will reach out soon." },
      { status: 200 }
    );
  }

  const nextEntry: DemoRequestEntry = {
    id: randomUUID(),
    email,
    role: roleValue,
    company,
    use_case: useCase,
    created_at: new Date().toISOString(),
    ip,
  };

  entries.push(nextEntry);
  await writeFile(dataPath, `${JSON.stringify(entries, null, 2)}\n`, "utf8");

  return NextResponse.json(
    { message: "Thanks. We will reach out to schedule your demo." },
    { status: 200 }
  );
}
