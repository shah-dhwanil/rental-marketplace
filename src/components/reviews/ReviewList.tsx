/**
 * ReviewList Component
 * Displays a list of product reviews with pagination
 */
import { StarRating } from "./StarRating";
import { Button } from "@/components/ui/button";
import { ThumbsUp, CheckCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { Review } from "@/schemas/review.schema";

interface ReviewListProps {
  reviews: Review[];
  onMarkHelpful?: (reviewId: string) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  isLoading?: boolean;
}

export function ReviewList({
  reviews,
  onMarkHelpful,
  onLoadMore,
  hasMore = false,
  isLoading = false,
}: ReviewListProps) {
  if (reviews.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p className="text-lg">No reviews yet</p>
        <p className="text-sm mt-1">Be the first to review this product!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {reviews.map((review) => (
        <div
          key={review.id}
          className="border-b border-gray-200 pb-6 last:border-b-0"
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              {review.customerAvatar ? (
                <img
                  src={review.customerAvatar}
                  alt={review.customerName || "User"}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold">
                  {(review.customerName || "U")[0].toUpperCase()}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {review.customerName || "Anonymous"}
                  </span>
                  {review.isVerified && (
                    <span className="flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle className="h-3 w-3" />
                      Verified Purchase
                    </span>
                  )}
                </div>
                <span className="text-sm text-gray-600">
                  {formatDistanceToNow(new Date(review.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
            </div>
            <StarRating rating={review.rating} readonly size="sm" />
          </div>

          {/* Comment */}
          <p className="text-gray-700 mb-3">{review.comment}</p>

          {/* Images */}
          {review.images && review.images.length > 0 && (
            <div className="flex gap-2 mb-3">
              {review.images.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`Review ${index + 1}`}
                  className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => window.open(image, "_blank")}
                />
              ))}
            </div>
          )}

          {/* Vendor Response */}
          {review.vendorResponse && (
            <div className="mt-3 ml-6 p-3 bg-blue-50 border-l-4 border-blue-500 rounded">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-semibold text-blue-900">
                  Vendor Response
                </span>
                {review.vendorRespondedAt && (
                  <span className="text-xs text-blue-600">
                    {formatDistanceToNow(new Date(review.vendorRespondedAt), {
                      addSuffix: true,
                    })}
                  </span>
                )}
              </div>
              <p className="text-sm text-blue-800">{review.vendorResponse}</p>
            </div>
          )}

          {/* Helpful Button */}
          {onMarkHelpful && (
            <div className="mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onMarkHelpful(review.id)}
                className="text-gray-600 hover:text-gray-900"
              >
                <ThumbsUp className="h-4 w-4 mr-1" />
                Helpful ({review.helpfulCount})
              </Button>
            </div>
          )}
        </div>
      ))}

      {/* Load More */}
      {hasMore && (
        <div className="text-center pt-4">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Load More Reviews"}
          </Button>
        </div>
      )}
    </div>
  );
}
