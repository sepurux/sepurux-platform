export function InternalPlaceholder({ title }: { title: string }) {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
      <div className="rounded-lg border border-neutral-800 bg-neutral-950 p-6">
        <h1 className="text-xl font-semibold text-white">{title}</h1>
        <p className="mt-2 text-sm text-neutral-400">This internal module is reserved for the next feature slice.</p>
      </div>
    </section>
  );
}
