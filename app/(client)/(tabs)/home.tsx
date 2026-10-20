import { router } from 'expo-router';
import {
  ArrowRight,
  Bell,
  Grid2X2,
  MessageSquareQuote,
  PaintRoller,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Wrench,
  Zap,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';

import { AnimatedPressable } from '@/components/common/AnimatedPressable';
import { CitySelector } from '@/components/common/CitySelector';
import { Screen } from '@/components/common/Screen';
import { ProviderCard } from '@/components/providers/ProviderCard';
import { colors } from '@/constants/theme';
import { sortProvidersByPlan } from '@/data/subscriptionPlans';
import { useAppStore } from '@/store/useAppStore';

const categories = [
  { label: 'Limpeza', match: ['limpeza', 'diarista'], icon: Sparkles },
  { label: 'Encanador', match: ['encanador'], icon: Wrench },
  { label: 'Elétrica', match: ['eletricista', 'elétrica'], icon: Zap },
  { label: 'Pintura', match: ['pintor', 'pintura'], icon: PaintRoller },
  { label: 'Mais', match: [], icon: Grid2X2 },
];

export default function ClientHomeScreen() {
  const currentUser = useAppStore((state) => state.currentUser);
  const providers = useAppStore((state) => state.providers);
  const favoriteProviderIds = useAppStore((state) => state.favoriteProviderIds);
  const toggleFavoriteProvider = useAppStore((state) => state.toggleFavoriteProvider);
  const selectedServiceCity = useAppStore((state) => state.selectedServiceCity);
  const setSelectedServiceCity = useAppStore((state) => state.setSelectedServiceCity);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);

  const filteredProviders = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR');
    const selectedCategory = categories.find((item) => item.label === category);
    return sortProvidersByPlan(providers.filter((provider) => {
      if (provider.profileHidden) return false;
      const searchable = `${provider.fullName} ${provider.profession}`.toLocaleLowerCase('pt-BR');
      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
      const matchesCategory =
        !selectedCategory ||
        selectedCategory.match.length === 0 ||
        selectedCategory.match.some((term) => searchable.includes(term));
      const matchesCity = provider.serviceCities.includes(selectedServiceCity);
      return matchesQuery && matchesCategory && matchesCity;
    }));
  }, [category, providers, query, selectedServiceCity]);

  return (
    <Screen className="bg-white">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-5 pb-7">
        <View className="flex-row items-start justify-between pb-5 pt-4">
          <View>
            <Text className="text-2xl font-black text-slate-950">
              Olá, {currentUser?.fullName.split(' ')[0]}! 👋
            </Text>
            <Text className="mt-1 text-sm text-slate-500">Como podemos te ajudar hoje?</Text>
          </View>
          <View className="flex-row items-center gap-3">
            <AnimatedPressable
              accessibilityLabel="Notificações"
              accessibilityRole="button"
              onPress={() =>
                Alert.alert('Notificações', 'Você não possui novas notificações no momento.')
              }
              pressedScale={0.9}
              className="relative h-10 w-10 items-center justify-center rounded-full border border-slate-100 bg-white"
            >
              <Bell size={20} color={colors.slate900} />
              <View className="absolute right-1.5 top-1 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-600" />
            </AnimatedPressable>
          </View>
        </View>

        <CitySelector
          value={selectedServiceCity}
          onChange={setSelectedServiceCity}
          className="mb-4"
        />

        <View className="flex-row gap-3">
          <View
            className="min-h-14 flex-1 flex-row items-center rounded-2xl border border-slate-200 bg-white px-4"
            style={{ shadowColor: '#0F172A', shadowOpacity: 0.04, shadowRadius: 10, elevation: 1 }}
          >
            <Search size={20} color={colors.slate700} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="O que você precisa?"
              placeholderTextColor={colors.slate400}
              returnKeyType="search"
              className="min-h-14 flex-1 px-3 text-sm text-slate-900"
            />
          </View>
          <AnimatedPressable
            accessibilityLabel="Abrir busca avançada"
            accessibilityRole="button"
            onPress={() => router.navigate('/(client)/(tabs)/search')}
            pressedScale={0.92}
            className="h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white active:bg-slate-50"
          >
            <SlidersHorizontal size={21} color={colors.slate900} />
          </AnimatedPressable>
        </View>

        <AnimatedPressable
          accessibilityRole="button"
          onPress={() => router.push('/(client)/request-quote')}
          pressedOpacity={0.9}
          pressedScale={0.985}
          className="mt-5 flex-row items-center gap-4 rounded-3xl bg-brand-700 p-5"
          style={{
            shadowColor: colors.brand700,
            shadowOpacity: 0.2,
            shadowRadius: 14,
            elevation: 4,
          }}
        >
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <MessageSquareQuote size={24} color={colors.white} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-black text-white">Comunidade</Text>
            <Text className="mt-1 text-xs leading-5 text-brand-100">
              Publique uma ordem de serviço e converse com profissionais da região.
            </Text>
          </View>
          <ArrowRight size={21} color={colors.white} />
        </AnimatedPressable>

        <View className="mt-6 flex-row items-center justify-between">
          <Text className="text-base font-black text-slate-950">Categorias</Text>
          <AnimatedPressable
            onPress={() => router.navigate('/(client)/(tabs)/search')}
            pressedOpacity={0.7}
          >
            <Text className="text-xs font-extrabold text-brand-700">Ver todas</Text>
          </AnimatedPressable>
        </View>

        <View className="mt-4 flex-row justify-between">
          {categories.map((item) => {
            const Icon = item.icon;
            const selected = item.label === category;
            return (
              <AnimatedPressable
                key={item.label}
                onPress={() => setCategory((value) => (value === item.label ? null : item.label))}
                pressedOpacity={0.78}
                pressedScale={0.9}
                className="w-[58px] items-center"
              >
                <View
                  className={`h-[52px] w-[52px] items-center justify-center rounded-2xl border ${
                    selected ? 'border-brand-600 bg-brand-600' : 'border-slate-100 bg-white'
                  }`}
                  style={{ shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 8, elevation: 1 }}
                >
                  <Icon size={22} color={selected ? colors.white : colors.brand700} />
                </View>
                <Text className={`mt-2 text-[10px] font-bold ${selected ? 'text-brand-700' : 'text-slate-700'}`}>
                  {item.label}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>

        <View className="mt-7 flex-row items-center justify-between">
          <Text className="text-base font-black text-slate-950">
            Profissionais em {selectedServiceCity}
          </Text>
          <AnimatedPressable
            onPress={() => router.navigate('/(client)/(tabs)/search')}
            pressedOpacity={0.7}
          >
            <Text className="text-xs font-extrabold text-brand-700">Ver todos</Text>
          </AnimatedPressable>
        </View>

        <View className="mt-4">
          {filteredProviders.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              favorite={favoriteProviderIds.includes(provider.id)}
              onToggleFavorite={() => toggleFavoriteProvider(provider.id)}
              onPress={() =>
                router.push({
                  pathname: '/(client)/professional/[id]',
                  params: { id: provider.id },
                })
              }
            />
          ))}
          {!filteredProviders.length ? (
            <View className="rounded-2xl border border-dashed border-slate-200 p-7">
              <Text className="text-center font-bold text-slate-700">Nenhum profissional encontrado.</Text>
            </View>
          ) : null}
        </View>

        <AnimatedPressable
          onPress={() => router.navigate('/(client)/(tabs)/search')}
          pressedOpacity={0.9}
          pressedScale={0.98}
          className="mt-3 flex-row items-center gap-4 rounded-2xl bg-brand-950 p-4 active:opacity-95"
        >
          <View className="flex-1">
            <Text className="font-black text-white">Serviços com segurança</Text>
            <Text className="mt-1 text-xs leading-5 text-brand-100">Profissionais verificados e avaliações reais.</Text>
          </View>
          <ShieldCheck size={40} color={colors.brand500} />
          <ArrowRight size={20} color={colors.white} />
        </AnimatedPressable>
      </ScrollView>
    </Screen>
  );
}
