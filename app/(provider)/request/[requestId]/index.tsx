import { router, useLocalSearchParams, type Href } from 'expo-router';
import {
  ArrowLeft,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Info,
  MapPin,
  PackageCheck,
  Send,
  UserRound,
  Wrench,
} from 'lucide-react-native';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AnimatedPressable } from '@/components/common/AnimatedPressable';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { Screen } from '@/components/common/Screen';
import { RequestMediaGallery } from '@/components/requests/RequestMediaGallery';
import { PlanLimitModal } from '@/components/subscriptions/PlanLimitModal';
import { colors } from '@/constants/theme';
import { getServiceCategory, providerMatchesCategory } from '@/data/serviceCategories';
import { hasReachedMonthlyServiceLimit } from '@/data/subscriptionPlans';
import { isSupabaseConfigured } from '@/lib/supabase';
import { serviceRequestsService } from '@/services/serviceRequests';
import { useAppStore } from '@/store/useAppStore';

const urgencyLabels = {
  flexible: 'Data flexível',
  soon: 'Nos próximos dias',
  urgent: 'Atendimento urgente',
};

export default function ProviderRequestDetailScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const currentUser = useAppStore((state) => state.currentUser);
  const provider = useAppStore((state) =>
    state.providers.find((item) => item.id === state.currentUser?.id),
  );
  const request = useAppStore((state) =>
    state.serviceRequests.find((item) => item.id === requestId),
  );
  const existingQuote = useAppStore((state) =>
    state.serviceQuotes.find(
      (quote) => quote.requestId === requestId && quote.providerId === state.currentUser?.id,
    ),
  );
  const submitServiceQuote = useAppStore((state) => state.submitServiceQuote);
  const markServiceRequestSeen = useAppStore((state) => state.markServiceRequestSeen);
  const [price, setPrice] = useState(existingQuote?.amount.toString() ?? '');
  const [duration, setDuration] = useState(existingQuote?.estimatedDuration ?? '');
  const [message, setMessage] = useState(existingQuote?.message ?? '');
  const [includesMaterials, setIncludesMaterials] = useState(
    existingQuote?.includesMaterials ?? false,
  );
  const [materialsDescription, setMaterialsDescription] = useState(
    existingQuote?.materialsDescription ?? '',
  );
  const [submitting, setSubmitting] = useState(false);
  const [planLimitVisible, setPlanLimitVisible] = useState(false);

  if (!request || !provider || !providerMatchesCategory(provider, request.category)) {
    return (
      <Screen className="bg-white">
        <View className="flex-1 items-center justify-center px-5">
          <EmptyState
            icon={<Wrench size={28} color={colors.brand700} />}
            title="Pedido indisponível"
            description="Este pedido não pertence às classes de serviço cadastradas no seu perfil."
          />
          <View className="mt-4 w-full">
            <Button label="Voltar ao painel" onPress={() => router.back()} />
          </View>
        </View>
      </Screen>
    );
  }

  const category = getServiceCategory(request.category);
  const wonRequest = request.selectedProviderId === currentUser?.id;
  const lostRequest = request.status === 'quote_selected' && !wonRequest;
  const canSubmit = request.status === 'open' && provider.agendaOpen;

  const handleSubmit = async () => {
    const amount = Number(price.replace(',', '.'));
    if (
      !amount ||
      amount <= 0 ||
      duration.trim().length < 3 ||
      message.trim().length < 20 ||
      (includesMaterials && materialsDescription.trim().length < 5)
    ) {
      Alert.alert(
        'Revise a proposta',
        'Informe um valor, o tempo estimado, uma explicação de pelo menos 20 caracteres e os materiais incluídos.',
      );
      return;
    }

    if (!existingQuote && hasReachedMonthlyServiceLimit(provider)) {
      setPlanLimitVisible(true);
      return;
    }

    setSubmitting(true);
    const input = {
      requestId: request.id,
      amount,
      estimatedDuration: duration,
      message,
      includesMaterials,
      materialsDescription,
    };
    try {
      if (isSupabaseConfigured) await serviceRequestsService.submitQuote(input);
      const quote = submitServiceQuote(input);
      markServiceRequestSeen(request.id);
      if (!quote) {
        if (!existingQuote && hasReachedMonthlyServiceLimit(provider)) {
          setPlanLimitVisible(true);
          return;
        }
        throw new Error('Confira se sua agenda está aberta e se o pedido ainda recebe propostas.');
      }
      Alert.alert(
        existingQuote ? 'Proposta atualizada' : 'Orçamento enviado!',
        'O cliente poderá comparar sua proposta com as demais e escolher pelo aplicativo.',
        [{ text: 'Voltar ao painel', onPress: () => router.back() }],
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Tente novamente em instantes.';
      if (errorMessage.includes('LIMIT_MONTHLY_FREE_PLAN')) {
        setPlanLimitVisible(true);
        return;
      }
      Alert.alert(
        'Não foi possível enviar',
        errorMessage,
      );
    } finally {
      setSubmitting(false);
    }
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
            onPress={() => {
              markServiceRequestSeen(request.id);
              router.back();
            }}
            pressedScale={0.88}
            className="h-10 w-10 items-center justify-center rounded-full active:bg-slate-100"
          >
            <ArrowLeft size={23} color={colors.slate900} />
          </AnimatedPressable>
          <View className="flex-1 pr-10">
            <Text className="text-center text-base font-black text-slate-950">Analisar pedido</Text>
            <Text className="text-center text-[11px] text-slate-500">Prepare um orçamento estimado</Text>
          </View>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerClassName="px-5 pb-8"
        >
          {wonRequest ? (
            <View className="mt-5 flex-row gap-3 rounded-3xl bg-emerald-600 p-5">
              <CheckCircle2 size={24} color={colors.white} />
              <View className="flex-1">
                <Text className="text-lg font-extrabold text-white">Sua proposta foi escolhida!</Text>
                <Text className="mt-1 text-sm leading-5 text-emerald-50">
                  O cliente poderá enviar o agendamento. Prepare as ferramentas e materiais informados.
                </Text>
              </View>
            </View>
          ) : lostRequest ? (
            <View className="mt-5 rounded-3xl bg-slate-100 p-5">
              <Text className="font-extrabold text-slate-700">Pedido encerrado</Text>
              <Text className="mt-1 text-sm leading-5 text-slate-500">
                O cliente escolheu outra proposta. Seu orçamento permanece salvo para consulta.
              </Text>
            </View>
          ) : null}

          <View className="mt-5 rounded-3xl border border-slate-100 bg-white p-5">
            <View className="flex-row items-center justify-between gap-3">
              <Text className="rounded-full bg-brand-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-brand-700">
                {category.label}
              </Text>
              <Text
                className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${
                  request.urgency === 'urgent'
                    ? 'bg-red-50 text-red-600'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {urgencyLabels[request.urgency]}
              </Text>
            </View>
            <Text className="mt-4 text-xl font-black leading-7 text-slate-950">{request.title}</Text>
            <View className="mt-3 flex-row items-center gap-3">
              <AnimatedPressable
                accessibilityLabel={`Abrir perfil de ${request.clientName}`}
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: '/(provider)/client/[clientId]',
                    params: { clientId: request.clientId },
                  } as unknown as Href)
                }
                className="flex-row items-center gap-2 rounded-full bg-brand-50 py-1.5 pl-1.5 pr-3"
              >
                <View className="h-8 w-8 items-center justify-center rounded-full bg-brand-100">
                  <UserRound size={17} color={colors.brand700} />
                </View>
                <Text className="text-xs font-black text-brand-800">{request.clientName}</Text>
              </AnimatedPressable>
              <View className="flex-row items-center gap-1.5">
                <MapPin size={15} color={colors.slate500} />
                <Text className="text-xs font-semibold text-slate-500">{request.city}</Text>
              </View>
            </View>
            <Text className="mt-5 text-xs font-extrabold uppercase tracking-wider text-slate-400">
              Descrição completa
            </Text>
            <Text className="mt-2 text-sm leading-6 text-slate-700">{request.description}</Text>
            {request.media.length ? (
              <View className="mt-5">
                <Text className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Anexos do cliente
                </Text>
                <RequestMediaGallery media={request.media} />
              </View>
            ) : null}
          </View>

          <View className="mt-5 flex-row gap-3 rounded-2xl bg-amber-50 p-4">
            <Wrench size={20} color={colors.warning} />
            <Text className="flex-1 text-sm leading-5 text-amber-800">
              Use a descrição e os anexos para prever ferramentas, peças, deslocamento e duração.
            </Text>
          </View>

          <View className="mt-7">
            <Text className="text-xl font-black text-slate-950">
              {existingQuote ? 'Sua proposta' : 'Enviar orçamento'}
            </Text>
            <Text className="mt-1 text-sm leading-5 text-slate-500">
              O valor pode ser confirmado após a avaliação presencial, se necessário.
            </Text>

            <View className="mt-5">
              <Text className="mb-2 font-bold text-slate-700">Valor estimado</Text>
              <View className="flex-row items-center rounded-2xl border border-slate-200 bg-white px-4">
                <CircleDollarSign size={20} color={colors.brand700} />
                <Text className="ml-3 font-bold text-slate-500">R$</Text>
                <TextInput
                  value={price}
                  onChangeText={setPrice}
                  editable={canSubmit}
                  keyboardType="decimal-pad"
                  placeholder="0,00"
                  placeholderTextColor={colors.slate400}
                  className="min-h-14 flex-1 px-2 text-base text-slate-900"
                />
              </View>
            </View>

            <View className="mt-4">
              <Text className="mb-2 font-bold text-slate-700">Tempo estimado</Text>
              <View className="flex-row items-center rounded-2xl border border-slate-200 bg-white px-4">
                <Clock3 size={20} color={colors.brand700} />
                <TextInput
                  value={duration}
                  onChangeText={setDuration}
                  editable={canSubmit}
                  placeholder="Ex.: 2 a 3 horas"
                  placeholderTextColor={colors.slate400}
                  maxLength={60}
                  className="min-h-14 flex-1 px-3 text-base text-slate-900"
                />
              </View>
            </View>

            <View className="mt-4">
              <Text className="mb-2 font-bold text-slate-700">Explique o que está incluído</Text>
              <TextInput
                value={message}
                onChangeText={setMessage}
                editable={canSubmit}
                multiline
                maxLength={700}
                textAlignVertical="top"
                placeholder="Descreva o diagnóstico provável, como será realizado o serviço e quais ferramentas pretende levar."
                placeholderTextColor={colors.slate400}
                className="min-h-36 rounded-2xl border border-slate-200 bg-white p-4 text-base leading-6 text-slate-900"
              />
              <Text className="mt-2 text-right text-xs text-slate-400">{message.length}/700</Text>
            </View>

            <View className="mt-4 flex-row items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
              <View className="flex-1 flex-row items-center gap-3 pr-4">
                <PackageCheck size={22} color={colors.brand700} />
                <View className="flex-1">
                  <Text className="font-extrabold text-slate-800">Materiais ou peças incluídos</Text>
                  <Text className="mt-1 text-xs leading-4 text-slate-500">
                    Ative se o valor já contempla os itens necessários.
                  </Text>
                </View>
              </View>
              <Switch
                value={includesMaterials}
                disabled={!canSubmit}
                onValueChange={setIncludesMaterials}
                trackColor={{ false: colors.slate200, true: colors.success }}
                thumbColor={colors.white}
              />
            </View>

            <View className="mt-4">
              <Text className="mb-2 font-bold text-slate-700">
                {includesMaterials ? 'Quais materiais estão incluídos?' : 'Observação sobre materiais'}
              </Text>
              <TextInput
                value={materialsDescription}
                onChangeText={setMaterialsDescription}
                editable={canSubmit}
                multiline
                maxLength={400}
                textAlignVertical="top"
                placeholder={
                  includesMaterials
                    ? 'Ex.: conectores, fita isolante e uma tomada padrão já inclusos.'
                    : 'Ex.: peças serão confirmadas após abrir o equipamento.'
                }
                placeholderTextColor={colors.slate400}
                className="min-h-24 rounded-2xl border border-slate-200 bg-white p-4 text-base leading-6 text-slate-900"
              />
            </View>
          </View>

          {!provider.agendaOpen ? (
            <View className="mt-5 flex-row gap-3 rounded-2xl bg-red-50 p-4">
              <Info size={20} color={colors.danger} />
              <Text className="flex-1 text-sm leading-5 text-red-700">
                Abra sua agenda no painel para enviar novas propostas.
              </Text>
            </View>
          ) : null}

          {canSubmit ? (
            <View className="mt-7">
              <Button
                label={existingQuote ? 'Atualizar proposta' : 'Enviar proposta ao cliente'}
                loading={submitting}
                icon={<Send size={19} color={colors.white} />}
                onPress={handleSubmit}
              />
              <Text className="mt-3 text-center text-xs leading-5 text-slate-400">
                Seja transparente sobre o que pode alterar o valor após a visita.
              </Text>
            </View>
          ) : wonRequest ? (
            <View className="mt-7">
              <Button label="Voltar ao painel" onPress={() => router.back()} />
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
      <PlanLimitModal
        visible={planLimitVisible}
        onClose={() => setPlanLimitVisible(false)}
        onViewPlans={() => {
          setPlanLimitVisible(false);
          router.push('/(provider)/plans' as unknown as Href);
        }}
      />
    </Screen>
  );
}
