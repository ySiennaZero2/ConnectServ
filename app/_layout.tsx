import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { BriefcaseBusiness } from 'lucide-react-native';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Logo } from '@/components/common/Logo';
import { colors } from '@/constants/theme';
import { startSupabaseAuthDeepLinkListener } from '@/lib/supabase';
import { useAppStore } from '@/store/useAppStore';

export default function RootLayout() {
  const hasHydrated = useAppStore((state) => state.hasHydrated);
  const setHasHydrated = useAppStore((state) => state.setHasHydrated);

  useEffect(() => {
    const fallback = setTimeout(() => setHasHydrated(true), 1500);
    return () => clearTimeout(fallback);
  }, [setHasHydrated]);

  useEffect(() => startSupabaseAuthDeepLinkListener(), []);

  if (!hasHydrated) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>
          <View className="flex-1 items-center justify-center bg-brand-700 px-8">
            <Logo inverted />
            <View className="mt-8 flex-row items-center gap-2 rounded-full bg-white/10 px-4 py-2">
              <BriefcaseBusiness size={16} color={colors.brand100} />
              <Text className="text-sm font-medium text-brand-100">Preparando seu espaço...</Text>
            </View>
          </View>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            animation: 'fade',
            contentStyle: { backgroundColor: colors.slate50 },
            fullScreenGestureEnabled: true,
            gestureEnabled: true,
            headerShown: false,
          }}
        >
          <Stack.Screen name="index" options={{ animation: 'none' }} />
          <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
          <Stack.Screen name="role-selection" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="auth" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen name="confirm-email" options={{ animation: 'fade' }} />
          <Stack.Screen name="(client)" options={{ animation: 'fade' }} />
          <Stack.Screen name="(provider)" options={{ animation: 'fade' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
