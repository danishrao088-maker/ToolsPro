import { Link } from "react-router-dom";
import type { PublicTool } from "../../types/api";
import { Icon } from "../common/Icon";

export function ToolCard({ tool }: { tool: PublicTool }) {
  return (
    <Link
      to={`/tools/${tool.slug}`}
      className="flex h-full flex-col rounded-xl border border-line bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-surface-muted text-link">
        <Icon name={tool.icon} />
      </span>
      <h3 className="mt-4 font-semibold text-heading">{tool.name}</h3>
      <p className="mt-1 text-sm">{tool.description}</p>
    </Link>
  );
}