import { Link } from "react-router-dom";
import type { CategoryWithCount } from "../../types/api";
import { Icon } from "../common/Icon";

export function CategoryCard({ category }: { category: CategoryWithCount }) {
  const { toolCount } = category;
  return (
    <Link
      to={`/category/${category.slug}`}
      className="flex h-full flex-col rounded-xl border border-line bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface-muted text-link">
        <Icon name={category.icon} />
      </span>
      <h3 className="mt-4 font-semibold text-heading">{category.name}</h3>
      <p className="mt-1 text-sm">{category.description}</p>
      {toolCount > 0 ? (
        <p className="mt-3 text-sm font-medium text-link">
          {toolCount} {toolCount === 1 ? "tool" : "tools"}
        </p>
      ) : null}
    </Link>
  );
}