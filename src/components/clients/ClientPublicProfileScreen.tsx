import { ArrowLeft, Ban, BriefcaseBusiness, MapPin, ShieldCheck, Star } from 'lucide-react-native';
import { Image, ScrollView, Text, View } from 'react-native';

import { AnimatedPressable } from '@/components/common/AnimatedPressable';
import { EmptyState } from '@/components/common/EmptyState';
import { Screen } from '@/components/common/Screen';
import { colors } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';
import type { ReputationTab } from '@/types';
import { buildPublicClientProfile, formatRating } from '@/utils/reputation';

type ClientPublicProfileScreenProps = {
  clientId: string;
  onBack: () => void;
  onOpenHistory: (tab: ReputationTab) => void;
};

export function ClientPublicProfileScreen({
  clientId,
  onBack,
  onOpenHistory,
}: ClientPublicProfileScreenProps) {
  const currentUser = useAppStore((state) => state.currentUser);
  const serviceRequests = useAppStore((state) => state.serviceRequests);
  const appointments = useAppStore((state) => state.appointments);
  const reviews = useAppStore((state) => state.reviews);
  const cancellations = useAppStore((state) => state.cancellationRecords);
  const request = serviceRequests.find((item) => item.clientId === clientId);
  const appointment = appointments.find((item) => item.clientId === clientId);
  const isCurrentUser = currentUser?.id === clientId;
  const profile = buildPublicClientProfile({
    clientId,
    fallbackName: isCurrentUser ? currentUser.fullName : request?.clientName ?? appointment?.clientName,
    fallbackCity: isCurrentUser ? currentUser.city : request?.city,
    avatarUrl: isCurrentUser ? currentUser.avatarUrl : undefined,
    reviews,
    cancellations,
    completedServiceCount: appointments.filter(
      (item) => item.clientId === clientId && item.status === 'completed',
    ).length,
  });

  if (!request && !appointment && !isCurrentUser) {
    return (
      <Screen className="bg-white">
        <View className="px-5 pt-4">
          <BackButton onPress={onBack} />
        </View>
        <View className="flex-1 items-center justify-center px-5">
          <EmptyState
            icon={<ShieldCheck size={28} color={colors.brand700} />}
            title="Perfil indisponível"
            description="Não encontramos dados públicos deste cliente."
          />
        </View>
      </Screen>
    );
  }

  const initials = profile.fullName
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('');

  return (
    <Screen className="bg-slate-50">
      <View className="flex-row items-center border-b border-slate-100 bg-white px-5 py-3">
        <BackButton onPress={onBack} />
        <Text className="flex-1 pr-10 text-center text-base font-black text-slate-950">Perfil do cliente</Text>
      </View>
      <ScrollView contentContainerClassName="px-5 pb-8" showsVerticalScrollIndicator={false}>
        <View className="mt-5 items-center rounded-[32px] bg-brand-700 px-5 py-7">
          {profile.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} className="h-24 w-24 rounded-3xl border-4 border-white/20" />
          ) : (
            <View className="h-24 w-24 items-center justify-center rounded-3xl border-4 border-white/20 bg-white/20">
              <Text className="text-3xl font-black text-white">{initials}</Text>
            </View>
          )}
          <Text className="mt-4 text-2xl font-black text-white">{profile.fullName}</Text>
          {profile.city ? (
            <View className="mt-2 flex-row items-center gap-1.5">
              <MapPin size={14} color={colors.brand200} />
              <Text className="text-sm font-semibold text-brand-100">{profile.city}</Text>
            </View>
          ) : null}

          <View className="mt-5 w-full flex-row gap-3">
            <AnimatedPressable
              accessibilityLabel="Abrir avaliações do cliente"
              accessibilityRole="button"
              onPress={() => onOpenHistory('reviews')}
              className="flex-1 items-center rounded-2xl bg-white/15 px-3 py-3"
            >
              <View className="flex-row items-center gap-1.5">
                <Star size={16} color="#FBBF24" fill="#FBBF24" />
                <Text className="font-black text-white">{formatRating(profile.rating)}</Text>
              </View>
              <Text className="mt-1 text-[10px] font-bold text-brand-100">
                {profile.reviewCount} avaliações
              </Text>
            </AnimatedPressable>
            <AnimatedPressable
              accessibilityLabel="Abrir cancelamentos do cliente"
              accessibilityRole="button"
              onPress={() => onOpenHistory('cancellations')}
              className="flex-1 items-center rounded-2xl bg-white/15 px-3 py-3"
            >
              <View className="flex-row items-center gap-1.5">
                <Ban size={16} color="#FCA5A5" />
                <Text className="font-black text-white">{profile.cancellationCount}</Text>
              </View>
              <Text className="mt-1 text-[10px] font-bold text-brand-100">cancelamentos</Text>
            </AnimatedPressable>
          </View>
        </View>

        <View className="mt-5 rounded-3xl border border-slate-100 bg-white p-5">
          <View className="flex-row items-center gap-3">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50">
              <BriefcaseBusiness size={21} color={colors.success} />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-bold uppercase tracking-wide text-slate-400">Serviços concluídos</Text>
              <Text className="mt-1 text-xl font-black text-slate-900">{profile.completedServiceCount}</Text>
            </View>
          </View>
        </View>

        <View className="mt-4 flex-row gap-3 rounded-2xl bg-brand-50 p-4">
          <ShieldCheck size={21} color={colors.brand700} />
          <Text className="flex-1 text-sm leading-5 text-brand-900">
            Este resumo mostra somente reputação e histórico relacionados a serviços no ConectaServ. Dados pessoais permanecem protegidos.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <AnimatedPressable
      accessibilityLabel="Voltar"
      accessibilityRole="button"
      onPress={onPress}
      className="h-10 w-10 items-center justify-center rounded-full active:bg-slate-100"
    >
      <ArrowLeft size={23} color={colors.slate900} />
    </AnimatedPressable>
  );
}
