import { type LoaderFunctionArgs } from "react-router";
import { getProduct } from "@/services/catalog.service";
import { getProductReviews, getProductRatingStats } from "@/services/review.service";

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
    const [product, reviewList, reviewStats] = await Promise.all([
      getProduct(id),
      getProductReviews(id).catch(() => ({
        items: [],
        total: 0,
        page: 1,
        page_size: 10,
        total_pages: 0,
      })), // Reviews are optional, don't fail if error
      getProductRatingStats(id).catch(() => ({
        product_id: id,
        average_rating: 0,
        total_reviews: 0,
        rating_distribution: {},
      })), // Stats are optional, don't fail if error
    ]);

    return {
      product,
      reviews: reviewList.items,
      reviewStats,
    };
  } catch (error) {
    console.error("Failed to load product:", error);
    throw new Response("Product not found", { status: 404 });
  }
}
