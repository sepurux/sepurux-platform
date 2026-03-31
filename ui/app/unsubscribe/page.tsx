import { UnsubscribeView } from "@/components/email/unsubscribe-view";

export default function UnsubscribePage({
  searchParams,
}: {
  searchParams?: { token?: string | string[] };
}) {
  const token = typeof searchParams?.token === "string" ? searchParams.token : "";
  return <UnsubscribeView token={token} />;
}
