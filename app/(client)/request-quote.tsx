import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Camera,
  Grid2X2,
  Hammer,
  ImagePlus,
  PaintRoller,
  Send,
  Sparkles,
  Video,
  Wind,
  Wrench,
  Zap,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AnimatedPressable } from '@/components/common/AnimatedPressable';
import { Button } from '@/components/common/Button';
import { Screen } from '@/components/common/Screen';
import { RequestMediaGallery } from '@/components/requests/RequestMediaGallery';
import { colors } from '@/constants/theme';
import {
  providerMatchesCategory,
  serviceCategoryOptions,
} from '@/data/serviceCategories';
import { useAppStore } from '@/store/useAppStore';
import type { RequestMedia, RequestUrgency, ServiceCategory } from '@/types';

const categoryIcons: Record<ServiceCategory, LucideIcon> = {
  electrical: Zap,
  plumbing: Wrench,
  cleaning: Sparkles,
  furniture: Hammer,
  painting: PaintRoller,
  air_conditioning: Wind,
  general: Grid2X2,
};

const urgencyOptions: { id: RequestUrgency; label: string; description: string }[] = [
  { id: 'flexible', label: 'Flexível', description: 'Posso combinar a melhor data' },
  { id: 'soon', label: 'Em breve', description: 'Nos próximos dias' },
  { id: 'urgent', label: 'Urgente', description: 'Preciso o quanto antes' },
];

