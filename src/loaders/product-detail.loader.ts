import { type LoaderFunctionArgs } from "react-router";
import { getProductById } from "@/services/product.service";
import { getProductReviews } from "@/services/review.service";

/**
 * Product detail page loader
 * Loads a single product by ID and its reviews
 */
export async function productDetailLoader({ params }: LoaderFunctionArgs) {
  const { id } = params;
  
  if (!id) {
    throw new Response("Product ID is required", { status: 400 });
  }
  
  const [product, reviews] = await Promise.all([
    getProductById(id),
    getProductReviews(id),
  ]);
  
  if (!product) {
    throw new Response("Product not found", { status: 404 });
  }
  
  return {
    product,
    reviews,
  };
}
