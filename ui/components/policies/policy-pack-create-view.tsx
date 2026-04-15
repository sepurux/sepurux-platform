"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { useAuthSession } from "@/lib/use-auth-session";
import {
  DEFAULT_POLICY_JSON,
  PolicyPackBuilder,
  parsePolicyText,
  type PolicyEngine,
} from "@/components/policies/policy-pack-builder";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PolicyPackCreateView() {
  const authSession = useAuthSession();
  const router = useRouter();
  const [name, setName] = useState("");
  const [engine, setEngine] = useState<PolicyEngine>("builtin");
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
      const trimmedName = name.trim();
      if (!trimmedName) {
        setCreateError("Policy pack name is required");
        return;
      }
      const parsed = parsePolicyText(policyText);
      if (parsed.error || parsed.policy === null) {
        setCreateError(parsed.error ?? "Policy JSON must be valid JSON");
        return;
      }
      await api.createPolicyPack({
        name: trimmedName,
        engine,
        policy: parsed.policy,
      });
      router.push("/policies");
      router.refresh();
    } catch (error) {
      setCreateError(
        error instanceof Error ? error.message : "Failed to create policy pack"
      );
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            New guardrail
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Keep guardrail authoring on its own screen so review and version history stay separate from creation.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/policies">All guardrails</Link>
        </Button>
      </div>

      {!canManagePolicyPacks && authSession ? (
        <Card className="border-border/60">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Guardrails follow workspace membership and plan access. Your current membership can review guardrails but cannot create or change them.
          </CardContent>
        </Card>
      ) : null}

      {canManagePolicyPacks ? (
        <Card>
          <CardHeader>
            <CardTitle>Guardrail</CardTitle>
            <CardDescription>
              Start with the guided builder, then use raw JSON only for unsupported keys.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={onCreatePolicyPack}>
              <PolicyPackBuilder
                name={name}
                onNameChange={setName}
                engine={engine}
                onEngineChange={setEngine}
                policyText={policyText}
                onPolicyTextChange={setPolicyText}
                disabled={creating}
              />
              {createError ? (
                <p className="text-sm text-danger">{createError}</p>
              ) : null}
              <div className="flex justify-end gap-2">
                <Button asChild type="button" variant="outline">
                  <Link href="/policies">Cancel</Link>
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? "Creating..." : "Create guardrail"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
