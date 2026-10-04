import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { Container } from "../components/common/Container";
import { EmptyState } from "../components/common/EmptyState";
import { InlineError } from "../components/common/InlineError";
import { ToolGrid, ToolGridSkeleton } from "../components/tools/ToolGrid";
import { usePageMeta } from "../hooks/usePageMeta";
import { useCategories, useTools } from "../hooks/useRegistry";
import { searchTools, sortByName } from "../lib/search";
import { getErrorMessage } from "../services/api";

type SortKey = "relevance" | "az" | "za";

const fieldClass =
  "h-11 w-full rounded-lg border border-line bg-surface px-3 text-base text-heading placeholder:text-body";
const labelClass = "mb-1 block text-sm font-medium text-heading";
const buttonClass =
  "rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium text-heading transition-colors hover:bg-surface-muted";

function parseSort(value: string | null, hasQuery: boolean): SortKey {
  if (value === "az" || value === "za") return value;
  if (value === "relevance" && hasQuery) return "relevance";
  return hasQuery ? "relevance" : "az";
}

export default function AllToolsPage() {
  usePageMeta("All Tools", "Browse all ToolsPro tools. Search by name or keyword, or filter by category.");

  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const category = params.get("category") ?? "";
  const hasQuery = q.trim() !== "";
  const sort = parseSort(params.get("sort"), hasQuery);

  const toolsQuery = useTools();
  const categoriesQuery = useCategories();
  const allTools = toolsQuery.data;
  const categories = categoriesQuery.data;

  const categoryNames = useMemo(
    () => Object.fromEntries((categories ?? []).map((c) => [c.slug, c.name])),
    [categories]
  );

  const results = useMemo(() => {
    if (!allTools) return [];
    const inCategory = category ? allTools.filter((t) => t.category === category) : allTools;
    const matched = searchTools(inCategory, q, categoryNames);
    if (sort === "az") return sortByName(matched, "asc");
    if (sort === "za") return sortByName(matched, "desc");
    return matched; 
  }, [allTools, category, q, categoryNames, sort]);

  const updateParam = (key: string, value: string) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true }
    );
  };

  const clearFilters = () => setParams({}, { replace: true });
  const hasFilters = params.toString() !== "";

  const statusText =
    allTools && allTools.length > 0
      ? `${results.length} ${results.length === 1 ? "tool" : "tools"} found`
      : "";

  return (
    <Container className="py-10">
      <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "All Tools" }]} />
      <h1 className="text-3xl font-bold text-heading">All Tools</h1>
      <p className="mt-2 max-w-2xl">Search by name or keyword, or filter by category.</p>

      <form
        role="search"
        onSubmit={(e) => e.preventDefault()}
        className="mt-6 grid gap-4 md:grid-cols-[2fr_1fr_1fr]"
      >
        <div>
          <label htmlFor="tool-search" className={labelClass}>
            Search tools
          </label>
          <input
            id="tool-search"
            type="search"
            value={q}
            onChange={(e) => updateParam("q", e.target.value)}
            placeholder="Search tools (e.g. PDF, image, text, SEO)..."
            className={fieldClass}
          />
        </div>
        <div>
          <label htmlFor="tool-category" className={labelClass}>
            Category
          </label>
          <select
            id="tool-category"
            value={category}
            onChange={(e) => updateParam("category", e.target.value)}
            className={fieldClass}
          >
            <option value="">All categories</option>
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="tool-sort" className={labelClass}>
            Sort by
          </label>
          <select
            id="tool-sort"
            value={sort}
            onChange={(e) => updateParam("sort", e.target.value)}
            className={fieldClass}
          >
            {hasQuery ? <option value="relevance">Best match</option> : null}
            <option value="az">Name (A to Z)</option>
            <option value="za">Name (Z to A)</option>
          </select>
        </div>
      </form>

      <div className="mt-4 flex min-h-9 flex-wrap items-center justify-between gap-3">
        <p role="status" aria-live="polite" className="text-sm">
          {statusText}
        </p>
        {hasFilters ? (
          <button type="button" onClick={clearFilters} className={buttonClass}>
            Clear filters
          </button>
        ) : null}
      </div>

      <div className="mt-4">
        {toolsQuery.isError ? (
          <InlineError message={getErrorMessage(toolsQuery.error)} onRetry={() => void toolsQuery.refetch()} />
        ) : null}
        {!toolsQuery.isError && !allTools ? <ToolGridSkeleton /> : null}
        {allTools && allTools.length === 0 ? (
          <EmptyState
            title="No tools available yet"
            description="Tools are still being added to ToolsPro. Please check back soon."
          />
        ) : null}
        {allTools && allTools.length > 0 && results.length === 0 ? (
          <EmptyState
            title="No tools found"
            description="Try a different search term, or clear your filters to see everything."
            action={
              <button type="button" onClick={clearFilters} className={buttonClass}>
                Clear filters
              </button>
            }
          />
        ) : null}
        {results.length > 0 ? <ToolGrid tools={results} /> : null}
      </div>
    </Container>
  );
}