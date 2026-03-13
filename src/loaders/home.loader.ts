import { type LoaderFunctionArgs } from "react-router";
import { listAllProducts, listCategories } from "@/services/catalog.service";

/**
 * Home page loader
 * Loads featured products, all products for the grid, and categories from real API
 */
export async function homeLoader() {
  // Load critical data immediately
  const categories = await listCategories({ page: 1, page_size: 50 });

  // Fetch all products and featured ones
  const allProducts = await listAllProducts({ page: 1, page_size: 12 });

  // Featured products can be first 8 items (or you can add a backend filter)
  const featuredProducts = {
    ...allProducts,
    items: allProducts.items.slice(0, 8),
  };

  // Return data - services already validate with Zod
  return {
    categories: categories.items,
    featuredProducts: featuredProducts.items,
    products: allProducts.items,
    pagination: allProducts.pagination,
  };
}
