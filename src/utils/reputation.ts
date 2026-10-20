import type { CancellationRecord, PublicClientProfile, Review } from '@/types';

export function getReceivedReviews(reviews: Review[], userId: string) {
  return reviews.filter((review) => review.reviewedId === userId);
}

export function getUserCancellations(records: CancellationRecord[], userId: string) {
  return records.filter(
    (record) => record.clientId === userId || record.providerId === userId,
  );
}

export function getAverageRating(reviews: Review[]) {
  if (!reviews.length) return null;
  return reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
}

export function formatRating(rating: number | null) {
  return rating === null ? 'Novo' : rating.toFixed(1).replace('.', ',');
}

export function buildPublicClientProfile(input: {
  clientId: string;
  fallbackName?: string;
  fallbackCity?: string;
  avatarUrl?: string;
  reviews: Review[];
  cancellations: CancellationRecord[];
  completedServiceCount: number;
}): PublicClientProfile {
  const receivedReviews = getReceivedReviews(input.reviews, input.clientId);
  const cancellations = getUserCancellations(input.cancellations, input.clientId);

  return {
    id: input.clientId,
    fullName: input.fallbackName ?? 'Cliente ConectaServ',
    city: input.fallbackCity,
    avatarUrl: input.avatarUrl,
    rating: getAverageRating(receivedReviews),
    reviewCount: receivedReviews.length,
    cancellationCount: cancellations.length,
    completedServiceCount: input.completedServiceCount,
  };
}
