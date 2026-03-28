import { CampaignDetailView } from "@/components/campaigns/campaign-detail-view";

export const dynamic = "force-dynamic";

export default function CampaignDetailPage({ params }: { params: { campaignId: string } }) {
  return <CampaignDetailView campaignId={params.campaignId} />;
}
