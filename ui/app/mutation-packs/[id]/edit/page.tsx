import { MutationPackEditView } from "@/components/mutation-packs/mutation-pack-edit-view";

export const dynamic = "force-dynamic";

interface Props {
  params: { id: string };
}

export default function MutationPackEditPage({ params }: Props) {
  return <MutationPackEditView mutationPackId={params.id} />;
}
