import { router, useFocusEffect, type Href } from 'expo-router';
import { Ban, ChevronRight, CircleHelp, Crown, LogOut, MessageSquareText, Settings2, ShieldCheck, Star, UserRound, WalletCards } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Alert, Image, ScrollView, Text, View } from 'react-native';

import { HelpSupportScreen } from '@/components/account/HelpSupportScreen';
import { CommentsHistoryScreen } from '@/components/account/CommentsHistoryScreen';
import { ProviderRegistrationDataScreen } from '@/components/account/ProviderRegistrationDataScreen';
import { SecurityPrivacyScreen } from '@/components/account/SecurityPrivacyScreen';
import { AnimatedPressable } from '@/components/common/AnimatedPressable';
import { Button } from '@/components/common/Button';
import { Screen } from '@/components/common/Screen';
import { ProviderFinancialDashboard } from '@/components/finance/ProviderFinancialDashboard';
import { colors } from '@/constants/theme';
import { getSubscriptionPlan } from '@/data/subscriptionPlans';
import { authService, isSupabaseConfigured } from '@/services/auth';
import { useAppStore } from '@/store/useAppStore';

const menuItems = [
  { id: 'plans', label: 'Meus Planos / Seja Premium', icon: Crown },
  { id: 'registration', label: 'Dados pessoais e jurídicos', icon: UserRound },
  { id: 'history', label: 'Comentários e histórico', icon: MessageSquareText },
  { id: 'professional', label: 'Configurações profissionais', icon: Settings2 },
  { id: 'payments', label: 'Pagamentos e recebimentos', icon: WalletCards },
  { id: 'security', label: 'Segurança e privacidade', icon: ShieldCheck },
  { id: 'help', label: 'Ajuda e suporte', icon: CircleHelp },
] as const;

