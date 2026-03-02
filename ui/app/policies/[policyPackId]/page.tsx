import { PolicyPackDetailView } from "@/components/policies/policy-pack-detail-view";

export const dynamic = "force-dynamic";

export default function PolicyPackDetailPage({
  params,
}: {
  params: { policyPackId: string };
}) {
  return <PolicyPackDetailView policyPackId={params.policyPackId} />;
}
