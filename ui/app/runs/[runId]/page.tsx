import { RunDetailView } from "@/components/runs/run-detail-view";

export const dynamic = "force-dynamic";

export default function RunDetailPage({ params }: { params: { runId: string } }) {
  return <RunDetailView runId={params.runId} />;
}
