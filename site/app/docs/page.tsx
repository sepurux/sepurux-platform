import Link from "next/link";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const quickstart = `# 1) create trace
curl -X POST http://localhost:8000/v1/traces \\
  -H 'Content-Type: application/json' \\
  -H 'X-API-Key: <api_key>' \\
  -H 'X-Project-Id: <project_id>' \\
  -d '{"event":"demo"}'

# 2) create campaign
curl -X POST http://localhost:8000/v1/campaigns ...

# 3) queue run
curl -X POST http://localhost:8000/v1/runs ...

# 4) inspect stats
curl http://localhost:8000/v1/runs/<run_id>/stats`;

export default function DocsPage() {
  return (
    <div className="site-container py-16 md:py-24">
      <header className="max-w-3xl">
        <p className="text-xs uppercase tracking-[0.16em] text-primary">Docs</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
          Developer docs and quickstart.
        </h1>
        <p className="mt-5 text-lg text-muted-foreground">
          Crash Lab API docs are available from the backend service. Start with OpenAPI, then run your first campaign.
        </p>
      </header>

      <section className="mt-12 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Interactive API docs</CardTitle>
            <CardDescription>Explore endpoints and schemas in Swagger UI.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer">
                Open /docs
              </a>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>OpenAPI schema</CardTitle>
            <CardDescription>Use the OpenAPI document for SDKs or CI validation.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <a href="http://localhost:8000/openapi.json" target="_blank" rel="noreferrer">
                Open /openapi.json
              </a>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="mt-10 rounded-xl border border-border/80 bg-card/70 p-6 md:p-8">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <h2 className="text-2xl font-semibold text-foreground">Quickstart</h2>
          <Button asChild variant="ghost">
            <Link href="/product">See architecture</Link>
          </Button>
        </div>
        <pre className="mt-5 overflow-x-auto rounded-md border border-border/70 bg-background/75 p-4 text-xs text-primary">
          <code>{quickstart}</code>
        </pre>
      </section>
    </div>
  );
}
