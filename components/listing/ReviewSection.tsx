'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Image from 'next/image';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StarRating } from '@/components/common/StarRating';
import { reviewSchema, type ReviewFormData } from '@/lib/validators';
import type { Review } from '@/types/database';
import { formatRelativeDate, getInitials } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ReviewSectionProps {
  listingId: string;
  reviews: Review[];
  canReview?: boolean;
  bookingId?: string;
}

export function ReviewSection({ listingId, reviews, canReview, bookingId }: ReviewSectionProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localReviews, setLocalReviews] = useState(reviews);
  const [showForm, setShowForm] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      listing_id: listingId,
      booking_id: bookingId || '',
      rating: 0,
      body: '',
    },
  });

  const rating = watch('rating');

  const onSubmit = async (data: ReviewFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/listings/${listingId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) throw new Error('Failed to submit review');

      const result = await response.json();
      setLocalReviews((prev) => [result.data, ...prev]);
      reset();
      setShowForm(false);
      toast.success('Review submitted!');
    } catch (error) {
      toast.error('Failed to submit review');
    } finally {
      setIsSubmitting(false);
    }
  };

  const avgRating =
    localReviews.length > 0
      ? localReviews.reduce((sum, r) => sum + r.rating, 0) / localReviews.length
      : 0;

  return (
    <div className="space-y-6">
      {/* Summary */}
      {localReviews.length > 0 && (
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="text-4xl font-bold">{avgRating.toFixed(1)}</p>
            <StarRating rating={avgRating} size="sm" className="justify-center mt-1" />
            <p className="text-sm text-muted-foreground mt-1">{localReviews.length} reviews</p>
          </div>
        </div>
      )}

      {/* Write review */}
      {canReview && !showForm && (
        <Button variant="outline" onClick={() => setShowForm(true)}>
          Write a review
        </Button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-4 bg-muted/30 rounded-xl">
          <h4 className="font-semibold">Your Review</h4>
          <div>
            <label className="text-sm font-medium">Rating</label>
            <StarRating
              rating={rating}
              interactive
              size="lg"
              onRatingChange={(v) => setValue('rating', v)}
              className="mt-1"
            />
            {errors.rating && (
              <p className="text-xs text-destructive mt-1">{errors.rating.message}</p>
            )}
          </div>
          <div>
            <label htmlFor="review-body" className="text-sm font-medium mb-1 block">Your review</label>
            <Textarea
              id="review-body"
              placeholder="Share your experience..."
              rows={4}
              {...register('body')}
              className="resize-none"
            />
            {errors.body && (
              <p className="text-xs text-destructive mt-1">{errors.body.message}</p>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={isSubmitting} size="sm">
              {isSubmitting ? 'Submitting...' : 'Submit Review'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Reviews list */}
      <div className="space-y-5">
        {localReviews.map((review) => (
          <div key={review.id} className="space-y-2">
            <div className="flex items-start gap-3">
              <Avatar className="w-9 h-9 flex-shrink-0">
                <AvatarImage src={review.tourist?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(review.tourist?.full_name || 'U')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{review.tourist?.full_name || 'Anonymous'}</p>
                  <StarRating rating={review.rating} size="sm" />
                  <span className="text-xs text-muted-foreground">
                    {formatRelativeDate(review.created_at)}
                  </span>
                </div>
                {review.title && <p className="font-medium text-sm mt-0.5">{review.title}</p>}
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{review.body}</p>
                {review.photos.length > 0 && (
                  <div className="flex gap-2 mt-2">
                    {review.photos.slice(0, 3).map((url, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden">
                        <Image src={url} alt={`Review photo ${i + 1}`} fill sizes="64px" className="object-cover" />
                      </div>
                    ))}
                  </div>
                )}
                {review.provider_response && (
                  <div className="mt-2 p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs font-semibold text-muted-foreground mb-1">Provider response:</p>
                    <p className="text-sm">{review.provider_response}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {localReviews.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">
            No reviews yet. Be the first to share your experience!
          </p>
        )}
      </div>
    </div>
  );
}
