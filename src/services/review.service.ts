import { 
  ReviewResponseSchema,
  ReviewListResponseSchema, 
  ReviewStatsResponseSchema,
  ReviewCreatedResponseSchema,
  type Review,
  type CreateReviewRequest,
  type ReviewListResponse,
  type ReviewStatsResponse,
} from "@/schemas/review.schema";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/stores/auth.store";

/**
 * Create a review for a completed order
 */
export async function createReview(data: CreateReviewRequest) {
  const token = useAuthStore.getState().accessToken;
  const response = await apiFetch("/reviews", {
    method: "POST",
    body: JSON.stringify(data),
  }, token);
  return ReviewCreatedResponseSchema.parse(response);
}

/**
 * Get a review by ID
 */
export async function getReviewById(reviewId: string) {
  const response = await apiFetch(`/reviews/${reviewId}`);
  return ReviewResponseSchema.parse(response);
}

/**
 * Get reviews for a product
 */
export async function getProductReviews(
  productId: string,
  params?: {
    minRating?: number;
    sortBy?: "created_at" | "rating" | "helpful_count";
    sortOrder?: "asc" | "desc";
    page?: number;
    pageSize?: number;
  }
): Promise<ReviewListResponse> {
  const queryParams = new URLSearchParams();
  queryParams.append("product_id", productId);
  if (params?.minRating) queryParams.append("min_rating", params.minRating.toString());
  if (params?.sortBy) queryParams.append("sort_by", params.sortBy);
  if (params?.sortOrder) queryParams.append("sort_order", params.sortOrder);
  queryParams.append("page", (params?.page || 1).toString());
  queryParams.append("page_size", (params?.pageSize || 10).toString());

  const response = await apiFetch(`/reviews?${queryParams.toString()}`);
  return ReviewListResponseSchema.parse(response);
}

/**
 * Get reviews for a customer
 */
export async function getCustomerReviews(
  customerId: string,
  params?: {
    page?: number;
    pageSize?: number;
  }
) {
  const queryParams = new URLSearchParams();
  queryParams.append("customer_id", customerId);
  queryParams.append("page", (params?.page || 1).toString());
  queryParams.append("page_size", (params?.pageSize || 10).toString());

  const response = await apiFetch(`/reviews?${queryParams.toString()}`);
  return ReviewListResponseSchema.parse(response);
}

/**
 * Get review for a specific order
 */
export async function getOrderReview(orderId: string) {
  const queryParams = new URLSearchParams();
  queryParams.append("order_id", orderId);
  queryParams.append("page_size", "1");

  const response = await apiFetch(`/reviews?${queryParams.toString()}`);
  const result = ReviewListResponseSchema.parse(response);
  return result.items.length > 0 ? result.items[0] : null;
}

/**
 * Get product rating statistics
 */
export async function getProductRatingStats(productId: string): Promise<ReviewStatsResponse> {
  const response = await apiFetch(`/reviews/products/${productId}/stats`);
  return ReviewStatsResponseSchema.parse(response);
}

/**
 * Add vendor response to a review
 */
export async function addVendorResponse(reviewId: string, vendorResponse: string) {
  const token = useAuthStore.getState().accessToken;
  const response = await apiFetch(`/reviews/${reviewId}/vendor-response`, {
    method: "PATCH",
    body: JSON.stringify({ vendor_response: vendorResponse }),
  }, token);
  return ReviewResponseSchema.parse(response);
}

/**
 * Mark a review as helpful
 */
export async function markReviewHelpful(reviewId: string) {
  const response = await apiFetch(`/reviews/${reviewId}/helpful`, {
    method: "POST",
  });
  return ReviewResponseSchema.parse(response);
}

