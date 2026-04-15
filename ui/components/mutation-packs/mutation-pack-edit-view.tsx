"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { api, type MutationPackMetadata } from "@/lib/api";
import { useAuthSession } from "@/lib/use-auth-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  mutationPackId: string;
}

export function MutationPackEditView({ mutationPackId }: Props) {
  const authSession = useAuthSession();
  const router = useRouter();

  const [pack, setPack] = useState<MutationPackMetadata | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [configText, setConfigText] = useState("{}");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);

  const canManageMutationPacks = authSession?.permissions.can_manage_mutation_packs ?? false;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const record = await api.getMutationPack(mutationPackId);
        if (cancelled) return;
        if (record.is_system) {
          setLoadError("System checks cannot be edited.");
          setLoading(false);
          return;
        }
        setPack(record);
        setName(record.name);
        setDescription(record.description ?? "");
        setConfigText(JSON.stringify(record.config, null, 2));
      } catch (error) {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : "Failed to load mutation pack");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [mutationPackId]);

  async function onSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaveError(null);
    setSaveWarning(null);
    setValidationIssues([]);
    setSaving(true);

    try {
      let parsedConfig: Record<string, unknown>;
      try {
        const parsed = JSON.parse(configText) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          throw new Error("Config must be a JSON object");
        }
        parsedConfig = parsed as Record<string, unknown>;
      } catch {
        throw new Error("Mutation pack config must be valid JSON");
      }

      const response = await api.updateMutationPack(mutationPackId, {
        name: name.trim() || undefined,
        description: description.trim() || null,
        config: parsedConfig,
      });

      if (response.warning) setSaveWarning(response.warning);
      if (response.validation_issues?.length) setValidationIssues(response.validation_issues);

      router.push("/mutation-packs");
      router.refresh();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to update mutation pack");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <Card>
          <CardContent className="p-6">
            <div className="h-64 animate-pulse rounded bg-muted" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Edit check</h1>
          <Button asChild variant="outline">
            <Link href="/mutation-packs">Back</Link>
          </Button>
        </div>
        <Card className="border-rose-400/20">
          <CardContent className="p-5 text-sm text-rose-100">{loadError}</CardContent>
        </Card>
      </div>
    );
  }

  if (!canManageMutationPacks && authSession) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Edit check</h1>
        <Card className="border-border/60">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Your current membership cannot modify checks.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Edit check</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Update name, description, or configuration for this custom pack.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/mutation-packs">All checks</Link>
        </Button>
      </div>

      {pack ? (
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          <Badge variant="default">Custom</Badge>
          <span className="font-mono">{pack.mutation_pack_id}</span>
          <span>Coverage: {pack.coverage_score}%</span>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Pack Configuration</CardTitle>
          <CardDescription>
            Edit name, description, and the mutation config JSON. Coverage score updates automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={onSave}>
            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Name</span>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                disabled={saving}
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Description</span>
              <input
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                disabled={saving}
              />
            </label>

            <label className="block space-y-1 text-sm">
              <span className="text-muted-foreground">Config JSON</span>
              <textarea
                className="min-h-[340px] w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground"
                value={configText}
                onChange={(event) => setConfigText(event.target.value)}
                spellCheck={false}
                required
                disabled={saving}
              />
            </label>

            {validationIssues.length > 0 ? (
              <ul className="space-y-1 rounded-md border border-amber-900/40 bg-amber-950/20 px-4 py-3">
                {validationIssues.map((issue) => (
                  <li key={issue} className="text-sm text-amber-200">
                    {issue}
                  </li>
                ))}
              </ul>
            ) : null}

            {saveWarning ? <p className="text-sm text-amber-200">{saveWarning}</p> : null}
            {saveError ? <p className="text-sm text-rose-200">{saveError}</p> : null}

            <div className="flex justify-end gap-2">
              <Button asChild type="button" variant="outline">
                <Link href="/mutation-packs">Cancel</Link>
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
