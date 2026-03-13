import { ReviewListResponseSchema, type Review } from "@/schemas/review.schema";
import { mockReviews, getReviewsByProduct } from "@/mock/reviews.mock";

const delay = (ms: number = 200) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Get reviews for a product
 */
export async function getProductReviews(productId: string) {
  await delay();
  
  const reviews = getReviewsByProduct(productId);
  
  const total = reviews.length;
  const averageRating = total > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / total
    : 0;
  
  return ReviewListResponseSchema.parse({
    reviews,
    total,
    averageRating: Math.round(averageRating * 10) / 10,
  });
}
