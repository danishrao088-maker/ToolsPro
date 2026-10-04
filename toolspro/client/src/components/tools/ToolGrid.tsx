import type { PublicTool } from "../../types/api";
import { CardSkeleton } from "../common/CardSkeleton";
import { ToolCard } from "./ToolCard";

const gridClass = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

export function ToolGrid({ tools }: { tools: PublicTool[] }) {
  return (
    <ul className={gridClass}>
      {tools.map((tool) => (
        <li key={tool.id} className="grid">
          <ToolCard tool={tool} />
        </li>
      ))}
    </ul>
  );
}

export function ToolGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className={gridClass}>
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}