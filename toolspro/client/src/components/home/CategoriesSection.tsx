import { Container } from "../common/Container";
import { SectionHeader } from "../common/SectionHeader";
import { CategoryGrid } from "../tools/CategoryGrid";

export function CategoriesSection() {
  return (
    <section className="border-t border-line bg-surface-muted py-12">
      <Container>
        <SectionHeader title="Browse Categories" description="Find the right tool by what you want to do." />
        <CategoryGrid />
      </Container>
    </section>
  );
}