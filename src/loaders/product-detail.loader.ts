import { type LoaderFunctionArgs } from "react-router";
import { getProduct } from "@/services/catalog.service";
import { getProductReviews } from "@/services/review.service";

/**
 * Product detail page loader
 * Loads a single product by ID and its reviews from real API
 */
export async function productDetailLoader({ params }: LoaderFunctionArgs) {
  const { id } = params;

  if (!id) {
    throw new Response("Product ID is required", { status: 400 });
  }

  try {
    const [product, reviews] = await Promise.all([
      getProduct(id),
      getProductReviews(id).catch(() => []), // Reviews are optional, don't fail if error
    ]);

    return {
      product,
      reviews,
    };
  } catch (error) {
    console.error("Failed to load product:", error);
    throw new Response("Product not found", { status: 404 });
  }
}

