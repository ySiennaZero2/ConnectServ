import { router, useLocalSearchParams } from 'expo-router';

import { ReviewForm } from '@/components/booking/ReviewForm';

export default function ProviderReviewScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();

  return (
    <ReviewForm
      appointmentId={appointmentId}
      viewerRole="provider"
      onBack={() => router.back()}
      onDone={() => router.replace('/(provider)/(tabs)/dashboard')}
    />
  );
}
