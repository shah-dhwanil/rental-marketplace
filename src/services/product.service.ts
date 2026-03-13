import { 
  ProductListResponseSchema, 
  ProductSchema,
  type ProductSearchParams,
  type Product,
} from "@/schemas/product.schema";
import { mockProducts, getFeaturedProducts as getMockFeaturedProducts, getProductsByCategory } from "@/mock/products.mock";

// Simulated network delay
const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Get featured products
 */
export async function getFeaturedProducts() {
  await delay();
  return getMockFeaturedProducts();
}

/**
 * Get all products with optional filtering and pagination
 */
export async function getProducts(params?: ProductSearchParams) {
  await delay();
  
  let filtered = [...mockProducts];
  
  // Apply filters
  if (params?.category) {
    filtered = filtered.filter(p => p.category === params.category);
  }
  
  if (params?.query) {
    const query = params.query.toLowerCase();
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      p.brand.toLowerCase().includes(query)
    );
  }
  
  if (params?.minPrice) {
    filtered = filtered.filter(p => p.pricing.daily >= params.minPrice!);
  }
  
  if (params?.maxPrice) {
    filtered = filtered.filter(p => p.pricing.daily <= params.maxPrice!);
  }
  
  if (params?.condition) {
    filtered = filtered.filter(p => p.condition === params.condition);
  }
  
  // Apply sorting
  if (params?.sortBy) {
    switch (params.sortBy) {
      case "price-asc":
        filtered.sort((a, b) => a.pricing.daily - b.pricing.daily);
        break;
      case "price-desc":
        filtered.sort((a, b) => b.pricing.daily - a.pricing.daily);
        break;
      case "rating":
        filtered.sort((a, b) => b.rating - a.rating);
        break;
      case "newest":
        filtered.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
    }
  }
  
  // Apply pagination
  const page = params?.page || 1;
  const pageSize = params?.pageSize || 20;
  const start = (page - 1) * pageSize;
  const end = start + pageSize;
  const paginated = filtered.slice(start, end);
  
  const response = {
    products: paginated,
    total: filtered.length,
    page,
    pageSize,
    hasMore: end < filtered.length,
  };
  
  return ProductListResponseSchema.parse(response);
}

/**
 * Get a single product by ID
 */
export async function getProductById(id: string): Promise<Product> {
  await delay();
  
  const product = mockProducts.find(p => p.id === id);
  
  if (!product) {
    throw new Error(`Product with ID ${id} not found`);
  }
  
  return ProductSchema.parse(product);
}

/**
 * Get featured products for homepage
 */
export async function getFeatured() {
  await delay();
  
  const productsData = await getFeaturedProducts();
  
  return ProductListResponseSchema.parse({
    products: productsData,
    total: productsData.length,
    page: 1,
    pageSize: productsData.length,
    hasMore: false,
  });
}

/**
 * Get products by category
 */
export async function getProductsInCategory(category: string) {
  await delay();
  
  const products = getProductsByCategory(category);
  
  return ProductListResponseSchema.parse({
    products,
    total: products.length,
    page: 1,
    pageSize: products.length,
    hasMore: false,
  });
}

/**
 * Search products
 */
export async function searchProducts(params: ProductSearchParams) {
  return getProducts(params);
}
