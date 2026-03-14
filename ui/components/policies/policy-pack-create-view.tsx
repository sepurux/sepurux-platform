"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { useAuthSession } from "@/lib/use-auth-session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DEFAULT_POLICY_JSON = JSON.stringify(
  {
    version: "0.1",
    defaults: { unknown_tools: "allow" },
    irreversible: {
      tools: ["payments.refund", "jira.create_issue(commit)"],
    },
    approval: { token_field: "confirmation_token" },
  },
  null,
  2
);

export function PolicyPackCreateView() {
  const authSession = useAuthSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [engine, setEngine] = useState<"builtin" | "opa">("builtin");
  const [policyText, setPolicyText] = useState(DEFAULT_POLICY_JSON);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const canManagePolicyPacks =
    authSession?.permissions.can_manage_policy_packs ?? false;

  async function onCreatePolicyPack(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreateError(null);
    setCreating(true);

    try {
      const parsedPolicy = JSON.parse(policyText) as Record<string, unknown>;
      await api.createPolicyPack({
        name,
        engine,
        policy: parsedPolicy,
      });
      router.push("/policies");
      router.refresh();
    } catch (error) {
      if (error instanceof SyntaxError) {
        setCreateError("Policy JSON must be valid JSON");
      } else {
        setCreateError(
          error instanceof Error ? error.message : "Failed to create policy pack"
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
            Create Policy Pack
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep policy authoring on its own screen so review and version history stay separate from creation.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/policies">View Policies</Link>
        </Button>
      </div>

      {!canManagePolicyPacks && authSession ? (
        <Card className="border-border/60">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Policy packs follow workspace membership and plan access. Your current membership can review policy packs but cannot create or change them.
          </CardContent>
        </Card>
      ) : null}

      {canManagePolicyPacks ? (
        <Card>
          <CardHeader>
            <CardTitle>Policy Pack</CardTitle>
            <CardDescription>
              Policy changes are restricted to admin memberships on plans with policy support.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onCreatePolicyPack}>
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Name</span>
                <input
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Strict approvals"
                  required
                  disabled={creating}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Engine</span>
                <select
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                  value={engine}
                  onChange={(event) =>
                    setEngine(event.target.value === "opa" ? "opa" : "builtin")
                  }
                  disabled={creating}
                >
                  <option value="builtin">builtin</option>
                  <option value="opa">opa</option>
                </select>
              </label>
              <label className="block space-y-1 text-sm">
                <span className="text-muted-foreground">Policy JSON</span>
                <textarea
                  className="min-h-[260px] w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground"
                  value={policyText}
                  onChange={(event) => setPolicyText(event.target.value)}
                  spellCheck={false}
                  required
                  disabled={creating}
                />
              </label>
              {createError ? (
                <p className="text-sm text-rose-200">{createError}</p>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button asChild type="button" variant="outline">
                  <Link href="/policies">Cancel</Link>
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? "Creating..." : "Create Policy Pack"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
