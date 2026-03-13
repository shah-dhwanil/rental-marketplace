import { type LoaderFunctionArgs } from "react-router";
import { listAllProducts, listCategories } from "@/services/catalog.service";

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
  const page = url.searchParams.get("page") ? Number(url.searchParams.get("page")) : 1;
  const pageSize = 24;

  try {
    // Fetch all categories to find by slug
    const allCategoriesResponse = await listCategories({ page: 1, page_size: 100 });
    const category = allCategoriesResponse.items.find(
      (cat: any) => cat.slug === slug
    );

    if (!category) {
      throw new Response("Category not found", { status: 404 });
    }

    // Fetch products for this category
    const productsResponse = await listAllProducts({
      page,
      page_size: pageSize,
      category_id: category.id,
      is_active: true,
    });

    return {
      category,
      products: productsResponse.items,
      pagination: productsResponse.pagination,
    };
  } catch (error) {
    console.error("Failed to load category:", error);
    throw new Response("Category not found", { status: 404 });
  }
}

