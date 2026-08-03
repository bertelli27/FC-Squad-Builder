import { NewCareerForm } from "@/components/careers/new-career-form";

export default function NewCareerPage() {
  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6">
      <h1 className="font-heading text-2xl font-semibold tracking-tight">Nova carreira</h1>
      <NewCareerForm />
    </div>
  );
}
