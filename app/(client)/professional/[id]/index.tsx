import { router, useLocalSearchParams, type Href } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  BadgeCheck,
  Building2,
  Check,
  Clock3,
  Crown,
  Heart,
  LockKeyhole,
  PaintRoller,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  Wrench,
  Zap,
} from 'lucide-react-native';
import { Image, ScrollView, Share, Text, View } from 'react-native';

import { AnimatedPressable } from '@/components/common/AnimatedPressable';
import { Screen } from '@/components/common/Screen';
import { colors } from '@/constants/theme';
import { getServicePresentation } from '@/data/serviceCatalog';
import { useAppStore } from '@/store/useAppStore';
import {
  formatAvailabilityDays,
  formatBusinessHour,
  getProviderAvailabilityStatus,
} from '@/utils/availability';

const serviceIcons = {
  cleaning: Sparkles,
  plumbing: Wrench,
  electrical: Zap,
  furniture: PaintRoller,
  general: Wrench,
};

const trustItems = [
  { icon: Clock3, label: 'Atendimento\nrápido' },
  { icon: ShieldCheck, label: 'Profissional\nverificado' },
  { icon: LockKeyhole, label: 'Pagamento\nseguro' },
  { icon: BadgeCheck, label: 'Garantia do\nserviço' },
];

