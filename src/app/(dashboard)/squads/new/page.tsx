import { NewSquadForm } from "@/components/squad-builder/new-squad-form";

export default function NewSquadPage() {
  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Criar elenco</h1>
      <NewSquadForm />
    </div>
  );
}