export default function RequestQuoteScreen() {
  const providers = useAppStore((state) => state.providers);
  const createServiceRequest = useAppStore((state) => state.createServiceRequest);
  const [category, setCategory] = useState<ServiceCategory | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState<RequestUrgency>('flexible');
  const [media, setMedia] = useState<RequestMedia[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const handlePickMedia = async () => {
    if (media.length >= 6) {
      Alert.alert('Limite de anexos', 'Você pode adicionar até 6 imagens ou vídeos.');
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permissão necessária',
        'Autorize o acesso às fotos e vídeos para detalhar melhor o problema.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      selectionLimit: 6 - media.length,
      quality: 0.8,
    });
    if (result.canceled) return;

    const currentVideoCount = media.filter((item) => item.type === 'video').length;
    let addedVideoCount = 0;
    const accepted: RequestMedia[] = [];

    for (const asset of result.assets) {
      const type = asset.type === 'video' ? 'video' : 'image';
      const maxSize = type === 'video' ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
      if (asset.fileSize && asset.fileSize > maxSize) continue;
      if (type === 'video' && currentVideoCount + addedVideoCount >= 2) continue;
      if (type === 'video') addedVideoCount += 1;

      accepted.push({
        id: `media-${Date.now()}-${accepted.length}`,
        type,
        uri: asset.uri,
        fileName: asset.fileName ?? undefined,
        mimeType: asset.mimeType,
        fileSize: asset.fileSize,
        durationMs: asset.duration ?? undefined,
      });
    }

    setMedia((current) => [...current, ...accepted].slice(0, 6));
    if (accepted.length < result.assets.length) {
      Alert.alert(
        'Alguns arquivos não foram adicionados',
        'São permitidos até 2 vídeos de 50 MB e imagens de até 10 MB.',
      );
    }
  };

  const handleSubmit = () => {
    if (!category || title.trim().length < 8 || description.trim().length < 30) {
      Alert.alert(
        'Complete os detalhes',
        'Escolha uma categoria, escreva um título e descreva o problema com pelo menos 30 caracteres.',
      );
      return;
    }

    setSubmitting(true);
    const request = createServiceRequest({
      category,
      title: title.trim(),
      description: description.trim(),
      urgency,
      media,
    });
    setSubmitting(false);
    if (!request) {
      Alert.alert('Não foi possível enviar', 'Entre novamente e tente em instantes.');
      return;
    }

    const relatedCount = providers.filter(
      (provider) =>
        provider.agendaOpen &&
        !provider.profileHidden &&
        providerMatchesCategory(provider, category) &&
        provider.serviceCities.some((city) => city === request.city),
    ).length;
    Alert.alert(
      'Publicado na Comunidade!',
      relatedCount
        ? `${relatedCount} profissional${relatedCount === 1 ? '' : 'ais'} da categoria poderá analisar e enviar uma proposta.`
        : 'Seu pedido ficará disponível assim que houver profissionais ativos nesta categoria.',
      [
        {
          text: 'Ver minha publicação',
          onPress: () =>
            router.replace('/(client)/(tabs)/community'),
        },
      ],
    );
  };

  return (
    <Screen bottomInset className="bg-white">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-row items-center border-b border-slate-100 px-5 py-3">
          <AnimatedPressable
            accessibilityLabel="Voltar"
            accessibilityRole="button"
            onPress={() => router.back()}
            pressedScale={0.88}
            className="h-10 w-10 items-center justify-center rounded-full active:bg-slate-100"
          >
            <ArrowLeft size={23} color={colors.slate900} />
          </AnimatedPressable>
          <View className="flex-1 pr-10">
            <Text className="text-center text-base font-black text-slate-950">Publicar na Comunidade</Text>
            <Text className="text-center text-[11px] text-slate-500">Crie uma ordem de serviço pública</Text>
          </View>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="px-5 pb-8"
        >
          <View className="mt-5 flex-row gap-3 rounded-2xl border border-brand-100 bg-brand-50 p-4">
            <Send size={19} color={colors.brand700} />
            <Text className="flex-1 text-xs leading-5 text-brand-800">
              Sua solicitação ficará visível publicamente no mural da comunidade para todos os profissionais parceiros.
            </Text>
          </View>

          <View className="mt-4 rounded-3xl bg-brand-700 p-5">
            <View className="flex-row items-center gap-3">
              <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white/20">
                <Send size={21} color={colors.white} />
              </View>
              <View className="flex-1">
                <Text className="font-extrabold text-white">Explique antes da visita</Text>
                <Text className="mt-1 text-xs leading-5 text-brand-100">
                  Fotos e vídeos ajudam o profissional a estimar peças, ferramentas, tempo e valor.
                </Text>
              </View>
            </View>
          </View>

          <View className="mt-7">
            <Text className="text-lg font-black text-slate-950">1. Qual é a categoria?</Text>
            <View className="mt-3 flex-row flex-wrap gap-3">
              {serviceCategoryOptions.map((option) => {
                const Icon = categoryIcons[option.id];
                const selected = category === option.id;
                return (
                  <AnimatedPressable
                    key={option.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => setCategory(option.id)}
                    pressedScale={0.96}
                    className={`w-[47.8%] rounded-2xl border p-3 ${
                      selected
                        ? 'border-brand-700 bg-brand-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <View
                      className={`h-10 w-10 items-center justify-center rounded-xl ${
                        selected ? 'bg-brand-700' : 'bg-slate-100'
                      }`}
                    >
                      <Icon size={20} color={selected ? colors.white : colors.slate700} />
                    </View>
                    <Text className="mt-3 text-sm font-extrabold text-slate-900">{option.shortLabel}</Text>
                    <Text className="mt-1 text-[11px] leading-4 text-slate-500" numberOfLines={2}>
                      {option.description}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>

          <View className="mt-7">
            <Text className="text-lg font-black text-slate-950">2. Descreva o problema</Text>
            <Text className="mt-1 text-sm leading-5 text-slate-500">
              Informe sintomas, medidas, quantidade e o que já tentou fazer.
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              maxLength={90}
              placeholder="Ex.: Vazamento embaixo da pia da cozinha"
              placeholderTextColor={colors.slate400}
              className="mt-4 min-h-14 rounded-2xl border border-slate-200 bg-white px-4 text-base text-slate-900"
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={1200}
              textAlignVertical="top"
              placeholder="Conte quando começou, onde acontece, quantidade de itens e qualquer detalhe que possa ajudar..."
              placeholderTextColor={colors.slate400}
              className="mt-3 min-h-40 rounded-2xl border border-slate-200 bg-white p-4 text-base leading-6 text-slate-900"
            />
            <Text className="mt-2 text-right text-xs text-slate-400">{description.length}/1200</Text>
          </View>

          <View className="mt-7">
            <Text className="text-lg font-black text-slate-950">3. Adicione fotos ou vídeos</Text>
            <Text className="mt-1 text-sm leading-5 text-slate-500">
              Até 6 anexos, sendo no máximo 2 vídeos.
            </Text>
            {media.length ? (
              <View className="mt-4">
                <RequestMediaGallery
                  media={media}
                  editable
                  onRemove={(mediaId) =>
                    setMedia((current) => current.filter((item) => item.id !== mediaId))
                  }
                />
              </View>
            ) : null}
            <AnimatedPressable
              accessibilityRole="button"
              onPress={handlePickMedia}
              pressedScale={0.98}
              className="mt-4 flex-row items-center justify-center gap-3 rounded-2xl border border-dashed border-brand-300 bg-brand-50 px-4 py-5"
            >
              <View className="flex-row">
                <Camera size={20} color={colors.brand700} />
                <Video size={18} color={colors.brand700} />
              </View>
              <ImagePlus size={21} color={colors.brand700} />
              <Text className="font-extrabold text-brand-700">
                {media.length ? 'Adicionar mais arquivos' : 'Selecionar da galeria'}
              </Text>
            </AnimatedPressable>
          </View>

          <View className="mt-7">
            <Text className="text-lg font-black text-slate-950">4. Qual é a urgência?</Text>
            <View className="mt-3 gap-2">
              {urgencyOptions.map((option) => {
                const selected = urgency === option.id;
                return (
                  <AnimatedPressable
                    key={option.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => setUrgency(option.id)}
                    pressedScale={0.98}
                    className={`flex-row items-center gap-3 rounded-2xl border p-4 ${
                      selected
                        ? 'border-brand-700 bg-brand-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <View
                      className={`h-5 w-5 items-center justify-center rounded-full border-2 ${
                        selected ? 'border-brand-700' : 'border-slate-300'
                      }`}
                    >
                      {selected ? <View className="h-2.5 w-2.5 rounded-full bg-brand-700" /> : null}
                    </View>
                    <View className="flex-1">
                      <Text className="font-extrabold text-slate-900">{option.label}</Text>
                      <Text className="mt-0.5 text-xs text-slate-500">{option.description}</Text>
                    </View>
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>

          <View className="mt-8">
            <Button
              label="Publicar no mural"
              loading={submitting}
              icon={<Send size={19} color={colors.white} />}
              onPress={handleSubmit}
            />
            <Text className="mt-3 text-center text-xs leading-5 text-slate-400">
              Enviar o pedido não gera cobrança. Você decide se aceita alguma proposta.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
