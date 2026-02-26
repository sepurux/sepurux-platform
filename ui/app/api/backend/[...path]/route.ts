import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const INTERNAL_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://api:8000";

export async function GET(request: NextRequest, { params }: { params: { path: string[] } }) {
  const base = INTERNAL_API_BASE_URL.endsWith("/")
    ? INTERNAL_API_BASE_URL.slice(0, -1)
    : INTERNAL_API_BASE_URL;
  const path = params.path.join("/");
  const targetUrl = `${base}/${path}${request.nextUrl.search}`;

  try {
    const upstream = await fetch(targetUrl, {
      method: "GET",
      headers: {
        Accept: request.headers.get("accept") ?? "application/json",
        ...(request.headers.get("x-api-key") ? { "X-API-Key": request.headers.get("x-api-key") as string } : {}),
        ...(request.headers.get("x-project-id")
          ? { "X-Project-Id": request.headers.get("x-project-id") as string }
          : {})
      },
      cache: "no-store"
    });

    const contentType = upstream.headers.get("content-type") ?? "application/json";
    const bodyText = await upstream.text();

    return new NextResponse(bodyText, {
      status: upstream.status,
      headers: {
        "content-type": contentType
      }
    });
  } catch (error) {
    return NextResponse.json(
      {
        detail: "Failed to reach backend API",
        error: error instanceof Error ? error.message : "unknown"
      },
      { status: 502 }
    );
  }
}
