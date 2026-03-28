import { z } from "zod";

export const ReviewResponseSchema = z.object({
  id: z.string().uuid(),
  product_id: z.string().uuid(),
  order_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  customer_name: z.string().optional(),
  customer_avatar: z.string().url().optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).max(1000),
  images: z.array(z.string().url()).default([]),
  vendor_response: z.string().optional(),
  vendor_responded_at: z.string().datetime().optional(),
  helpful_count: z.number().int().nonnegative().default(0),
  is_verified: z.boolean().default(true),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export const CreateReviewRequestSchema = z.object({
  order_id: z.string().uuid(),
  product_id: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).max(1000),
  images: z.array(z.string().url()).max(5).default([]),
});

export const ReviewStatsResponseSchema = z.object({
  product_id: z.string().uuid(),
  average_rating: z.number().min(0).max(5).default(0),
  total_reviews: z.number().int().nonnegative().default(0),
  rating_distribution: z.record(z.string(), z.number().int().nonnegative()).default({}),
});

export const ReviewListResponseSchema = z.object({
  items: z.array(ReviewResponseSchema),
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  page_size: z.number().int().positive(),
  total_pages: z.number().int().nonnegative(),
});

export const ReviewCreatedResponseSchema = z.object({
  id: z.string().uuid(),
  message: z.string().default("Review created successfully"),
});

export type Review = z.infer<typeof ReviewResponseSchema>;
export type CreateReviewRequest = z.infer<typeof CreateReviewRequestSchema>;
export type ReviewListResponse = z.infer<typeof ReviewListResponseSchema>;
export type ReviewStatsResponse = z.infer<typeof ReviewStatsResponseSchema>;
export type ReviewCreatedResponse = z.infer<typeof ReviewCreatedResponseSchema>;

