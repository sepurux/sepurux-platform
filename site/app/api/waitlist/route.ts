import { NextResponse } from "next/server";

import { siteConfig } from "@/lib/site";

type WaitlistBody = {
  email?: unknown;
  role?: unknown;
  company?: unknown;
  website?: unknown;
};

function isValidPayload(body: WaitlistBody | null): body is WaitlistBody {
  return Boolean(body && typeof body === "object");
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as WaitlistBody | null;
  if (!isValidPayload(body)) {
    return NextResponse.json({ message: "Invalid payload." }, { status: 400 });
  }

  const endpoint = `${siteConfig.apiBaseUrl.replace(/\/$/, "")}/waitlist`;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const payload = (await response.json().catch(() => null)) as
      | { message?: string; detail?: string }
      | null;

    if (!response.ok) {
      return NextResponse.json(
        {
          message:
            payload?.message ||
            payload?.detail ||
            "Unable to submit waitlist request.",
        },
        { status: response.status },
      );
    }

    return NextResponse.json(
      { message: payload?.message || "Thanks! You are on the waitlist." },
      { status: response.status },
    );
  } catch {
    return NextResponse.json(
      { message: "Unable to reach waitlist service right now." },
      { status: 502 },
    );
  }
}
