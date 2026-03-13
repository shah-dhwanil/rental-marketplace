import { type LoaderFunctionArgs } from "react-router";
import { listAllProducts, listCategories } from "@/services/catalog.service";

/**
 * Search results page loader
 * Loads products matching search query and filters from real API
 */
export async function searchLoader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const query = url.searchParams.get("q") || "";
  const page = url.searchParams.get("page") ? Number(url.searchParams.get("page")) : 1;
  const pageSize = 24;

  try {
    const [productsResponse, categoriesResponse] = await Promise.all([
      listAllProducts({
        q: query || undefined,
        page,
        page_size: pageSize,
        is_active: true,
      }),
      listCategories({ page: 1, page_size: 100 }),
    ]);

    return {
      query,
      products: productsResponse.items,
      categories: categoriesResponse.items,
      pagination: productsResponse.pagination,
    };
  } catch (error) {
    console.error("Failed to search products:", error);
    return {
      query,
      products: [],
      categories: [],
      pagination: { page: 1, page_size: 24, pages: 0, total: 0 },
    };
  }
}

