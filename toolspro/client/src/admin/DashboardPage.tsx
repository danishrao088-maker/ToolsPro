import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { InlineError } from "../components/common/InlineError";
import { LoadingIndicator } from "../components/common/LoadingIndicator";
import { getErrorMessage } from "../services/api";
import { adminApi } from "./adminApi";
import { formatDate } from "./editorUtils";
import { adminQueryDefaults, useAdminTitle } from "./hooks";
import { PageHeading, Panel, StatusBadge, primaryLinkClass } from "./ui";

export default function DashboardPage() {
  useAdminTitle("Dashboard");
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: adminApi.stats, ...adminQueryDefaults });

  const newPost = (
    <Link to="/admin/posts/new" className={primaryLinkClass}>
      <Plus aria-hidden="true" size={18} /> New post
    </Link>
  );

  if (stats.isPending) return <LoadingIndicator />;
  if (stats.isError) return <InlineError message={getErrorMessage(stats.error)} onRetry={() => void stats.refetch()} />;

  const { totals, recent } = stats.data;
  const cards = [
    { label: "All posts", value: totals.posts, to: "/admin/posts" },
    { label: "Published", value: totals.published, to: "/admin/posts?status=published" },
    { label: "Drafts", value: totals.drafts, to: "/admin/posts?status=draft" },
    { label: "Categories", value: totals.categories, to: "/admin/categories" },
    { label: "Tags", value: totals.tags, to: "/admin/tags" },
  ];

  return (
    <>
      <PageHeading title="Dashboard" description="Edit old posts, write new ones and keep categories and tags tidy." actions={newPost} />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {cards.map((card) => (
          <Link key={card.label} to={card.to} className="rounded-xl border border-line bg-surface p-4 transition-colors hover:bg-surface-muted">
            <p className="text-2xl font-bold text-heading">{card.value}</p>
            <p className="text-sm">{card.label}</p>
          </Link>
        ))}
      </div>
      <Panel title="Recently updated" className="mt-8">
        {recent.length === 0 ? (
          <p>No posts yet.</p>
        ) : (
          <ul className="divide-y divide-line">
            {recent.map((post) => (
              <li key={post.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Link to={`/admin/posts/${post.id}`} className="font-medium text-heading hover:underline">
                    {post.title}
                  </Link>
                  <p className="text-sm">Updated {formatDate(post.updatedAt)}</p>
                </div>
                <StatusBadge status={post.status} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
