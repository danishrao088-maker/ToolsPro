import type { PublicTool } from "../../types/api";
import { ToolGrid } from "./ToolGrid";

export function RelatedTools({ tools }: { tools: PublicTool[] }) {
  if (tools.length === 0) return null;
  return (
    <section aria-labelledby="related-tools" className="mt-12">
      <h2 id="related-tools" className="mb-4 text-xl font-bold text-heading">
        Related tools
      </h2>
      <ToolGrid tools={tools} />
    </section>
  );
}