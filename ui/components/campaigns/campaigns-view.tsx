"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { api, type CampaignMetadata } from "@/lib/api";
import { formatRelativeDate, shortId } from "@/lib/format";
import { useAuthSession } from "@/lib/use-auth-session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; campaigns: CampaignMetadata[] };

export function CampaignsView() {
  const authSession = useAuthSession();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [copiedCampaignId, setCopiedCampaignId] = useState<string | null>(null);

  const canCreateCampaigns = authSession?.permissions.can_create_campaigns ?? false;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ status: "loading" });
      try {
        const campaigns = await api.listCampaigns({ limit: 200, offset: 0 });
        if (cancelled) {
          return;
        }
        setState({ status: "ready", campaigns });
      } catch (error) {
        if (cancelled) {
          return;
        }
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Failed to load campaigns",
        });
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, []);

  async function onCopyCampaignId(campaignId: string) {
    try {
      await navigator.clipboard.writeText(campaignId);
      setCopiedCampaignId(campaignId);
      window.setTimeout(() => {
        setCopiedCampaignId((currentValue) =>
          currentValue === campaignId ? null : currentValue
        );
      }, 1500);
    } catch {
      return;
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Campaigns</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review campaign definitions separately from campaign creation.
          </p>
        </div>
        {canCreateCampaigns ? (
          <Button asChild>
            <Link href="/campaigns/new">Create Campaign</Link>
          </Button>
        ) : null}
      </div>

      {!canCreateCampaigns && authSession ? (
        <Card className="border-border/60">
          <CardContent className="p-5 text-sm text-muted-foreground">
            Campaign creation follows your workspace membership bundle. This membership can review campaigns but cannot create or run them.
          </CardContent>
        </Card>
      ) : null}

      {state.status === "loading" ? (
        <Card>
          <CardContent className="p-5">
            <Skeleton className="h-96 w-full" />
          </CardContent>
        </Card>
      ) : state.status === "error" ? (
        <Card className="border-rose-400/20">
          <CardContent className="p-5 text-sm text-rose-100">{state.message}</CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Campaign Catalog</CardTitle>
            <CardDescription>
              {state.campaigns.length} campaign(s) in current project scope.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Mutation Pack</TableHead>
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.campaigns.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      No campaigns yet. Use the create page to add the first one.
                    </TableCell>
                  </TableRow>
                ) : (
                  state.campaigns.map((campaign) => (
                    <TableRow key={campaign.campaign_id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <span className="break-all text-foreground">{campaign.campaign_id}</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => void onCopyCampaignId(campaign.campaign_id)}
                          >
                            {copiedCampaignId === campaign.campaign_id ? "Copied" : "Copy ID"}
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-foreground">{campaign.name}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {campaign.mutation_pack_id ? shortId(campaign.mutation_pack_id, 16) : "--"}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatRelativeDate(campaign.created_at)}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
