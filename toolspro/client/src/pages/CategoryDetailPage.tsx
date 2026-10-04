import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { Container } from "../components/common/Container";
import { EmptyState } from "../components/common/EmptyState";
import { InlineError } from "../components/common/InlineError";
import { ToolGrid, ToolGridSkeleton } from "../components/tools/ToolGrid";
import { usePageMeta } from "../hooks/usePageMeta";
import { useCategories, useTools } from "../hooks/useRegistry";
import { searchTools, sortByName } from "../lib/search";
import { getErrorMessage } from "../services/api";
import NotFoundPage from "./NotFoundPage";

const buttonClass =
  "rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-heading transition-colors hover:bg-surface-muted";

export default function CategoryDetailPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [query, setQuery] = useState("");

  const categoriesQuery = useCategories();
  const toolsQuery = useTools();

  const category = categoriesQuery.data?.find((c) => c.slug === slug);
  const categoryName = category?.name ?? "";

  const categoryTools = useMemo(
    () => (toolsQuery.data ?? []).filter((t) => t.category === slug),
    [toolsQuery.data, slug]
  );

  const visibleTools = useMemo(() => {
    const matched = searchTools(categoryTools, query, { [slug]: categoryName });
    return query.trim() ? matched : sortByName(matched, "asc");
  }, [categoryTools, query, slug, categoryName]);

  usePageMeta(
    category ? category.name : "Category",
    category ? category.description : "Browse tools by category on ToolsPro."
  );

  if (categoriesQuery.isError) {
    return (
      <Container className="py-10">
        <InlineError
          message={getErrorMessage(categoriesQuery.error)}
          onRetry={() => void categoriesQuery.refetch()}
        />
      </Container>
    );
  }
  if (!categoriesQuery.data) {
    return (
      <Container className="py-10">
        <ToolGridSkeleton count={4} />
      </Container>
    );
  }
  if (!category) return <NotFoundPage />;

  const searchActive = query.trim() !== "";

  return (
    <Container className="py-10">
      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          { label: "Categories", to: "/categories" },
          { label: category.name },
        ]}
      />
      <h1 className="text-3xl font-bold text-heading">{category.name}</h1>
      <p className="mt-2 max-w-2xl">{category.description}</p>

      {categoryTools.length > 0 ? (
        <form role="search" onSubmit={(e) => e.preventDefault()} className="mt-6 max-w-xl">
          <label htmlFor="category-search" className="mb-1 block text-sm font-medium text-heading">
            Search in {category.name}
          </label>
          <input
            id="category-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a tool name or keyword..."
            className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-base text-heading placeholder:text-body"
          />
        </form>
      ) : null}

      <p role="status" aria-live="polite" className="sr-only">
        {searchActive ? `${visibleTools.length} ${visibleTools.length === 1 ? "tool" : "tools"} found` : ""}
      </p>

      <div className="mt-8">
        {toolsQuery.isError ? (
          <InlineError message={getErrorMessage(toolsQuery.error)} onRetry={() => void toolsQuery.refetch()} />
        ) : null}
        {!toolsQuery.isError && !toolsQuery.data ? <ToolGridSkeleton count={4} /> : null}
        {toolsQuery.data && categoryTools.length === 0 ? (
          <EmptyState
            title="No tools in this category yet"
            description="Tools are still being added here. Please check back soon."
            action={
              <Link to="/categories" className={buttonClass}>
                Browse other categories
              </Link>
            }
          />
        ) : null}
        {categoryTools.length > 0 && visibleTools.length === 0 ? (
          <EmptyState
            title="No tools found"
            description="Try a different search term."
            action={
              <button type="button" onClick={() => setQuery("")} className={buttonClass}>
                Clear search
              </button>
            }
          />
        ) : null}
        {visibleTools.length > 0 ? <ToolGrid tools={visibleTools} /> : null}
      </div>
    </Container>
  );
}