/**
 * ReviewStats Component
 * Displays aggregate review statistics including average rating and distribution
 */
import { StarRating } from "./StarRating";

interface ReviewStatsProps {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: Record<string, number>;
}

export function ReviewStats({
  averageRating,
  totalReviews,
  ratingDistribution,
}: ReviewStatsProps) {
  // Calculate percentages for each rating
  const distribution = [5, 4, 3, 2, 1].map((rating) => {
    const count = ratingDistribution[rating.toString()] || 0;
    const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
    return { rating, count, percentage };
  });

  return (
    <div className="space-y-6">
      {/* Overall Rating */}
      <div className="flex items-center gap-6">
        <div className="text-center">
          <div className="text-5xl font-bold text-gray-900">
            {averageRating.toFixed(1)}
          </div>
          <div className="mt-2">
            <StarRating rating={averageRating} readonly size="md" />
          </div>
          <div className="mt-1 text-sm text-gray-600">
            {totalReviews.toLocaleString()} review{totalReviews !== 1 ? "s" : ""}
          </div>
        </div>

        {/* Rating Distribution */}
        <div className="flex-1 space-y-2">
          {distribution.map(({ rating, count, percentage }) => (
            <div key={rating} className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700 w-8">
                {rating} ★
              </span>
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400 transition-all duration-300"
                  style={{ width: `${percentage}%` }}
                />
              </div>
              <span className="text-sm text-gray-600 w-12 text-right">
                {count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
