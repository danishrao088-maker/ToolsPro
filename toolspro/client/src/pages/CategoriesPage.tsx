import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { Container } from "../components/common/Container";
import { CategoryGrid } from "../components/tools/CategoryGrid";
import { usePageMeta } from "../hooks/usePageMeta";

export default function CategoriesPage() {
  usePageMeta("Categories", "Browse ToolsPro tools by category.");

  return (
    <Container className="py-10">
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Categories" }]} />
      <h1 className="text-3xl font-bold text-heading">Categories</h1>
      <p className="mb-8 mt-2 max-w-2xl">Find the right tool by what you want to do.</p>
      <CategoryGrid />
    </Container>
  );
}