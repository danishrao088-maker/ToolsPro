import type { FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ExternalLink, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { EmptyState } from "../components/common/EmptyState";
import { InlineError } from "../components/common/InlineError";
import { LoadingIndicator } from "../components/common/LoadingIndicator";
import { getErrorMessage } from "../services/api";
import { adminApi } from "./adminApi";
import { formatDate, postUrl } from "./editorUtils";
import { adminQueryDefaults, refreshAdminData, useAdminTitle, useTerms } from "./hooks";
import type { AdminPostSummary, PostStatus } from "./types";
import { PageHeading, StatusBadge, primaryLinkClass, smallButtonClass } from "./ui";

const PAGE_SIZE = 20;

function parseStatus(value: string | null): "" | PostStatus {
  return value === "draft" || value === "published" ? value : "";
}

export default function PostsPage() {
  useAdminTitle("Posts");
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Math.floor(Number(params.get("page"))) || 1);
  const q = params.get("q") ?? "";
  const status = parseStatus(params.get("status"));
  const category = params.get("category") ?? "";

  const categories = useTerms("categories");
  const posts = useQuery({
    queryKey: ["admin", "posts", { page, q, status, category }],
    queryFn: () => adminApi.listPosts({ page, pageSize: PAGE_SIZE, q, status, category }),
    placeholderData: keepPreviousData,
    ...adminQueryDefaults,
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, next }: { id: string; next: PostStatus }) => adminApi.setPostStatus(id, next),
    onSuccess: () => refreshAdminData(queryClient),
  });
  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deletePost(id),
    onSuccess: () => refreshAdminData(queryClient),
  });

  function setFilter(key: string, value: string) {
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (value === "") next.delete(key);
        else next.set(key, value);
        next.delete("page");
        return next;
      },
      { replace: true },
    );
  }

  function goToPage(next: number) {
    setParams(
      (current) => {
        const copy = new URLSearchParams(current);
        if (next <= 1) copy.delete("page");
        else copy.set("page", String(next));
        return copy;
      },
      { replace: true },
    );
  }

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("q") ?? "").trim();
    setFilter("q", value);
  }

  function confirmDelete(post: AdminPostSummary) {
    if (window.confirm(`Delete "${post.title}"?\n\nThis cannot be undone.`)) remove.mutate(post.id);
  }

  const actionError = toggleStatus.error ?? remove.error;
  const filtered = q !== "" || status !== "" || category !== "";

  return (
    <>
      <PageHeading
        title="Posts"
        actions={
          <Link to="/admin/posts/new" className={primaryLinkClass}>
            <Plus aria-hidden="true" size={18} /> New post
          </Link>
        }
      />

      <div className="mb-5 flex flex-wrap items-end gap-3">
        <form key={q} onSubmit={submitSearch} className="flex min-w-[14rem] flex-1 gap-2" role="search">
          <label htmlFor="post-search" className="sr-only">
            Search posts
          </label>
          <input
            id="post-search"
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search by title..."
            className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-base text-heading placeholder:text-body"
          />
          <button type="submit" className={`${smallButtonClass} h-11`} aria-label="Search">
            <Search aria-hidden="true" size={18} />
          </button>
        </form>
        <div>
          <label htmlFor="post-status" className="sr-only">
            Status
          </label>
          <select
            id="post-status"
            value={status}
            onChange={(e) => setFilter("status", e.target.value)}
            className="h-11 rounded-lg border border-line bg-surface px-3 text-base text-heading"
          >
            <option value="">All statuses</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
          </select>
        </div>
        <div>
          <label htmlFor="post-category" className="sr-only">
            Category
          </label>
          <select
            id="post-category"
            value={category}
            onChange={(e) => setFilter("category", e.target.value)}
            className="h-11 max-w-[14rem] rounded-lg border border-line bg-surface px-3 text-base text-heading"
          >
            <option value="">All categories</option>
            {(categories.data ?? []).map((term) => (
              <option key={term.id} value={term.slug}>
                {term.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {actionError ? (
        <div className="mb-5">
          <InlineError message={getErrorMessage(actionError)} />
        </div>
      ) : null}

      {posts.isPending ? <LoadingIndicator /> : null}
      {posts.isError ? <InlineError message={getErrorMessage(posts.error)} onRetry={() => void posts.refetch()} /> : null}
      {posts.data && posts.data.items.length === 0 ? (
        <EmptyState
          title={filtered ? "No posts match these filters" : "No posts yet"}
          description={filtered ? "Try a different search or clear the filters." : "Write your first post to get started."}
        />
      ) : null}

      {posts.data && posts.data.items.length > 0 ? (
        <>
          <p className="mb-2 text-sm">
            {posts.data.total} {posts.data.total === 1 ? "post" : "posts"}
          </p>
          <ul className={`divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface ${posts.isPlaceholderData ? "opacity-60" : ""}`}>
            {posts.data.items.map((post) => (
              <li key={post.id} className="flex flex-wrap items-center gap-4 p-4">
                {post.featuredImage.url ? (
                  <img src={post.featuredImage.url} alt="" loading="lazy" className="h-12 w-16 shrink-0 rounded-md bg-surface-muted object-cover" />
                ) : (
                  <div aria-hidden="true" className="h-12 w-16 shrink-0 rounded-md bg-surface-muted" />
                )}
                <div className="min-w-0 flex-1 basis-60">
                  <Link to={`/admin/posts/${post.id}`} className="font-medium text-heading hover:underline">
                    {post.title}
                  </Link>
                  <p className="mt-0.5 truncate text-sm">
                    {post.category ? `${post.category.name} · ` : ""}
                    {post.status === "published" ? `Published ${formatDate(post.publishedAt)}` : `Updated ${formatDate(post.updatedAt)}`}
                  </p>
                </div>
                <StatusBadge status={post.status} />
                <div className="flex flex-wrap items-center gap-2">
                  <Link to={`/admin/posts/${post.id}`} className={smallButtonClass}>
                    <Pencil aria-hidden="true" size={15} /> Edit
                  </Link>
                  {post.status === "published" ? (
                    <a href={postUrl(post.slug)} target="_blank" rel="noreferrer" className={smallButtonClass}>
                      <ExternalLink aria-hidden="true" size={15} /> View
                    </a>
                  ) : null}
                  <button
                    type="button"
                    className={smallButtonClass}
                    disabled={toggleStatus.isPending || remove.isPending}
                    onClick={() => toggleStatus.mutate({ id: post.id, next: post.status === "published" ? "draft" : "published" })}
                  >
                    {post.status === "published" ? "Unpublish" : "Publish"}
                  </button>
                  <button
                    type="button"
                    className={`${smallButtonClass} text-danger`}
                    disabled={toggleStatus.isPending || remove.isPending}
                    onClick={() => confirmDelete(post)}
                    aria-label={`Delete ${post.title}`}
                  >
                    <Trash2 aria-hidden="true" size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {posts.data.totalPages > 1 ? (
            <nav aria-label="Pages" className="mt-5 flex items-center justify-between gap-3">
              <button type="button" className={smallButtonClass} disabled={page <= 1} onClick={() => goToPage(page - 1)}>
                <ChevronLeft aria-hidden="true" size={16} /> Previous
              </button>
              <p className="text-sm">
                Page {posts.data.page} of {posts.data.totalPages}
              </p>
              <button type="button" className={smallButtonClass} disabled={page >= posts.data.totalPages} onClick={() => goToPage(page + 1)}>
                Next <ChevronRight aria-hidden="true" size={16} />
              </button>
            </nav>
          ) : null}
        </>
      ) : null}
    </>
  );
}
