import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const INTERNAL_API_BASE_URL =
  process.env.INTERNAL_API_BASE_URL ??
  process.env.SEPURUX_API_BASE_URL ??
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8000";

type RouteContext = { params: { path: string[] } };

function normalizeBaseUrl(base: string) {
  return base.endsWith("/") ? base.slice(0, -1) : base;
}

function getCandidateBaseUrls() {
  const candidates = [normalizeBaseUrl(INTERNAL_API_BASE_URL)];
  const fallbackCandidates = ["http://localhost:8000", "http://127.0.0.1:8000", "http://api:8000"];

  for (const fallback of fallbackCandidates) {
    const normalizedFallback = normalizeBaseUrl(fallback);
    if (!candidates.includes(normalizedFallback)) {
      candidates.push(normalizedFallback);
    }
  }

  return candidates;
}

async function proxy(request: NextRequest, { params }: RouteContext) {
  const path = params.path.join("/");
  const requestBody =
    request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();
  const baseUrls = getCandidateBaseUrls();
  let lastError: unknown = null;

  for (const baseUrl of baseUrls) {
    const targetUrl = `${baseUrl}/${path}${request.nextUrl.search}`;
    try {
      const upstream = await fetch(targetUrl, {
        method: request.method,
        headers: {
          Accept: request.headers.get("accept") ?? "application/json",
          ...(request.headers.get("content-type")
            ? { "Content-Type": request.headers.get("content-type") as string }
            : {}),
          ...(request.headers.get("x-api-key")
            ? { "X-API-Key": request.headers.get("x-api-key") as string }
            : {}),
          ...(request.headers.get("x-project-id")
            ? { "X-Project-Id": request.headers.get("x-project-id") as string }
            : {})
        },
        body: requestBody,
        cache: "no-store",
        redirect: "manual"
      });

      const location = upstream.headers.get("location");
      if (location && upstream.status >= 300 && upstream.status < 400) {
        return NextResponse.redirect(location, upstream.status);
      }

      const contentType = upstream.headers.get("content-type") ?? "application/json";
      const bodyText = await upstream.text();
      const responseHeaders: Record<string, string> = {
        "content-type": contentType
      };
      if (location) {
        responseHeaders.location = location;
      }

      return new NextResponse(bodyText, {
        status: upstream.status,
        headers: responseHeaders
      });
    } catch (error) {
      lastError = error;
    }
  }

  return NextResponse.json(
    {
      detail: "Failed to reach backend API",
      error: lastError instanceof Error ? lastError.message : "unknown",
      attempted_targets: baseUrls
    },
    { status: 502 }
  );
}

export async function GET(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxy(request, context);
}
