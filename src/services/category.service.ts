import { CategoryListResponseSchema, type Category } from "@/schemas/category.schema";
import { mockCategories } from "@/mock/categories.mock";

const delay = (ms: number = 200) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Get all categories
 */
export async function getCategories() {
  await delay();
  
  return CategoryListResponseSchema.parse({
    categories: mockCategories,
  });
}

/**
 * Get a single category by slug
 */
export async function getCategoryBySlug(slug: string): Promise<Category> {
  await delay();
  
  const category = mockCategories.find(c => c.slug === slug);
  
  if (!category) {
    throw new Error(`Category with slug ${slug} not found`);
  }
  
  return category;
}
