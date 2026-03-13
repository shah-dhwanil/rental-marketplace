import { type LoaderFunctionArgs } from "react-router";
import { searchProducts } from "@/services/product.service";
import { getCategories } from "@/services/category.service";

/**
 * Search results page loader
 * Loads products matching search query and filters
 */
export async function searchLoader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") || "";
  
  const filters = {
    query,
    category: url.searchParams.get("category") as any || undefined,
    minPrice: url.searchParams.get("minPrice") 
      ? Number(url.searchParams.get("minPrice")) 
      : undefined,
    maxPrice: url.searchParams.get("maxPrice") 
      ? Number(url.searchParams.get("maxPrice")) 
      : undefined,
    condition: url.searchParams.get("condition") as any || undefined,
    sortBy: url.searchParams.get("sortBy") as any || undefined,
    page: url.searchParams.get("page") 
      ? Number(url.searchParams.get("page")) 
      : 1,
    pageSize: 24,
  };
  
  const [products, categories] = await Promise.all([
    searchProducts(filters),
    getCategories(),
  ]);
  
  return {
    query,
    products,
    categories,
    filters,
  };
}
