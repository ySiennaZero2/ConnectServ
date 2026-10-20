import { Tabs } from 'expo-router';
import { CalendarCheck2, Heart, House, Search, UserRound, UsersRound } from 'lucide-react-native';

import { SmoothTabBarButton } from '@/components/navigation/SmoothTabBarButton';
import { colors } from '@/constants/theme';

export default function ClientTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        animation: 'shift',
        headerShown: false,
        sceneStyle: { backgroundColor: colors.white },
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
        tabBarInactiveTintColor: colors.slate500,
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginBottom: 4 },
        tabBarItemStyle: { paddingTop: 2 },
        tabBarStyle: {
          height: 72,
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
        name="home"
        options={{
          title: 'Início',
          tabBarIcon: ({ color }) => <House size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Buscar',
          tabBarIcon: ({ color }) => <Search size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Serviços',
          tabBarIcon: ({ color }) => <CalendarCheck2 size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Comunidade',
          tabBarIcon: ({ color }) => <UsersRound size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favoritos',
          tabBarIcon: ({ color }) => <Heart size={22} color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <UserRound size={22} color={color} />,
        }}
      />
    </Tabs>
  );
}
