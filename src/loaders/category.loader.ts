import { type LoaderFunctionArgs } from "react-router";
import { getProducts } from "@/services/product.service";
import { getCategoryBySlug, getCategories } from "@/services/category.service";

/**
 * Category page loader
 * Loads products in a specific category with filtering and sorting
 */
export async function categoryLoader({ params, request }: LoaderFunctionArgs) {
  const { slug } = params;
  const url = new URL(request.url);
  
  if (!slug) {
    throw new Response("Category slug is required", { status: 400 });
  }
  
  // Parse query parameters for filtering
  const filters = {
    category: slug as any, // Type assertion for category enum
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
  
  const [category, products, allCategories] = await Promise.all([
    getCategoryBySlug(slug),
    getProducts(filters),
    getCategories(),
  ]);
  
  if (!category) {
    throw new Response("Category not found", { status: 404 });
  }
  
  return {
    category,
    products,
    allCategories,
    filters,
  };
}
