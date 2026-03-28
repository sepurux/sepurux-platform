"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { api, type CampaignMetadata } from "@/lib/api";
import { IdPill } from "@/components/ui/id-pill";
import { formatRelativeDate, shortId } from "@/lib/format";
import { useAuthSession } from "@/lib/use-auth-session";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; campaigns: CampaignMetadata[] };

const PAGE_SIZE = 25;

export function CampaignsView() {
  const authSession = useAuthSession();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [copiedCampaignId, setCopiedCampaignId] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [archivingCampaignId, setArchivingCampaignId] = useState<string | null>(null);
  const [confirmArchiveId, setConfirmArchiveId] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);

  const canCreateCampaigns = authSession?.permissions.can_create_campaigns ?? false;

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ status: "loading" });
      try {
        const campaigns = await api.listCampaigns({
          limit: PAGE_SIZE,
          offset: page * PAGE_SIZE,
        });
        if (cancelled) {
          return;
        }
        setState({ status: "ready", campaigns });
        setHasNext(campaigns.length === PAGE_SIZE);
      } catch (error) {
        if (cancelled) {
          return;
        }
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "Failed to load campaigns",
        });
        setHasNext(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [page]);

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

  async function onArchiveCampaign(campaignId: string) {
    setArchiveError(null);
    setConfirmArchiveId(null);
    setArchivingCampaignId(campaignId);
    try {
      await api.deleteCampaign(campaignId);
      setState((currentState) => {
        if (currentState.status !== "ready") {
          return currentState;
        }
        return {
          status: "ready",
          campaigns: currentState.campaigns.filter(
            (campaign) => campaign.campaign_id !== campaignId
          ),
        };
      });
    } catch (error) {
      setArchiveError(error instanceof Error ? error.message : "Failed to archive campaign");
    } finally {
      setArchivingCampaignId(null);
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

      {archiveError ? (
        <Card className="border-rose-400/20">
          <CardContent className="p-5 text-sm text-rose-100">{archiveError}</CardContent>
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
              {state.campaigns.length} campaign(s) in current project scope for this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Mutation Pack</TableHead>
                  {canCreateCampaigns ? <TableHead className="text-right">Actions</TableHead> : null}
                  <TableHead className="text-right">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.campaigns.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={canCreateCampaigns ? 6 : 5}
                      className="py-10 text-center text-muted-foreground"
                    >
                      No campaigns yet. Use the create page to add the first one.
                    </TableCell>
                  </TableRow>
                ) : (
                  state.campaigns.map((campaign) => {
                    const isConfirming = confirmArchiveId === campaign.campaign_id;
                    const isArchiving = archivingCampaignId === campaign.campaign_id;

                    if (isConfirming) {
                      return (
                        <TableRow key={campaign.campaign_id} className="bg-amber-950/20">
                          <TableCell colSpan={canCreateCampaigns ? 6 : 5} className="py-3">
                            <div className="flex items-center gap-3">
                              <span className="text-sm text-amber-200">
                                Archive &ldquo;{campaign.name}&rdquo;? It will be hidden from default views.
                              </span>
                              <Button
                                size="sm"
                                variant="danger"
                                disabled={isArchiving}
                                onClick={() => void onArchiveCampaign(campaign.campaign_id)}
                              >
                                {isArchiving ? "Archiving..." : "Archive"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setConfirmArchiveId(null)}
                              >
                                Cancel
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    }

                    return (
                    <TableRow key={campaign.campaign_id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        <IdPill id={campaign.campaign_id} />
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        <Link href={`/campaigns/${campaign.campaign_id}`} className="hover:text-info hover:underline">
                          {campaign.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{campaign.status}</TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {campaign.mutation_pack_id ? shortId(campaign.mutation_pack_id, 16) : "--"}
                      </TableCell>
                      {canCreateCampaigns ? (
                        <TableCell className="text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setConfirmArchiveId(campaign.campaign_id)}
                            disabled={isArchiving}
                          >
                            Archive
                          </Button>
                        </TableCell>
                      ) : null}
                      <TableCell className="text-right text-muted-foreground">
                        {formatRelativeDate(campaign.created_at)}
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            <PaginationControls
              page={page}
              pageSize={PAGE_SIZE}
              currentCount={state.campaigns.length}
              hasNext={hasNext}
              onPrev={() => setPage((currentValue) => Math.max(0, currentValue - 1))}
              onNext={() => setPage((currentValue) => currentValue + 1)}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
