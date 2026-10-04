import { Gift, ShieldCheck, UserX, Zap } from "lucide-react";
import { Container } from "../common/Container";

const items = [
  { title: "Free to Use", description: "No hidden tool charges for approved tools.", icon: Gift },
  { title: "No Registration", description: "Start without an account.", icon: UserX },
  { title: "Simple and Fast", description: "Clear, efficient workflows.", icon: Zap },
  { title: "Privacy Focused", description: "Process locally whenever possible.", icon: ShieldCheck },
];

export function TrustStrip() {
  return (
    <section aria-label="Why ToolsPro" className="border-b border-line bg-surface">
      <Container className="grid gap-6 py-8 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(({ title, description, icon: ItemIcon }) => (
          <div key={title} className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-link">
              <ItemIcon aria-hidden="true" size={20} />
            </span>
            <div>
              <h2 className="font-semibold text-heading">{title}</h2>
              <p className="text-sm">{description}</p>
            </div>
          </div>
        ))}
      </Container>
    </section>
  );
}