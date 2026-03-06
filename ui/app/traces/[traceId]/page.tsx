import { TraceDetailView } from "@/components/traces/trace-detail-view";

export const dynamic = "force-dynamic";

type TraceDetailPageProps = {
  params: { traceId: string };
};

export default function TraceDetailPage({ params }: TraceDetailPageProps) {
  return <TraceDetailView traceId={params.traceId} />;
}
