import { router, useLocalSearchParams } from 'expo-router';

import { ReputationHistoryScreen } from '@/components/reputation/ReputationHistoryScreen';
import { useAppStore } from '@/store/useAppStore';
import type { ReputationTab, UserRole } from '@/types';

export default function ClientReputationRoute() {
  const { userId, role, tab } = useLocalSearchParams<{
    userId: string;
    role?: UserRole;
    tab?: ReputationTab;
  }>();
  const currentUser = useAppStore((state) => state.currentUser);
  const provider = useAppStore((state) => state.providers.find((item) => item.id === userId));

  return (
    <ReputationHistoryScreen
      userId={userId}
      profileName={currentUser?.id === userId ? currentUser.fullName : provider?.fullName}
      profileRole={role === 'provider' ? 'provider' : 'client'}
      initialTab={tab === 'cancellations' ? 'cancellations' : 'reviews'}
      onBack={() => router.back()}
    />
  );
}
