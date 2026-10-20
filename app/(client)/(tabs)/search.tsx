import { router } from 'expo-router';
import { Search, SlidersHorizontal } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { Screen } from '@/components/common/Screen';
import { CitySelector } from '@/components/common/CitySelector';
import { ProviderCard } from '@/components/providers/ProviderCard';
import { colors } from '@/constants/theme';
import { sortProvidersByPlan } from '@/data/subscriptionPlans';
import { useAppStore } from '@/store/useAppStore';

export default function SearchProfessionalsScreen() {
  const providers = useAppStore((state) => state.providers);
  const favoriteProviderIds = useAppStore((state) => state.favoriteProviderIds);
  const toggleFavoriteProvider = useAppStore((state) => state.toggleFavoriteProvider);
  const selectedServiceCity = useAppStore((state) => state.selectedServiceCity);
  const setSelectedServiceCity = useAppStore((state) => state.setSelectedServiceCity);
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('pt-BR');
    return sortProvidersByPlan(providers.filter((provider) => {
      if (provider.profileHidden) return false;
      const matchesCity = provider.serviceCities.includes(selectedServiceCity);
      const matchesQuery =
        !normalized ||
        `${provider.fullName} ${provider.profession}`
          .toLocaleLowerCase('pt-BR')
          .includes(normalized);
      return matchesCity && matchesQuery;
    }));
  }, [providers, query, selectedServiceCity]);

  return (
    <Screen className="bg-white">
      <View className="px-5 pb-4 pt-4">
        <Text className="text-2xl font-black text-slate-950">Buscar profissionais</Text>
        <Text className="mt-1 text-sm text-slate-500">Encontre o serviço ideal perto de você.</Text>
        <CitySelector
          value={selectedServiceCity}
          onChange={setSelectedServiceCity}
          className="mt-4"
        />
        <View className="mt-5 flex-row items-center rounded-2xl border border-slate-200 bg-white px-4">
          <Search size={20} color={colors.slate700} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            placeholder="Serviço ou nome do profissional"
            placeholderTextColor={colors.slate400}
            className="min-h-14 flex-1 px-3 text-sm text-slate-900"
          />
          <SlidersHorizontal size={19} color={colors.brand700} />
        </View>
      </View>
      <ScrollView contentContainerClassName="px-5 pb-7" showsVerticalScrollIndicator={false}>
        <Text className="mb-4 text-sm font-extrabold text-slate-700">
          {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
        </Text>
        {results.map((provider) => (
          <ProviderCard
            key={provider.id}
            provider={provider}
            favorite={favoriteProviderIds.includes(provider.id)}
            onToggleFavorite={() => toggleFavoriteProvider(provider.id)}
            onPress={() =>
              router.push({ pathname: '/(client)/professional/[id]', params: { id: provider.id } })
            }
          />
        ))}
      </ScrollView>
    </Screen>
  );
}
