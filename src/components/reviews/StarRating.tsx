/**
 * StarRating Component
 * Displays and allows interaction with 1-5 star ratings
 * Supports both readonly (display) and interactive (input) modes
 */
import { Star } from "lucide-react";
import { useState } from "react";

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
  showCount?: boolean;
  count?: number;
}

export function StarRating({
  rating,
  onRatingChange,
  readonly = false,
  size = "md",
  showCount = false,
  count,
}: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null);

  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-5 h-5",
    lg: "w-6 h-6",
  };

  const handleClick = (value: number) => {
    if (!readonly && onRatingChange) {
      onRatingChange(value);
    }
  };

  const handleMouseEnter = (value: number) => {
    if (!readonly) {
      setHover(value);
    }
  };

  const handleMouseLeave = () => {
    if (!readonly) {
      setHover(null);
    }
  };

  const displayRating = hover !== null ? hover : rating;

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFilled = star <= displayRating;
        const isHalfFilled = !Number.isInteger(displayRating) && star === Math.ceil(displayRating);

        return (
          <button
            key={star}
            type="button"
            onClick={() => handleClick(star)}
            onMouseEnter={() => handleMouseEnter(star)}
            onMouseLeave={handleMouseLeave}
            disabled={readonly}
            className={`
              ${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"}
              transition-transform duration-150
              ${!readonly && "focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"}
            `}
            aria-label={`${star} star${star !== 1 ? "s" : ""}`}
          >
            {isHalfFilled ? (
              <div className="relative">
                <Star className={`${sizeClasses[size]} text-gray-300`} />
                <div className="absolute inset-0 overflow-hidden" style={{ width: "50%" }}>
                  <Star className={`${sizeClasses[size]} text-yellow-400 fill-yellow-400`} />
                </div>
              </div>
            ) : (
              <Star
                className={`
                  ${sizeClasses[size]}
                  ${isFilled ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}
                `}
              />
            )}
          </button>
        );
      })}
      {showCount && count !== undefined && (
        <span className="ml-2 text-sm text-gray-600">
          ({count.toLocaleString()})
        </span>
      )}
    </div>
  );
}
