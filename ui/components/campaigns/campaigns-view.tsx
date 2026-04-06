"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Layers3 } from "lucide-react";

import { api, type CampaignMetadata, type MutationPackMetadata } from "@/lib/api";
import { IdPill } from "@/components/ui/id-pill";
import { formatRelativeDate } from "@/lib/format";
import { useAuthSession } from "@/lib/use-auth-session";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTableHeader } from "@/components/ui/data-table-header";
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
  const [packNames, setPackNames] = useState<Record<string, string>>({});

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
        // Resolve pack names for all campaigns that have a pack
        const packIds = [...new Set(campaigns.map((c) => c.mutation_pack_id).filter(Boolean))] as string[];
        if (packIds.length > 0) {
          void api.listMutationPacks({ include_system: true }).then((packs: MutationPackMetadata[]) => {
            const map: Record<string, string> = {};
            for (const p of packs) map[p.mutation_pack_id] = p.name;
            setPackNames(map);
          }).catch(() => null);
        }
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
    <div className="mx-auto max-w-[88rem] space-y-6">
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
        <Card className="overflow-hidden rounded-[30px] border border-slate-200/90 bg-white/96 shadow-[0_24px_80px_rgba(148,163,184,0.18),inset_0_1px_0_rgba(255,255,255,0.95)] dark:border-white/8 dark:bg-[#171e2f]/96 dark:shadow-[0_24px_80px_rgba(2,6,23,0.42),inset_0_1px_0_rgba(255,255,255,0.04)]">
          <CardHeader className="border-b border-slate-200/90 pb-6 dark:border-white/8">
            <DataTableHeader
              icon={Layers3}
              accent="emerald"
              title="Campaign Catalog"
              description="Track campaign definitions, attached mutation packs, and bootstrap coverage without leaving the operator flow."
              badge={`${state.campaigns.length} campaign${state.campaigns.length === 1 ? "" : "s"}`}
            />
          </CardHeader>
          <CardContent className="space-y-5 pt-6">
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

                    const isBootstrap = campaign.name.startsWith("Bootstrap · ");
                    const displayName = isBootstrap ? campaign.name.replace("Bootstrap · ", "") : campaign.name;
                    return (
                    <TableRow key={campaign.campaign_id}>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        <IdPill id={campaign.campaign_id} />
                      </TableCell>
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <Link href={`/campaigns/${campaign.campaign_id}`} className="hover:text-info hover:underline">
                            {displayName}
                          </Link>
                          {isBootstrap && (
                            <Badge variant="neutral" className="text-xs font-normal">auto-generated</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{campaign.status}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {campaign.mutation_pack_id
                          ? (packNames[campaign.mutation_pack_id] ?? <span className="font-mono">{campaign.mutation_pack_id.slice(0, 8)}…</span>)
                          : "—"}
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
