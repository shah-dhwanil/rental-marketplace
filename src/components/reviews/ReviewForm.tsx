/**
 * ReviewForm Component
 * Form for submitting a product review with rating, comment, and images
 */
import { useState } from "react";
import { StarRating } from "./StarRating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, X } from "lucide-react";

interface ReviewFormProps {
  onSubmit: (data: {
    rating: number;
    comment: string;
    images: string[];
  }) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function ReviewForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [errors, setErrors] = useState<{
    rating?: string;
    comment?: string;
  }>({});

  const validate = () => {
    const newErrors: typeof errors = {};

    if (rating === 0) {
      newErrors.rating = "Please select a rating";
    }

    if (comment.length < 10) {
      newErrors.comment = "Comment must be at least 10 characters";
    } else if (comment.length > 1000) {
      newErrors.comment = "Comment must not exceed 1000 characters";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    await onSubmit({
      rating,
      comment,
      images,
    });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    // In a real app, you would upload these to Cloudinary or similar
    // For now, we'll just create object URLs
    const newImages = Array.from(files).slice(0, 5 - images.length).map(file => 
      URL.createObjectURL(file)
    );
    setImages([...images, ...newImages]);
  };

  const removeImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Rating */}
      <div>
        <Label className="block mb-2 font-medium">
          Rating <span className="text-red-500">*</span>
        </Label>
        <StarRating
          rating={rating}
          onRatingChange={setRating}
          size="lg"
        />
        {errors.rating && (
          <p className="mt-1 text-sm text-red-600">{errors.rating}</p>
        )}
      </div>

      {/* Comment */}
      <div>
        <Label htmlFor="comment" className="block mb-2 font-medium">
          Your Review <span className="text-red-500">*</span>
        </Label>
        <Textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience with this product..."
          rows={5}
          className={errors.comment ? "border-red-500" : ""}
        />
        <div className="mt-1 flex justify-between text-sm text-gray-600">
          <span>{errors.comment || "10-1000 characters"}</span>
          <span>{comment.length}/1000</span>
        </div>
      </div>

      {/* Images */}
      <div>
        <Label className="block mb-2 font-medium">
          Photos (Optional)
        </Label>
        <div className="space-y-3">
          {images.length < 5 && (
            <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-gray-400 transition-colors">
              <div className="text-center">
                <Upload className="mx-auto h-8 w-8 text-gray-400" />
                <span className="mt-2 block text-sm text-gray-600">
                  Upload photos ({images.length}/5)
                </span>
              </div>
              <input
                type="file"
                className="hidden"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
              />
            </label>
          )}

          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {images.map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Submit Review"}
        </Button>
      </div>
    </form>
  );
}
