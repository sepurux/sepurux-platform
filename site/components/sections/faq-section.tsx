import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "What does Sepurux test?",
    a: "Sepurux stress-tests tool-using AI agents by replaying traces and injecting controlled mutations.",
  },
  {
    q: "Can we gate pull requests?",
    a: "Yes. Use the CI gate endpoints and GitHub Action integration to fail PRs on reliability regressions.",
  },
  {
    q: "Do you require production credentials?",
    a: "No. The default model replays from captured traces and synthetic mutation scenarios.",
  },
  {
    q: "How are failures explained?",
    a: "Run Inspector highlights first failing step, failing tool, failure reason, and policy events.",
  },
  {
    q: "Can we define custom mutation packs?",
    a: "Yes. Mutation packs are project-scoped JSON configs with weighted mutation strategies.",
  },
  {
    q: "How is tenant isolation handled?",
    a: "API key auth + project scoping enforce tenant boundaries across traces, runs, and analytics.",
  },
  {
    q: "Do you support approval gates for sensitive actions?",
    a: "Yes. Policy packs can require approval tokens for irreversible operations.",
  },
];

export function FaqSection() {
  return (
    <section className="site-container mt-24">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.16em] text-primary">FAQ</p>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
          Common questions from platform teams.
        </h2>
      </div>

      <Accordion type="single" collapsible className="space-y-3">
        {faqs.map((item, index) => (
          <AccordionItem key={item.q} value={`item-${index}`}>
            <AccordionTrigger>{item.q}</AccordionTrigger>
            <AccordionContent>{item.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
