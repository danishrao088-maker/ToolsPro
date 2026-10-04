import { Link } from "react-router-dom";
import { Container } from "../common/Container";
import { SectionHeader } from "../common/SectionHeader";
import { InlineError } from "../common/InlineError";
import { CardSkeleton } from "../common/CardSkeleton";
import { ToolCard } from "../tools/ToolCard";
import { useTools } from "../../hooks/useRegistry";
import { getErrorMessage } from "../../services/api";

const gridClass = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

export function PopularTools() {
  const { data, isPending, isError, error, refetch } = useTools();

  // Koi active tool nahi: section dikhana hi nahi (prompt: no placeholder cards)
  if (data && data.length === 0) return null;

  return (
    <section className="py-12">
      <Container>
        <SectionHeader
          title="Popular Tools"
          action={
            <Link to="/tools" className="text-sm font-medium text-link hover:underline">
              View All Tools
            </Link>
          }
        />
        {isPending ? (
          <div className={gridClass}>
            {Array.from({ length: 4 }, (_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : null}
        {isError ? <InlineError message={getErrorMessage(error)} onRetry={() => void refetch()} /> : null}
        {data ? (
          <div className={gridClass}>
            {data.slice(0, 8).map((tool) => (
              <ToolCard key={tool.id} tool={tool} />
            ))}
          </div>
        ) : null}
      </Container>
    </section>
  );
}