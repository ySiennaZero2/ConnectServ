import { router } from 'expo-router';
import { Heart } from 'lucide-react-native';
import { ScrollView, Text, View } from 'react-native';

import { EmptyState } from '@/components/common/EmptyState';
import { Screen } from '@/components/common/Screen';
import { ProviderCard } from '@/components/providers/ProviderCard';
import { colors } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';

export default function FavoritesScreen() {
  const providers = useAppStore((state) => state.providers);
  const favoriteProviderIds = useAppStore((state) => state.favoriteProviderIds);
  const toggleFavoriteProvider = useAppStore((state) => state.toggleFavoriteProvider);
  const favorites = providers.filter((provider) => favoriteProviderIds.includes(provider.id));

  return (
    <Screen className="bg-white">
      <View className="px-5 pb-5 pt-4">
        <Text className="text-2xl font-black text-slate-950">Seus favoritos</Text>
        <Text className="mt-1 text-sm text-slate-500">Profissionais que você quer encontrar rapidamente.</Text>
      </View>
      <ScrollView contentContainerClassName="px-5 pb-7" showsVerticalScrollIndicator={false}>
        {favorites.length ? (
          favorites.map((provider) => (
            <ProviderCard
              key={provider.id}
              provider={provider}
              favorite
              onToggleFavorite={() => toggleFavoriteProvider(provider.id)}
              onPress={() =>
                router.push({ pathname: '/(client)/professional/[id]', params: { id: provider.id } })
              }
            />
          ))
        ) : (
          <EmptyState
            icon={<Heart size={27} color={colors.brand700} />}
            title="Nenhum favorito ainda"
            description="Toque no coração de um profissional para salvá-lo aqui."
          />
        )}
      </ScrollView>
    </Screen>
  );
}
