import { Suspense, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { CardSkeleton } from "../components/common/CardSkeleton";
import { Container } from "../components/common/Container";
import { EmptyState } from "../components/common/EmptyState";
import { InlineError } from "../components/common/InlineError";
import { LoadingIndicator } from "../components/common/LoadingIndicator";
import { HowToUse } from "../components/tools/HowToUse";
import { RelatedTools } from "../components/tools/RelatedTools";
import { ToolPageHeader } from "../components/tools/ToolPageHeader";
import { usePageMeta } from "../hooks/usePageMeta";
import { useCategories, useTools } from "../hooks/useRegistry";
import { getErrorMessage } from "../services/api";
import NotFoundPage from "./NotFoundPage";
import { toolImplementations } from "./tools/registry";

export default function ToolDetailPage() {
  const { slug = "" } = useParams<{ slug: string }>();

  const toolsQuery = useTools();
  const categoriesQuery = useCategories();

  const tool = toolsQuery.data?.find((t) => t.slug === slug);
  const category = categoriesQuery.data?.find((c) => c.slug === tool?.category);

  const related = useMemo(
    () =>
      (toolsQuery.data ?? [])
        .filter((t) => t.category === tool?.category && t.slug !== slug)
        .slice(0, 4),
    [toolsQuery.data, tool?.category, slug]
  );

  usePageMeta(tool ? tool.name : "Tool", tool ? tool.description : "Free online tool from ToolsPro.");

  if (toolsQuery.isError) {
    return (
      <Container className="py-10">
        <InlineError message={getErrorMessage(toolsQuery.error)} onRetry={() => void toolsQuery.refetch()} />
      </Container>
    );
  }
  if (!toolsQuery.data) {
    return (
      <Container className="py-10">
        <div className="max-w-md">
          <CardSkeleton />
        </div>
      </Container>
    );
  }
  if (!tool) return <NotFoundPage />;

  const implementation = toolImplementations[slug];
  const Workspace = implementation?.Workspace;

  return (
    <Container className="py-10">
      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          category
            ? { label: category.name, to: `/category/${category.slug}` }
            : { label: "All Tools", to: "/tools" },
          { label: tool.name },
        ]}
      />
      <ToolPageHeader tool={tool} categoryName={category?.name} />

      {implementation && Workspace ? (
        <>
          <section
            aria-label={`${tool.name} workspace`}
            className="mt-8 rounded-xl border border-line bg-surface p-5 shadow-sm sm:p-6"
          >
            <Suspense fallback={<LoadingIndicator label="Loading tool..." />}>
              <Workspace key={slug} />
            </Suspense>
          </section>
          <HowToUse steps={implementation.howTo} limitations={implementation.limitations} />
        </>
      ) : (
        <div className="mt-8">
          <EmptyState
            title="This tool is not available yet"
            description="We are still building this tool. Please check back soon."
            action={
              <Link
                to="/tools"
                className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-heading transition-colors hover:bg-surface-muted"
              >
                Browse all tools
              </Link>
            }
          />
        </div>
      )}

      <RelatedTools tools={related} />
    </Container>
  );
}