import { router } from 'expo-router';

import { PlansScreen } from '@/components/subscriptions/PlansScreen';

export default function ProviderPlansRoute() {
  return <PlansScreen onBack={() => router.back()} />;
}
