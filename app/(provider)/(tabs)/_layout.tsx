import { Tabs } from 'expo-router';
import { BriefcaseBusiness, LayoutDashboard, UserRound, UsersRound } from 'lucide-react-native';

import { SmoothTabBarButton } from '@/components/navigation/SmoothTabBarButton';
import { colors } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';

export default function ProviderTabsLayout() {
  const pendingCount = useAppStore((state) =>
    state.appointments.filter(
      (appointment) =>
        appointment.providerId === state.currentUser?.id && appointment.status === 'pending',
    ).length,
  );
  const communityCount = useAppStore((state) => {
    const provider = state.providers.find((item) => item.id === state.currentUser?.id);
    if (!provider || !provider.agendaOpen || provider.profileHidden) return 0;

    return state.serviceRequests.filter(
      (request) =>
        request.status === 'open' &&
        provider.serviceCities.some((city) => city === request.city) &&
        !state.serviceQuotes.some(
          (quote) =>
            quote.requestId === request.id && quote.providerId === state.currentUser?.id,
        ),
    ).length;
  });

  return (
    <Tabs
      screenOptions={{
        animation: 'shift',
        headerShown: false,
        sceneStyle: { backgroundColor: colors.slate50 },
        tabBarActiveTintColor: colors.brand700,
        tabBarButton: ({
          accessibilityLabel,
          accessibilityState,
          children,
          onLongPress,
          onPress,
          style,
          testID,
        }) => (
          <SmoothTabBarButton
            accessibilityLabel={accessibilityLabel}
            accessibilityState={accessibilityState}
            onLongPress={onLongPress}
            onPress={onPress}
            style={style}
            testID={testID}
          >
            {children}
          </SmoothTabBarButton>
        ),
        tabBarHideOnKeyboard: true,
        tabBarInactiveTintColor: colors.slate400,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', marginBottom: 3 },
        tabBarItemStyle: { paddingTop: 2 },
        tabBarStyle: {
          height: 68,
          paddingTop: 8,
          backgroundColor: colors.white,
          borderTopColor: colors.slate100,
          shadowColor: colors.slate900,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.04,
          shadowRadius: 12,
          elevation: 8,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Solicitações',
          tabBarBadge: pendingCount || undefined,
          tabBarBadgeStyle: { backgroundColor: colors.danger, fontSize: 10 },
          tabBarIcon: ({ color }) => <LayoutDashboard size={23} color={color} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Comunidade',
          tabBarBadge: communityCount || undefined,
          tabBarBadgeStyle: { backgroundColor: colors.danger, fontSize: 10 },
          tabBarIcon: ({ color }) => <UsersRound size={23} color={color} />,
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Meu perfil',
          tabBarIcon: ({ color }) => <BriefcaseBusiness size={23} color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Minha conta',
          tabBarIcon: ({ color }) => <UserRound size={23} color={color} />,
        }}
      />
    </Tabs>
  );
}
