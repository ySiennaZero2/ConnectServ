import { router, useLocalSearchParams, type Href } from 'expo-router';

import { ClientPublicProfileScreen } from '@/components/clients/ClientPublicProfileScreen';
import type { ReputationTab } from '@/types';

export default function ProviderClientProfileRoute() {
  const { clientId } = useLocalSearchParams<{ clientId: string }>();

  const openHistory = (tab: ReputationTab) => {
    router.push({
      pathname: '/(provider)/reputation/[userId]',
      params: { userId: clientId, role: 'client', tab },
    } as unknown as Href);
  };

  return (
    <ClientPublicProfileScreen
      clientId={clientId}
      onBack={() => router.back()}
      onOpenHistory={openHistory}
    />
  );
}
