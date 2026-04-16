import { NextResponse } from "next/server";

import { siteConfig } from "@/lib/site";

type DraftBody = {
  input?: unknown;
  kind?: unknown;
};

const MAX_INPUT_BYTES = 512_000;

export async function POST(request: Request) {
  let body: DraftBody | null = null;
  try {
    body = (await request.json()) as DraftBody;
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload." }, { status: 400 });
  }

  if (!body || typeof body.input !== "string" || typeof body.kind !== "string") {
    return NextResponse.json({ message: "Missing required fields: input, kind." }, { status: 400 });
  }

  if (Buffer.byteLength(body.input, "utf8") > MAX_INPUT_BYTES) {
    return NextResponse.json(
      { message: `Input exceeds maximum size of ${MAX_INPUT_BYTES / 1024} KB.` },
      { status: 413 },
    );
  }

  const endpoint = `${siteConfig.apiBaseUrl.replace(/\/$/, "")}/sandbox/draft`;
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: body.input, kind: body.kind }),
      cache: "no-store",
    });

    const payload = (await response.json().catch(() => null)) as {
      draft_id?: string;
      expires_at?: string;
      detail?: string;
      message?: string;
    } | null;

    if (!response.ok) {
      return NextResponse.json(
        { message: payload?.detail || payload?.message || "Failed to create draft." },
        { status: response.status },
      );
    }

    return NextResponse.json(payload, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: "Unable to reach backend service right now." },
      { status: 502 },
    );
  }
}
