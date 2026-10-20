import { router, type Href } from 'expo-router';
import { Ban, Camera, Check, MapPin, Save, Star } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';

import { AnimatedPressable } from '@/components/common/AnimatedPressable';
import { AvailabilityManager } from '@/components/booking/AvailabilityManager';
import { Button } from '@/components/common/Button';
import { Screen } from '@/components/common/Screen';
import { colors } from '@/constants/theme';
import { inferServiceCategories, serviceCategoryOptions } from '@/data/serviceCategories';
import { getPlanCityLimit, getSubscriptionPlan } from '@/data/subscriptionPlans';
import { valeCities, type ValeCity } from '@/data/valeCities';
import { useAppStore } from '@/store/useAppStore';
import type { ServiceCategory, WeeklyAvailability } from '@/types';
import { defaultAvailability } from '@/utils/availability';

export default function ProviderPortfolioScreen() {
  const provider = useAppStore((state) =>
    state.providers.find((item) => item.id === state.currentUser?.id),
  );
  const updateProviderProfile = useAppStore((state) => state.updateProviderProfile);
  const cancellationRecords = useAppStore((state) => state.cancellationRecords);
  const [fullName, setFullName] = useState(provider?.fullName ?? '');
  const [profession, setProfession] = useState(provider?.profession ?? '');
  const [bio, setBio] = useState(provider?.bio ?? '');
  const [availability, setAvailability] = useState<WeeklyAvailability>(
    provider?.availability ?? defaultAvailability,
  );
  const [serviceCities, setServiceCities] = useState<ValeCity[]>(
    provider?.serviceCities ?? [],
  );
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>(
    provider?.serviceCategories?.length
      ? provider.serviceCategories
      : inferServiceCategories(provider?.profession ?? ''),
  );

  useEffect(() => {
    if (!provider) return;
    // O formulário local precisa acompanhar a hidratação/atualização do perfil no store externo.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFullName(provider.fullName);
    setProfession(provider.profession);
    setBio(provider.bio);
    setAvailability(provider.availability ?? defaultAvailability);
    setServiceCities(provider.serviceCities ?? []);
    setServiceCategories(
      provider.serviceCategories?.length
        ? provider.serviceCategories
        : inferServiceCategories(provider.profession),
    );
  }, [provider]);

  if (!provider) return null;
  const cancellationCount = cancellationRecords.filter(
    (record) => record.providerId === provider.id,
  ).length;
  const openHistory = (tab: 'reviews' | 'cancellations') =>
    router.push({
      pathname: '/(provider)/reputation/[userId]',
      params: { userId: provider.id, role: 'provider', tab },
    } as unknown as Href);
  const cityLimit = getPlanCityLimit(provider.currentPlan);

  const toggleServiceCity = (city: ValeCity) => {
    const selected = serviceCities.includes(city);
    if (selected) {
      if (serviceCities.length === 1) {
        Alert.alert('Mantenha uma cidade', 'Seu perfil precisa ter pelo menos uma cidade atendida.');
        return;
      }
      setServiceCities((current) => current.filter((item) => item !== city));
      return;
    }
    if (cityLimit !== null && serviceCities.length >= cityLimit) {
      Alert.alert(
        'Limite de cidades atingido',
        `O Plano ${getSubscriptionPlan(provider.currentPlan).name} permite até ${cityLimit} cidades. Faça upgrade para ampliar sua área de atuação.`,
        [
          { text: 'Agora não', style: 'cancel' },
          {
            text: 'Conhecer Planos',
            onPress: () => router.push('/(provider)/plans' as unknown as Href),
          },
        ],
      );
      return;
    }
    setServiceCities((current) => [...current, city]);
  };

  const handleSave = () => {
    if (
      fullName.trim().length < 3 ||
      profession.trim().length < 3 ||
      bio.trim().length < 20 ||
      !serviceCities.length
    ) {
      Alert.alert(
        'Revise o perfil',
        'Preencha nome, profissão, bio com pelo menos 20 caracteres e selecione uma cidade atendida.',
      );
      return;
    }
    updateProviderProfile({
      fullName: fullName.trim(),
      profession: profession.trim(),
      bio: bio.trim(),
      serviceCategories,
      availability,
      serviceCities,
    });
    Alert.alert('Perfil atualizado', 'As alterações já aparecem para os clientes.');
  };

  return (
    <Screen>
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerClassName="px-5 pb-8" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View className="pb-4 pt-5">
            <Text className="text-2xl font-extrabold text-slate-900">Meu perfil público</Text>
            <Text className="mt-1 text-slate-500">Mostre seu melhor trabalho para novos clientes.</Text>
          </View>

          <View className="mt-2 items-center rounded-3xl bg-brand-700 px-5 py-6">
            <View>
              <Image source={{ uri: provider.avatarUrl }} className="h-24 w-24 rounded-3xl border-4 border-white/20" />
              <View className="absolute -bottom-2 -right-2 h-10 w-10 items-center justify-center rounded-2xl bg-white">
                <Camera size={19} color={colors.brand700} />
              </View>
            </View>
            <Text className="mt-4 text-xl font-extrabold text-white">{provider.fullName}</Text>
            <View className="mt-3 flex-row gap-2">
              <AnimatedPressable
                accessibilityLabel="Abrir avaliações profissionais"
                onPress={() => openHistory('reviews')}
                className="flex-row items-center gap-1 rounded-full bg-white/20 px-3 py-2"
              >
                <Star size={14} color="#FBBF24" fill="#FBBF24" />
                <Text className="text-xs font-bold text-white">{provider.rating} · {provider.reviewCount}</Text>
              </AnimatedPressable>
              <AnimatedPressable
                accessibilityLabel="Abrir cancelamentos profissionais"
                onPress={() => openHistory('cancellations')}
                className="flex-row items-center gap-1 rounded-full bg-white/20 px-3 py-2"
              >
                <Ban size={14} color="#FCA5A5" />
                <Text className="text-xs font-bold text-white">{cancellationCount}</Text>
              </AnimatedPressable>
            </View>
          </View>

          <View className="mt-6 gap-4">
            <View>
              <Text className="mb-2 font-bold text-slate-700">Nome de apresentação</Text>
              <TextInput value={fullName} onChangeText={setFullName} className="min-h-14 rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900" />
            </View>
            <View>
              <Text className="mb-2 font-bold text-slate-700">Profissão / especialidade</Text>
              <TextInput value={profession} onChangeText={setProfession} className="min-h-14 rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900" />
            </View>
            <View>
              <Text className="mb-1 font-bold text-slate-700">Classes de serviço</Text>
              <Text className="mb-3 text-sm leading-5 text-slate-500">
                Você receberá pedidos de orçamento somente destas categorias. Escolha até 3.
              </Text>
              <View className="flex-row flex-wrap gap-2">
                {serviceCategoryOptions.map((category) => {
                  const selected = serviceCategories.includes(category.id);
                  return (
                    <AnimatedPressable
                      key={category.id}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      onPress={() => {
                        if (selected && serviceCategories.length === 1) {
                          Alert.alert('Mantenha uma categoria', 'Selecione pelo menos uma classe de serviço.');
                          return;
                        }
                        if (!selected && serviceCategories.length >= 3) {
                          Alert.alert('Limite de categorias', 'Você pode selecionar até 3 classes de serviço.');
                          return;
                        }
                        setServiceCategories((current) =>
                          selected
                            ? current.filter((item) => item !== category.id)
                            : [...current, category.id],
                        );
                      }}
                      pressedScale={0.96}
                      className={`flex-row items-center gap-1.5 rounded-full border px-3 py-2.5 ${
                        selected
                          ? 'border-brand-700 bg-brand-700'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      {selected ? <Check size={14} color={colors.white} /> : null}
                      <Text
                        className={`text-xs font-bold ${
                          selected ? 'text-white' : 'text-slate-600'
                        }`}
                      >
                        {category.shortLabel}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </View>
            </View>
            <View>
              <Text className="mb-2 font-bold text-slate-700">Biografia profissional</Text>
              <TextInput
                value={bio}
                onChangeText={setBio}
                multiline
                maxLength={700}
                textAlignVertical="top"
                className="min-h-36 rounded-2xl border border-slate-200 bg-white p-4 text-base leading-6 text-slate-900"
              />
              <Text className="mt-2 text-right text-xs text-slate-400">{bio.length}/700</Text>
            </View>
          </View>

          <View className="mt-8">
            <View className="rounded-3xl border border-slate-200 bg-white p-4">
              <View className="flex-row items-center gap-3">
                <View className="h-10 w-10 items-center justify-center rounded-2xl bg-brand-50">
                  <MapPin size={20} color={colors.brand700} />
                </View>
                <View className="flex-1">
                  <Text className="font-black text-slate-900">Cidades atendidas</Text>
                  <Text className="mt-0.5 text-xs text-slate-500">
                    {cityLimit === null
                      ? 'Seleção ilimitada no seu Plano Premium.'
                      : `Seu plano permite selecionar até ${cityLimit} cidades.`}
                  </Text>
                </View>
              </View>
              <View className="mt-4 flex-row flex-wrap gap-2">
                {valeCities.map((city) => {
                  const selected = serviceCities.includes(city);
                  return (
                    <AnimatedPressable
                      key={city}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      onPress={() => toggleServiceCity(city)}
                      className={`flex-row items-center gap-1.5 rounded-full border px-3 py-2.5 ${
                        selected
                          ? 'border-brand-700 bg-brand-700'
                          : 'border-slate-200 bg-white'
                      }`}
                    >
                      {selected ? <Check size={13} color={colors.white} /> : null}
                      <Text
                        className={`text-xs font-bold ${
                          selected ? 'text-white' : 'text-slate-600'
                        }`}
                      >
                        {city}
                      </Text>
                    </AnimatedPressable>
                  );
                })}
              </View>
              <Text className="mt-3 text-xs font-semibold text-brand-700">
                {serviceCities.length}{' '}
                {serviceCities.length === 1 ? 'cidade selecionada' : 'cidades selecionadas'}
              </Text>
            </View>
          </View>

          <View className="mt-8">
            {provider.currentPlan === 'premium' ? (
              <View className="mb-4 rounded-3xl border border-amber-300 bg-amber-50 p-4">
                <Text className="font-black text-amber-900">Agenda Avançada Premium</Text>
                <Text className="mt-1 text-xs leading-5 text-amber-800">
                  Gestão de dias, horários e cobertura regional ilimitada ativada.
                </Text>
              </View>
            ) : null}
            <AvailabilityManager value={availability} onChange={setAvailability} />
          </View>

          <View className="mt-8">
            <Button label="Gerenciar produtos e serviços" variant="secondary"
              onPress={() => router.push('/(provider)/products' as Href)} />
          </View>

          <View className="mt-8">
            <Button label="Salvar alterações" icon={<Save size={19} color={colors.white} />} onPress={handleSave} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