export default function ProviderAccountScreen() {
  const currentUser = useAppStore((state) => state.currentUser);
  const provider = useAppStore((state) =>
    state.providers.find((item) => item.id === state.currentUser?.id),
  );
  const logout = useAppStore((state) => state.logout);
  const appointments = useAppStore((state) => state.appointments);
  const cancellationRecords = useAppStore((state) => state.cancellationRecords);
  const [section, setSection] = useState<
    'registration' | 'history' | 'payments' | 'security' | 'help' | null
  >(null);

  useFocusEffect(
    useCallback(() => () => setSection(null), []),
  );

  const handleLogout = () => {
    Alert.alert('Sair da conta?', 'Você deixará de receber atualizações até entrar novamente.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          if (isSupabaseConfigured) {
            try {
              await authService.signOut();
            } catch {
              // A sessão local ainda deve ser encerrada se a rede falhar.
            }
          }
          logout();
          router.replace('/welcome');
        },
      },
    ]);
  };

  const handleAccountDeleted = () => {
    logout();
    router.replace('/welcome');
  };

  const cancellationCount = currentUser
    ? cancellationRecords.filter(
        (record) => record.clientId === currentUser.id || record.providerId === currentUser.id,
      ).length
    : 0;
  const openHistory = (tab: 'reviews' | 'cancellations') => {
    if (!currentUser) return;
    router.push({
      pathname: '/(provider)/reputation/[userId]',
      params: { userId: currentUser.id, role: 'provider', tab },
    } as unknown as Href);
  };

  if (section === 'registration') {
    return <ProviderRegistrationDataScreen onBack={() => setSection(null)} />;
  }
  if (section === 'history') {
    return <CommentsHistoryScreen role="provider" onBack={() => setSection(null)} />;
  }

  if (section === 'payments') {
    return (
      <ProviderFinancialDashboard
        appointments={appointments.filter(
          (appointment) => appointment.providerId === currentUser?.id,
        )}
        currentPlan={provider?.currentPlan ?? 'gratuito'}
        onBack={() => setSection(null)}
      />
    );
  }
  if (section === 'security') {
    return (
      <SecurityPrivacyScreen
        role="provider"
        onBack={() => setSection(null)}
        onAccountDeleted={handleAccountDeleted}
      />
    );
  }
  if (section === 'help') {
    return <HelpSupportScreen role="provider" onBack={() => setSection(null)} />;
  }

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerClassName="flex-grow pb-4"
      >
      <View className="px-5 pb-4 pt-5">
        <Text className="text-2xl font-extrabold text-slate-900">Minha conta</Text>
      </View>

      <View className="mx-5 mt-2 rounded-3xl bg-brand-700 p-5">
        <View className="flex-row items-center gap-4">
          {provider?.avatarUrl ? (
            <Image source={{ uri: provider.avatarUrl }} className="h-20 w-20 rounded-3xl border-2 border-white/20" />
          ) : null}
          <View className="flex-1">
            <Text className="text-xs font-bold uppercase tracking-wider text-brand-200">Conta profissional</Text>
            <Text className="mt-2 text-xl font-extrabold text-white">{currentUser?.fullName}</Text>
            <Text className="mt-1 text-sm text-brand-100">{provider?.profession}</Text>
            {provider ? (
              <View className="mt-2 self-start rounded-full bg-white/15 px-3 py-1">
                <Text className="text-[10px] font-black uppercase text-white">
                  Plano {getSubscriptionPlan(provider.currentPlan).name}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
        {provider?.profileHidden ? (
          <View className="mt-3 self-start rounded-full bg-amber-400/20 px-3 py-1.5">
            <Text className="text-xs font-extrabold text-amber-100">Modo férias ativo</Text>
          </View>
        ) : null}
        <View className="mt-4 flex-row gap-3">
          <AnimatedPressable
            accessibilityLabel="Abrir avaliações profissionais"
            accessibilityRole="button"
            onPress={() => openHistory('reviews')}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-white/10 px-3 py-3"
          >
            <Star size={16} color="#FBBF24" fill="#FBBF24" />
            <Text className="text-xs font-black text-white">{provider?.rating} · {provider?.reviewCount} avaliações</Text>
          </AnimatedPressable>
          <AnimatedPressable
            accessibilityLabel="Abrir cancelamentos profissionais"
            accessibilityRole="button"
            onPress={() => openHistory('cancellations')}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-white/10 px-3 py-3"
          >
            <Ban size={16} color="#FCA5A5" />
            <Text className="text-xs font-black text-white">{cancellationCount} cancelamentos</Text>
          </AnimatedPressable>
        </View>
      </View>

      <View className="mx-5 mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <AnimatedPressable
              key={item.label}
              accessibilityRole="button"
              onPress={() => {
                if (item.id === 'plans') {
                  router.push('/(provider)/plans' as unknown as Href);
                  return;
                }
                if (item.id === 'payments') {
                  setSection('payments');
                  return;
                }
                if (item.id === 'professional') {
                  router.navigate('/(provider)/(tabs)/portfolio');
                  return;
                }
                setSection(item.id);
              }}
              pressedOpacity={0.82}
              pressedScale={0.985}
              className={`flex-row items-center gap-3 px-4 py-4 active:bg-slate-50 ${
                index < menuItems.length - 1 ? 'border-b border-slate-100' : ''
              }`}
            >
              <View className="h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                <Icon size={20} color={colors.brand700} />
              </View>
              <Text className="flex-1 font-semibold text-slate-700">{item.label}</Text>
              <ChevronRight size={19} color={colors.slate400} />
            </AnimatedPressable>
          );
        })}
      </View>

      <View className="mx-5 mt-auto pb-6 pt-8">
        <Button
          label="Sair da conta"
          variant="danger"
          icon={<LogOut size={19} color={colors.danger} />}
          onPress={handleLogout}
        />
        <Text className="mt-4 text-center text-xs text-slate-400">ConectaServ Profissional · MVP 0.1.0</Text>
      </View>
      </ScrollView>
    </Screen>
  );
}
