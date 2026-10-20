import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  CheckCircle2,
  Clock3,
  MapPin,
  MessageSquareQuote,
  PackageCheck,
  ShieldCheck,
  Star,
  Timer,
  Wrench,
} from 'lucide-react-native';
import { useMemo } from 'react';
import { Alert, Image, ScrollView, Text, View } from 'react-native';

import { AnimatedPressable } from '@/components/common/AnimatedPressable';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { Screen } from '@/components/common/Screen';
import { RequestMediaGallery } from '@/components/requests/RequestMediaGallery';
import { colors } from '@/constants/theme';
import { getServiceCategory } from '@/data/serviceCategories';
import { useAppStore } from '@/store/useAppStore';

const urgencyLabels = {
  flexible: 'Data flexível',
  soon: 'Nos próximos dias',
  urgent: 'Atendimento urgente',
};

export default function ClientRequestDetailScreen() {
  const { requestId } = useLocalSearchParams<{ requestId: string }>();
  const request = useAppStore((state) =>
    state.serviceRequests.find((item) => item.id === requestId),
  );
  const serviceQuotes = useAppStore((state) => state.serviceQuotes);
  const quotes = useMemo(
    () =>
      serviceQuotes
      .filter((quote) => quote.requestId === requestId)
      .sort((a, b) => {
        if (a.status === 'selected') return -1;
        if (b.status === 'selected') return 1;
        return a.amount - b.amount;
      }),
    [requestId, serviceQuotes],
  );
  const providers = useAppStore((state) => state.providers);
  const selectServiceQuote = useAppStore((state) => state.selectServiceQuote);
  const cancelServiceRequest = useAppStore((state) => state.cancelServiceRequest);

  if (!request) {
    return (
      <Screen className="bg-white">
        <View className="flex-1 items-center justify-center px-5">
          <EmptyState
            icon={<MessageSquareQuote size={28} color={colors.brand700} />}
            title="Pedido não encontrado"
            description="Ele pode ter sido removido ou não está mais disponível."
          />
          <View className="mt-4 w-full">
            <Button label="Voltar" onPress={() => router.back()} />
          </View>
        </View>
      </Screen>
    );
  }

  const category = getServiceCategory(request.category);
  const selectedQuote = quotes.find((quote) => quote.id === request.selectedQuoteId);

  const chooseQuote = (quoteId: string, providerName: string, amount: number) => {
    Alert.alert(
      `Escolher ${providerName}?`,
      `Você confirma a proposta de R$ ${amount.toFixed(2).replace('.', ',')}? As demais propostas serão encerradas.`,
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Escolher proposta',
          onPress: () => {
            if (!selectServiceQuote(request.id, quoteId)) {
              Alert.alert('Não foi possível escolher', 'Atualize o pedido e tente novamente.');
              return;
            }
            Alert.alert(
              'Proposta escolhida!',
              'Agora você pode combinar a data e enviar o agendamento ao profissional.',
            );
          },
        },
      ],
    );
  };

  return (
    <Screen bottomInset className="bg-white">
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
        <Text className="flex-1 pr-10 text-center text-base font-black text-slate-950">
          Propostas recebidas
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-5 pb-8">
        {selectedQuote ? (
          <View className="mt-5 flex-row gap-3 rounded-3xl bg-emerald-600 p-5">
            <CheckCircle2 size={24} color={colors.white} />
            <View className="flex-1">
              <Text className="text-lg font-extrabold text-white">Proposta escolhida</Text>
              <Text className="mt-1 text-sm leading-5 text-emerald-50">
                {selectedQuote.providerName} foi avisado. Agora combine a melhor data para o atendimento.
              </Text>
            </View>
          </View>
        ) : null}

        <View className="mt-5 rounded-3xl border border-slate-100 bg-white p-5">
          <View className="flex-row items-center justify-between gap-3">
            <Text className="rounded-full bg-brand-50 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-brand-700">
              {category.label}
            </Text>
            <Text
              className={`rounded-full px-3 py-1.5 text-[10px] font-bold ${
                request.status === 'open'
                  ? 'bg-amber-50 text-amber-700'
                  : request.status === 'quote_selected'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-slate-100 text-slate-500'
              }`}
            >
              {request.status === 'open'
                ? 'Recebendo propostas'
                : request.status === 'quote_selected'
                  ? 'Profissional escolhido'
                  : 'Pedido encerrado'}
            </Text>
          </View>
          <Text className="mt-4 text-xl font-black leading-7 text-slate-950">{request.title}</Text>
          <View className="mt-3 flex-row flex-wrap gap-4">
            <View className="flex-row items-center gap-1.5">
              <MapPin size={15} color={colors.slate500} />
              <Text className="text-xs font-semibold text-slate-500">{request.city}</Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Clock3 size={15} color={colors.slate500} />
              <Text className="text-xs font-semibold text-slate-500">
                {urgencyLabels[request.urgency]}
              </Text>
            </View>
          </View>
          <Text className="mt-5 text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Descrição enviada
          </Text>
          <Text className="mt-2 text-sm leading-6 text-slate-700">{request.description}</Text>
          {request.media.length ? (
            <View className="mt-5">
              <Text className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Fotos e vídeos
              </Text>
              <RequestMediaGallery media={request.media} />
            </View>
          ) : null}
        </View>

        <View className="mb-4 mt-7 flex-row items-end justify-between">
          <View>
            <Text className="text-xl font-black text-slate-950">Orçamentos</Text>
            <Text className="mt-1 text-sm text-slate-500">Compare valor, prazo e materiais.</Text>
          </View>
          <View className="rounded-full bg-brand-50 px-3 py-1.5">
            <Text className="text-xs font-extrabold text-brand-700">{quotes.length} recebidos</Text>
          </View>
        </View>

        {quotes.length ? (
          quotes.map((quote) => {
            const provider = providers.find((item) => item.id === quote.providerId);
            const isSelected = quote.status === 'selected';
            const isRejected = quote.status === 'rejected';
            return (
              <View
                key={quote.id}
                className={`mb-4 rounded-3xl border p-5 ${
                  isSelected
                    ? 'border-emerald-300 bg-emerald-50'
                    : isRejected
                      ? 'border-slate-100 bg-slate-50 opacity-60'
                      : 'border-slate-200 bg-white'
                }`}
              >
                <View className="flex-row items-center gap-3">
                  <Image
                    source={{ uri: provider?.avatarUrl }}
                    className="h-14 w-14 rounded-2xl bg-slate-200"
                  />
                  <View className="flex-1">
                    <Text className="text-base font-extrabold text-slate-900">{quote.providerName}</Text>
                    <Text className="mt-0.5 text-xs text-slate-500">{provider?.profession}</Text>
                    <View className="mt-1 flex-row items-center gap-1">
                      <Star size={13} color="#FBBF24" fill="#FBBF24" />
                      <Text className="text-xs font-bold text-slate-700">
                        {provider?.rating ?? 'Novo'} {provider ? `(${provider.reviewCount})` : ''}
                      </Text>
                    </View>
                  </View>
                  {isSelected ? <CheckCircle2 size={25} color={colors.success} /> : null}
                </View>

                <View className="mt-4 flex-row gap-3 rounded-2xl bg-white/70 p-4">
                  <View className="flex-1">
                    <Text className="text-[10px] font-bold uppercase text-slate-400">Valor estimado</Text>
                    <Text className="mt-1 text-2xl font-black text-emerald-700">
                      R$ {quote.amount.toFixed(2).replace('.', ',')}
                    </Text>
                  </View>
                  <View className="w-px bg-slate-200" />
                  <View className="flex-1">
                    <View className="flex-row items-center gap-1.5">
                      <Timer size={15} color={colors.brand700} />
                      <Text className="text-[10px] font-bold uppercase text-slate-400">Duração</Text>
                    </View>
                    <Text className="mt-1 text-sm font-extrabold text-slate-700">{quote.estimatedDuration}</Text>
                  </View>
                </View>

                <Text className="mt-4 text-sm leading-6 text-slate-600">{quote.message}</Text>
                <View className="mt-3 flex-row items-start gap-2 rounded-2xl bg-slate-50 p-3">
                  <PackageCheck size={18} color={quote.includesMaterials ? colors.success : colors.warning} />
                  <View className="flex-1">
                    <Text className="text-xs font-extrabold text-slate-700">
                      {quote.includesMaterials ? 'Materiais incluídos' : 'Materiais não incluídos'}
                    </Text>
                    {quote.materialsDescription ? (
                      <Text className="mt-1 text-xs leading-5 text-slate-500">
                        {quote.materialsDescription}
                      </Text>
                    ) : null}
                  </View>
                </View>

                {!isRejected && request.status === 'open' ? (
                  <View className="mt-4">
                    <Button
                      label="Escolher esta proposta"
                      onPress={() => chooseQuote(quote.id, quote.providerName, quote.amount)}
                    />
                  </View>
                ) : null}
              </View>
            );
          })
        ) : (
          <EmptyState
            icon={<Wrench size={28} color={colors.brand700} />}
            title="Aguardando propostas"
            description="Os profissionais relacionados à categoria receberão o pedido e poderão enviar seus orçamentos."
          />
        )}

        {selectedQuote && request.selectedProviderId ? (
          <View className="mt-2">
            <Button
              label="Agendar com o profissional escolhido"
              icon={<Clock3 size={19} color={colors.white} />}
              onPress={() =>
                router.push({
                  pathname: '/(client)/professional/[id]/booking',
                  params: { id: request.selectedProviderId!, requestId: request.id },
                })
              }
            />
            <View className="mt-3 flex-row items-center justify-center gap-2">
              <ShieldCheck size={15} color={colors.slate500} />
              <Text className="text-xs text-slate-500">A escolha fica registrada para ambas as partes.</Text>
            </View>
          </View>
        ) : null}

        {request.status === 'open' ? (
          <View className="mt-4">
            <Button
              label="Cancelar pedido"
              variant="ghost"
              onPress={() =>
                Alert.alert('Cancelar pedido?', 'Os profissionais não poderão mais enviar propostas.', [
                  { text: 'Voltar', style: 'cancel' },
                  {
                    text: 'Cancelar pedido',
                    style: 'destructive',
                    onPress: () => cancelServiceRequest(request.id),
                  },
                ])
              }
            />
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
