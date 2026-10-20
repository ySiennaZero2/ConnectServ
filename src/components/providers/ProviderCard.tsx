import { BadgeCheck, Building2, Clock3, Crown, Heart, MapPin, Star } from 'lucide-react-native';
import { Image, Text, View } from 'react-native';

import { AnimatedPressable } from '@/components/common/AnimatedPressable';
import { colors } from '@/constants/theme';
import type { ProviderProfile } from '@/types';
import { getProviderAvailabilityStatus } from '@/utils/availability';

type ProviderCardProps = {
  provider: ProviderProfile;
  onPress: () => void;
  favorite?: boolean;
  onToggleFavorite?: () => void;
};

export function ProviderCard({
  provider,
  onPress,
  favorite = false,
  onToggleFavorite,
}: ProviderCardProps) {
  const availabilityStatus = getProviderAvailabilityStatus(provider);

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={`Ver perfil de ${provider.fullName}`}
      onPress={onPress}
      pressedOpacity={0.93}
      pressedScale={0.985}
      className={`mb-3 rounded-2xl border bg-white p-3 active:bg-slate-50 ${
        provider.currentPlan === 'premium'
          ? 'border-amber-400'
          : provider.currentPlan === 'profissional'
            ? 'border-blue-200'
            : 'border-slate-100'
      }`}
      style={{ shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 }}
    >
      <View className="flex-row items-center gap-3">
        <View>
          <Image
            source={{ uri: provider.avatarUrl }}
            className="h-[68px] w-[68px] rounded-full bg-slate-200"
            accessibilityLabel={`Foto de ${provider.fullName}`}
          />
          <View
            className={`absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white ${
              provider.agendaOpen ? 'bg-emerald-500' : 'bg-slate-400'
            }`}
          />
        </View>

        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-1.5">
            <Text className="min-w-0 flex-shrink text-base font-extrabold text-slate-950" numberOfLines={1}>
              {provider.fullName}
            </Text>
            {provider.currentPlan === 'premium' ? (
              <Crown size={16} color="#D97706" fill="#FEF3C7" />
            ) : provider.currentPlan === 'profissional' ? (
              <BadgeCheck size={16} color="#2563EB" fill="#DBEAFE" />
            ) : null}
          </View>
          {provider.currentPlan !== 'gratuito' ? (
            <View className={`mt-1 self-start rounded-full px-2 py-1 ${provider.currentPlan === 'premium' ? 'bg-amber-100' : 'bg-blue-100'}`}>
              <Text className={`text-[9px] font-black ${provider.currentPlan === 'premium' ? 'text-amber-800' : 'text-blue-700'}`}>
                {provider.currentPlan === 'premium' ? 'SELO PREMIUM / PJ' : 'PROFISSIONAL VERIFICADO'}
              </Text>
            </View>
          ) : null}
          <Text className="mt-0.5 text-xs text-slate-500" numberOfLines={1}>
            {provider.profession}
          </Text>
          <View className="mt-2 flex-row items-center gap-1">
            <Star size={13} color="#FBBF24" fill="#FBBF24" />
            <Text className="text-xs font-extrabold text-slate-800">{provider.rating}</Text>
            <Text className="text-xs text-slate-400">({provider.reviewCount})</Text>
          </View>
          <View className="mt-1 flex-row items-center gap-1">
            <MapPin size={12} color={colors.slate500} />
            <Text className="text-xs text-slate-500">Base em {provider.city}</Text>
          </View>
        </View>

        <View className="h-[68px] items-end pl-1">
          <AnimatedPressable
            accessibilityRole="button"
            accessibilityLabel={favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            hitSlop={8}
            onPress={(event) => {
              event.stopPropagation();
              onToggleFavorite?.();
            }}
            pressedOpacity={0.65}
            pressedScale={0.82}
          >
            <Heart
              size={20}
              color={favorite ? colors.brand700 : colors.slate700}
              fill={favorite ? colors.brand700 : 'transparent'}
            />
          </AnimatedPressable>
        </View>
      </View>
      {provider.currentPlan === 'premium' && provider.documentType === 'CNPJ' && provider.companyAddress ? (
        <View className="mt-3 flex-row items-center gap-3 rounded-xl bg-amber-50 p-3">
          {provider.storefrontImageUrl ? (
            <Image source={{ uri: provider.storefrontImageUrl }} className="h-12 w-14 rounded-lg bg-amber-100" />
          ) : (
            <View className="h-12 w-14 items-center justify-center rounded-lg bg-amber-100">
              <Building2 size={21} color="#D97706" />
            </View>
          )}
          <View className="flex-1">
            <Text className="text-[10px] font-black uppercase text-amber-800">Endereço físico</Text>
            <Text className="mt-0.5 text-xs text-amber-900" numberOfLines={2}>
              {provider.companyAddress.street}, {provider.companyAddress.number} · {provider.companyAddress.city}
            </Text>
          </View>
        </View>
      ) : null}
      <View
        className={`mt-3 flex-row items-center gap-2 rounded-xl px-3 py-2 ${
          availabilityStatus.available ? 'bg-emerald-50' : 'bg-slate-100'
        }`}
      >
        <Clock3
          size={14}
          color={availabilityStatus.available ? colors.success : colors.slate500}
        />
        <Text
          className={`text-xs font-bold ${
            availabilityStatus.available ? 'text-emerald-700' : 'text-slate-500'
          }`}
        >
          {availabilityStatus.label}
        </Text>
      </View>
    </AnimatedPressable>
  );
}
