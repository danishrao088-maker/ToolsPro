import { useQuery } from "@tanstack/react-query";
import { fetchCategories, fetchTools } from "../services/registryService";

export function useTools(category?: string) {
  return useQuery({
    queryKey: ["tools", category ?? "all"],
    queryFn: () => fetchTools(category),
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });
}