export default function ProfessionalProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const provider = useAppStore((state) => state.providers.find((item) => item.id === id));
  const favoriteProviderIds = useAppStore((state) => state.favoriteProviderIds);
  const toggleFavoriteProvider = useAppStore((state) => state.toggleFavoriteProvider);
  const cancellationRecords = useAppStore((state) => state.cancellationRecords);

  if (!provider) {
    return (
      <Screen className="bg-white">
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-lg font-bold text-slate-900">Profissional não encontrado</Text>
        </View>
      </Screen>
    );
  }

  const service = getServicePresentation(provider.profession);
  const ServiceIcon = serviceIcons[service.kind];
  const favorite = favoriteProviderIds.includes(provider.id);
  const accentColor = service.accent === 'green' ? '#059669' : colors.brand700;
  const heroBackground = service.accent === 'green' ? 'bg-emerald-50' : 'bg-brand-50';
  const availabilityStatus = getProviderAvailabilityStatus(provider);
  const cancellationCount = cancellationRecords.filter(
    (record) => record.providerId === provider.id,
  ).length;
  const openHistory = (tab: 'reviews' | 'cancellations') =>
    router.push({
      pathname: '/(client)/reputation/[userId]',
      params: { userId: provider.id, role: 'provider', tab },
    } as unknown as Href);

  const shareService = async () => {
    await Share.share({
      message: `Conheça ${provider.fullName}, profissional de ${service.title}, no ConectaServ.`,
    });
  };

  return (
    <Screen bottomInset className="bg-white">
      <View className="flex-row items-center justify-between px-5 py-3">
        <AnimatedPressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => router.back()}
          pressedScale={0.88}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-slate-100"
        >
          <ArrowLeft size={23} color={colors.slate900} />
        </AnimatedPressable>
        <Text className="flex-1 text-center text-base font-black text-slate-950" numberOfLines={1}>
          {service.title}
        </Text>
        <View className="flex-row">
          <AnimatedPressable
            accessibilityLabel="Compartilhar serviço"
            accessibilityRole="button"
            onPress={shareService}
            pressedScale={0.88}
            className="h-10 w-10 items-center justify-center rounded-full active:bg-slate-100"
          >
            <Share2 size={21} color={colors.slate900} />
          </AnimatedPressable>
          <AnimatedPressable
            accessibilityLabel={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            accessibilityRole="button"
            onPress={() => toggleFavoriteProvider(provider.id)}
            pressedScale={0.82}
            className="h-10 w-10 items-center justify-center rounded-full active:bg-slate-100"
          >
            <Heart size={22} color={favorite ? colors.brand700 : colors.slate900} fill={favorite ? colors.brand700 : 'transparent'} />
          </AnimatedPressable>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-5 pb-5">
        <View className={`h-52 items-center justify-center overflow-hidden rounded-[28px] ${heroBackground}`}>
          <View className={`absolute -bottom-16 -left-10 h-40 w-40 rounded-full ${service.accent === 'green' ? 'bg-emerald-100/60' : 'bg-brand-100/60'}`} />
          <View className={`absolute -right-8 top-8 h-24 w-24 rounded-full ${service.accent === 'green' ? 'bg-emerald-100/50' : 'bg-brand-100/50'}`} />
          <ServiceIcon size={104} strokeWidth={1.7} color={accentColor} />
        </View>

        <Text className="mt-5 text-2xl font-black text-slate-950">{service.title}</Text>
        <View className="mt-3 flex-row gap-2">
          <AnimatedPressable
            accessibilityLabel={`Abrir avaliações de ${provider.fullName}`}
            accessibilityRole="button"
            onPress={() => openHistory('reviews')}
            className="flex-row items-center gap-1.5 rounded-full bg-amber-50 px-3 py-2"
          >
            <Star size={17} color="#FBBF24" fill="#FBBF24" />
            <Text className="font-black text-slate-900">{provider.rating}</Text>
            <Text className="text-xs text-slate-500">({provider.reviewCount})</Text>
          </AnimatedPressable>
          <AnimatedPressable
            accessibilityLabel={`Abrir cancelamentos de ${provider.fullName}`}
            accessibilityRole="button"
            onPress={() => openHistory('cancellations')}
            className="flex-row items-center gap-1.5 rounded-full bg-red-50 px-3 py-2"
          >
            <Ban size={16} color={colors.danger} />
            <Text className="text-xs font-black text-red-700">{cancellationCount} cancelamentos</Text>
          </AnimatedPressable>
        </View>
        <View
          className={`mt-4 rounded-2xl px-4 py-3 ${
            availabilityStatus.available ? 'bg-emerald-50' : 'bg-slate-100'
          }`}
        >
          <View className="flex-row items-center gap-2">
            <Clock3
              size={17}
              color={availabilityStatus.available ? colors.success : colors.slate500}
            />
            <Text
              className={`font-extrabold ${
                availabilityStatus.available ? 'text-emerald-700' : 'text-slate-600'
              }`}
            >
              {availabilityStatus.label}
            </Text>
          </View>
          <Text className="mt-1.5 text-xs text-slate-500">
            {formatAvailabilityDays(provider.availability.weekdays)} · das{' '}
            {formatBusinessHour(provider.availability.startTime)} às{' '}
            {formatBusinessHour(provider.availability.endTime)}
          </Text>
        </View>

        <View className="mt-6 flex-row justify-between">
          {trustItems.map((item) => {
            const Icon = item.icon;
            return (
              <View key={item.label} className="w-[23%] items-center rounded-2xl bg-slate-50 px-1 py-3">
                <Icon size={21} color={accentColor} />
                <Text className="mt-2 text-center text-[9px] font-bold leading-3 text-slate-700">{item.label}</Text>
              </View>
            );
          })}
        </View>

        <View className="mt-7">
          <Text className="text-base font-black text-slate-950">Descrição</Text>
          <Text className="mt-3 text-sm leading-6 text-slate-600">{service.description}</Text>
        </View>

        <View className="mt-6 flex-row items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3">
          <Image source={{ uri: provider.avatarUrl }} className="h-14 w-14 rounded-full bg-slate-200" />
          <View className="flex-1">
            <View className="flex-row items-center gap-1.5">
              <Text className="font-black text-slate-950">{provider.fullName}</Text>
              {provider.currentPlan === 'premium' ? (
                <Crown size={17} color="#D97706" fill="#FEF3C7" />
              ) : provider.currentPlan === 'profissional' ? (
                <BadgeCheck size={16} color="#2563EB" fill="#DBEAFE" />
              ) : null}
            </View>
            <Text className="mt-1 text-xs text-slate-500">{provider.profession} · Base em {provider.city}</Text>
            {provider.currentPlan !== 'gratuito' ? (
              <Text className={`mt-1 text-[10px] font-black uppercase ${provider.currentPlan === 'premium' ? 'text-amber-700' : 'text-blue-700'}`}>
                {provider.currentPlan === 'premium' ? 'Selo Premium / PJ' : 'Profissional Verificado'}
              </Text>
            ) : null}
          </View>
          <ArrowRight size={19} color={colors.brand700} />
        </View>

        {provider.currentPlan === 'premium' && provider.documentType === 'CNPJ' && provider.companyAddress ? (
          <View className="mt-4 overflow-hidden rounded-3xl border border-amber-300 bg-amber-50">
            {provider.storefrontImageUrl ? (
              <Image source={{ uri: provider.storefrontImageUrl }} className="h-36 w-full bg-amber-100" />
            ) : null}
            <View className="flex-row gap-3 p-4">
              <Building2 size={22} color="#D97706" />
              <View className="flex-1">
                <Text className="font-black text-amber-950">{provider.tradeName ?? provider.fullName}</Text>
                <Text className="mt-1 text-xs leading-5 text-amber-800">
                  {provider.companyAddress.street}, {provider.companyAddress.number} · {provider.companyAddress.district}, {provider.companyAddress.city}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        <View className="mt-6">
          <Text className="text-base font-black text-slate-950">Cidades atendidas</Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            {provider.serviceCities.map((city) => (
              <View key={city} className="rounded-full bg-brand-50 px-3 py-2">
                <Text className="text-xs font-bold text-brand-700">{city}</Text>
              </View>
            ))}
          </View>
        </View>

        <View className="mt-7">
          <Text className="text-base font-black text-slate-950">Serviços incluídos</Text>
          <View className="mt-3 gap-3">
            {service.included.map((item) => (
              <View key={item} className="flex-row items-center gap-2.5">
                <View className={`h-5 w-5 items-center justify-center rounded-full ${service.accent === 'green' ? 'bg-emerald-600' : 'bg-brand-600'}`}>
                  <Check size={13} color={colors.white} strokeWidth={3} />
                </View>
                <Text className="flex-1 text-sm text-slate-700">{item}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View className="border-t border-slate-100 bg-white px-5 pb-2 pt-3">
        <AnimatedPressable
          disabled={!provider.agendaOpen}
          onPress={() =>
            router.push({
              pathname: '/(client)/professional/[id]/booking',
              params: { id: provider.id },
            })
          }
          pressedOpacity={0.88}
          pressedScale={0.98}
          className={`min-h-14 items-center justify-center rounded-2xl ${
            provider.agendaOpen
              ? service.accent === 'green'
                ? 'bg-emerald-600 active:bg-emerald-700'
                : 'bg-brand-600 active:bg-brand-700'
              : 'bg-slate-300'
          }`}
        >
          <Text className="text-base font-black text-white">
            {provider.agendaOpen ? 'Solicitar este serviço' : 'Agenda indisponível'}
          </Text>
        </AnimatedPressable>
        <View className="mt-2 flex-row items-center justify-center gap-2">
          <ShieldCheck size={15} color={colors.slate500} />
          <Text className="text-xs text-slate-500">Seus dados estão protegidos</Text>
        </View>
      </View>
    </Screen>
  );
}
