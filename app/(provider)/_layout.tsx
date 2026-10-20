import { Redirect, Stack } from 'expo-router';

import { useAppStore } from '@/store/useAppStore';

export default function ProviderLayout() {
  const currentUser = useAppStore((state) => state.currentUser);

  if (!currentUser) return <Redirect href="/welcome" />;
  if (currentUser.role !== 'provider') {
    return <Redirect href="/(client)/(tabs)/home" />;
  }

  return (
    <Stack
      screenOptions={{
        animation: 'slide_from_right',
        fullScreenGestureEnabled: true,
        gestureEnabled: true,
        headerShown: false,
      }}
    >
      <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
      <Stack.Screen name="plans" options={{ animation: 'fade_from_bottom' }} />
      <Stack.Screen name="request/[requestId]/index" />
      <Stack.Screen name="client/[clientId]/index" />
      <Stack.Screen name="reputation/[userId]" />
      <Stack.Screen name="review/[appointmentId]/index" options={{ animation: 'fade_from_bottom' }} />
    </Stack>
  );
}
