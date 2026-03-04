import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const INTERNAL_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://api:8000";

type RouteContext = { params: { path: string[] } };

async function proxy(request: NextRequest, { params }: RouteContext) {
  const base = INTERNAL_API_BASE_URL.endsWith("/")
    ? INTERNAL_API_BASE_URL.slice(0, -1)
    : INTERNAL_API_BASE_URL;
  const path = params.path.join("/");
  const targetUrl = `${base}/${path}${request.nextUrl.search}`;
  const requestBody =
    request.method === "GET" || request.method === "HEAD" ? undefined : await request.text();

  try {
    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers: {
        Accept: request.headers.get("accept") ?? "application/json",
        ...(request.headers.get("content-type")
          ? { "Content-Type": request.headers.get("content-type") as string }
          : {}),
        ...(request.headers.get("x-api-key") ? { "X-API-Key": request.headers.get("x-api-key") as string } : {}),
        ...(request.headers.get("x-project-id")
          ? { "X-Project-Id": request.headers.get("x-project-id") as string }
          : {})
      },
      body: requestBody,
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
