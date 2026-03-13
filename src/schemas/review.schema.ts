import { z } from "zod";

export const ReviewSchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  userAvatar: z.string().url().optional(),
  productId: z.string(),
  rentalId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).max(1000),
  images: z.array(z.string().url()).default([]),
  vendorResponse: z.string().optional(),
  vendorResponseAt: z.string().datetime().optional(),
  helpfulCount: z.number().int().nonnegative().default(0),
  verified: z.boolean().default(false),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CreateReviewRequestSchema = z.object({
  rentalId: z.string(),
  productId: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).max(1000),
  images: z.array(z.string().url()).default([]),
});

export const ReviewListSchema = z.array(ReviewSchema);

export const ReviewListResponseSchema = z.object({
  reviews: z.array(ReviewSchema),
  total: z.number().int().nonnegative(),
  averageRating: z.number().min(0).max(5),
});

export type Review = z.infer<typeof ReviewSchema>;
export type CreateReviewRequest = z.infer<typeof CreateReviewRequestSchema>;
export type ReviewListResponse = z.infer<typeof ReviewListResponseSchema>;
