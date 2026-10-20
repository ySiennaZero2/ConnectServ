import { Redirect } from 'expo-router';

import { useAppStore } from '@/store/useAppStore';

export default function IndexScreen() {
  const currentUser = useAppStore((state) => state.currentUser);

  if (!currentUser) return <Redirect href="/welcome" />;
  return currentUser.role === 'client' ? (
    <Redirect href="/(client)/(tabs)/home" />
  ) : (
    <Redirect href="/(provider)/(tabs)/dashboard" />
  );
}
