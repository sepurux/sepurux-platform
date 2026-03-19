export function InternalPlaceholder({ title }: { title: string }) {
  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-6 md:px-6">
      <div className="rounded-lg border border-border/70 bg-card/70 p-6">
        <h1 className="text-xl font-semibold text-primary">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">This internal module is reserved for the next feature slice.</p>
      </div>
    </section>
  );
}
