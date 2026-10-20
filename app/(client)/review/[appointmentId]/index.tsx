import { router, useLocalSearchParams } from 'expo-router';

import { ReviewForm } from '@/components/booking/ReviewForm';

export default function ClientReviewScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId: string }>();

  return (
    <ReviewForm
      appointmentId={appointmentId}
      viewerRole="client"
      onBack={() => router.back()}
      onDone={() => router.replace('/(client)/(tabs)/bookings')}
    />
  );
}
