import { InternalPlaceholder } from "@/components/internal/internal-placeholder";

function titleForSection(section: string) {
  switch (section) {
    case "users":
      return "Users";
    case "projects":
      return "Projects";
    case "campaigns":
      return "Campaigns";
    case "failures":
      return "Failures";
    case "billing":
      return "Billing";
    case "queues":
      return "Queues";
    case "analytics":
      return "Analytics";
    case "audit-logs":
      return "Audit Logs";
    case "alerts":
      return "Alerts";
    case "system":
      return "System";
    case "settings":
      return "Settings";
    default:
      return "Internal";
  }
}

export default function InternalSectionPage({
  params,
}: {
  params: { section: string };
}) {
  const { section } = params;
  return <InternalPlaceholder title={titleForSection(section)} />;
}
