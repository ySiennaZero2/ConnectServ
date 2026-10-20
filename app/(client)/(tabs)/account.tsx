import { router, useFocusEffect, type Href } from 'expo-router';
import { Ban, ChevronRight, CircleHelp, LogOut, MapPin, MessageSquareText, ShieldCheck, Star, UserRound } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Alert, Image, Text, View } from 'react-native';

import { AnimatedPressable } from '@/components/common/AnimatedPressable';
import { ClientPersonalDataScreen } from '@/components/account/ClientPersonalDataScreen';
import { CommentsHistoryScreen } from '@/components/account/CommentsHistoryScreen';
import { HelpSupportScreen } from '@/components/account/HelpSupportScreen';
import { SecurityPrivacyScreen } from '@/components/account/SecurityPrivacyScreen';
import { Button } from '@/components/common/Button';
import { Screen } from '@/components/common/Screen';
import { colors } from '@/constants/theme';
import { authService, isSupabaseConfigured } from '@/services/auth';
import { useAppStore } from '@/store/useAppStore';
import { formatRating, getAverageRating, getReceivedReviews, getUserCancellations } from '@/utils/reputation';

const menuItems = [
  { id: 'personal', label: 'Dados pessoais', icon: UserRound },
  { id: 'history', label: 'Comentários e histórico', icon: MessageSquareText },
  { id: 'security', label: 'Segurança e privacidade', icon: ShieldCheck },
  { id: 'help', label: 'Ajuda e suporte', icon: CircleHelp },
] as const;

export default function ClientAccountScreen() {
  const currentUser = useAppStore((state) => state.currentUser);
  const logout = useAppStore((state) => state.logout);
  const reviews = useAppStore((state) => state.reviews);
  const cancellationRecords = useAppStore((state) => state.cancellationRecords);
  const [section, setSection] = useState<
    'personal' | 'history' | 'security' | 'help' | null
  >(null);

  useFocusEffect(
    useCallback(() => () => setSection(null), []),
  );

  const handleLogout = () => {
    Alert.alert('Sair da conta?', 'Você poderá entrar novamente quando quiser.', [
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

  const receivedReviews = currentUser ? getReceivedReviews(reviews, currentUser.id) : [];
  const cancellationCount = currentUser
    ? getUserCancellations(cancellationRecords, currentUser.id).length
    : 0;
  const rating = getAverageRating(receivedReviews);
  const openHistory = (tab: 'reviews' | 'cancellations') => {
    if (!currentUser) return;
    router.push({
      pathname: '/(client)/reputation/[userId]',
      params: { userId: currentUser.id, role: 'client', tab },
    } as unknown as Href);
  };

  if (section === 'personal') {
    return <ClientPersonalDataScreen onBack={() => setSection(null)} />;
  }
  if (section === 'history') {
    return <CommentsHistoryScreen role="client" onBack={() => setSection(null)} />;
  }
  if (section === 'security') {
    return (
      <SecurityPrivacyScreen
        role="client"
        onBack={() => setSection(null)}
        onAccountDeleted={handleAccountDeleted}
      />
    );
  }
  if (section === 'help') {
    return <HelpSupportScreen role="client" onBack={() => setSection(null)} />;
  }

  return (
    <Screen>
      <View className="px-5 pb-4 pt-5">
        <Text className="text-2xl font-extrabold text-slate-900">Minha conta</Text>
      </View>

      <View className="mx-5 mt-2 rounded-3xl bg-brand-700 p-5">
        <View className="flex-row items-center gap-4">
          {currentUser?.avatarUrl ? (
            <Image source={{ uri: currentUser.avatarUrl }} className="h-16 w-16 rounded-2xl border-2 border-white/20" />
          ) : (
            <View className="h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
              <Text className="text-2xl font-extrabold text-white">
                {currentUser?.fullName
                  .split(' ')
                  .slice(0, 2)
                  .map((part) => part[0])
                  .join('')}
              </Text>
            </View>
          )}
          <View className="flex-1">
            <Text className="text-xl font-extrabold text-white">{currentUser?.fullName}</Text>
            <Text className="mt-1 text-sm text-brand-200">{currentUser?.email}</Text>
            <View className="mt-2 flex-row items-center gap-1">
              <MapPin size={13} color={colors.brand200} />
              <Text className="text-xs text-brand-100">{currentUser?.city}</Text>
            </View>
          </View>
        </View>
        <View className="mt-4 flex-row gap-3">
          <AnimatedPressable
            accessibilityLabel="Abrir minhas avaliações"
            accessibilityRole="button"
            onPress={() => openHistory('reviews')}
            className="flex-1 flex-row items-center justify-center gap-2 rounded-2xl bg-white/10 px-3 py-3"
          >
            <Star size={16} color="#FBBF24" fill="#FBBF24" />
            <Text className="text-xs font-black text-white">
              {formatRating(rating)} · {receivedReviews.length} avaliações
            </Text>
          </AnimatedPressable>
          <AnimatedPressable
            accessibilityLabel="Abrir meus cancelamentos"
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
              onPress={() => setSection(item.id)}
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
        <Text className="mt-4 text-center text-xs text-slate-400">ConectaServ MVP · versão 0.1.0</Text>
      </View>
    </Screen>
  );
}
