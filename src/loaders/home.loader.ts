import { type LoaderFunctionArgs } from "react-router";
import { getProducts, getFeaturedProducts } from "@/services/product.service";
import { getCategories } from "@/services/category.service";

/**
 * Home page loader
 * Loads featured products, all products for the grid, and categories
 */
export async function homeLoader() {
  // Load critical data immediately
  const categories = await getCategories();
  
  // Return data - services already validate with Zod
  return {
    categories,
    featuredProducts: getFeaturedProducts(),
    products: getProducts({ page: 1, pageSize: 12 }),
  };
}
