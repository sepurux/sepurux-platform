import { AttemptDetailView } from "@/components/attempts/attempt-detail-view";

export const dynamic = "force-dynamic";

export default function AttemptDetailPage({ params }: { params: { attemptId: string } }) {
  return <AttemptDetailView attemptId={params.attemptId} />;
}
