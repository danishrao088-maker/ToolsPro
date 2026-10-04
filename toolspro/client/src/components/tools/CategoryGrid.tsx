import { useCategories } from "../../hooks/useRegistry";
import { getErrorMessage } from "../../services/api";
import { CardSkeleton } from "../common/CardSkeleton";
import { InlineError } from "../common/InlineError";
import { CategoryCard } from "./CategoryCard";

const gridClass = "grid gap-4 sm:grid-cols-2 lg:grid-cols-3";

export function CategoryGrid() {
  const { data, isError, error, refetch } = useCategories();

  if (isError) {
    return <InlineError message={getErrorMessage(error)} onRetry={() => void refetch()} />;
  }
  if (!data) {
    return (
      <div className={gridClass}>
        {Array.from({ length: 6 }, (_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    );
  }
  return (
    <div className={gridClass}>
      {data.map((category) => (
        <CategoryCard key={category.id} category={category} />
      ))}
    </div>
  );
}