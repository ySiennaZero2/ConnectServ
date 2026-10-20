import { router, useLocalSearchParams } from 'expo-router';

import { ReputationHistoryScreen } from '@/components/reputation/ReputationHistoryScreen';
import { useAppStore } from '@/store/useAppStore';
import type { ReputationTab, UserRole } from '@/types';

export default function ProviderReputationRoute() {
  const { userId, role, tab } = useLocalSearchParams<{
    userId: string;
    role?: UserRole;
    tab?: ReputationTab;
  }>();
  const currentUser = useAppStore((state) => state.currentUser);
  const request = useAppStore((state) =>
    state.serviceRequests.find((item) => item.clientId === userId),
  );
  const appointment = useAppStore((state) =>
    state.appointments.find((item) => item.clientId === userId || item.providerId === userId),
  );
  const provider = useAppStore((state) => state.providers.find((item) => item.id === userId));
  const profileRole: UserRole = role === 'client' ? 'client' : 'provider';
  const profileName =
    currentUser?.id === userId
      ? currentUser.fullName
      : provider?.fullName ?? request?.clientName ?? appointment?.clientName;

  return (
    <ReputationHistoryScreen
      userId={userId}
      profileName={profileName}
      profileRole={profileRole}
      initialTab={tab === 'cancellations' ? 'cancellations' : 'reviews'}
      onBack={() => router.back()}
    />
  );
}
