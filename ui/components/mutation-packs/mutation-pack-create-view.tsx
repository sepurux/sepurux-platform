"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { useAuthSession } from "@/lib/use-auth-session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DEFAULT_MUTATION_PACK_CONFIG = JSON.stringify(
  {
    version: "0.1",
    suggested_attempts: 25,
    max_mutations_per_attempt: 1,
    mutations: [
      {
        mutation_id: "timeout-jira",
        type: "fault.timeout",
        target: { tool: "jira.*" },
        params: { prob: 0.3, timeout_ms: 3000 },
        probability: 1,
        weight: 1,
      },
    ],
  },
  null,
  2
);

export function MutationPackCreateView() {
  const authSession = useAuthSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [configText, setConfigText] = useState(DEFAULT_MUTATION_PACK_CONFIG);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createWarning, setCreateWarning] = useState<string | null>(null);

  const canManageMutationPacks =
    authSession?.permissions.can_manage_mutation_packs ?? false;

  async function onCreateMutationPack(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);
    setCreateWarning(null);
    setCreating(true);

    try {
      const parsedConfig = JSON.parse(configText) as Record<string, unknown>;
      const response = await api.createMutationPack({
        name,
        description: description.trim() || null,
        config: parsedConfig,
      });
      if (response.warning) {
        setCreateWarning(response.warning);
      }
      router.push("/mutation-packs");
      router.refresh();
    } catch (error) {
      if (error instanceof SyntaxError) {
        setCreateError("Mutation pack config must be valid JSON");
      } else {
        setCreateError(
          error instanceof Error ? error.message : "Failed to create mutation pack"
        );
      }
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Create Mutation Pack
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Define a project-scoped mutation pack without mixing the form into the shared catalog.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/mutation-packs">View Packs</Link>
        </Button>
      </div>

      {!canManageMutationPacks && authSession ? (
        <Card className="border-border/60">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Custom mutation packs follow workspace membership rules. Your current membership can view packs but cannot create or modify them.
          </CardContent>
        </Card>
      ) : null}

      {canManageMutationPacks ? (
        <Card>
          <CardHeader>
            <CardTitle>Custom Mutation Pack</CardTitle>
            <CardDescription>
              Custom packs are allowed for developer and admin memberships in this workspace plan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onCreateMutationPack}>
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Name</span>
                <input
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="payments.resilience"
                  required
                  disabled={creating}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Description</span>
                <input
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Timeouts and schema drift for payments flows"
                  disabled={creating}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Config JSON</span>
                <textarea
                  className="min-h-[280px] w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground"
                  value={configText}
                  onChange={(event) => setConfigText(event.target.value)}
                  spellCheck={false}
                  required
                  disabled={creating}
                />
              </label>
              {createError ? (
                <p className="text-sm text-rose-200">{createError}</p>
              ) : null}
              {createWarning ? (
                <p className="text-sm text-amber-200">{createWarning}</p>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button asChild type="button" variant="outline">
                  <Link href="/mutation-packs">Cancel</Link>
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? "Creating..." : "Create Mutation Pack"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
