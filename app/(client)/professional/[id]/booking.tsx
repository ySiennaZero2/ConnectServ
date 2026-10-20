import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CalendarCheck2, CheckCircle2 } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View } from 'react-native';

import { BookingCalendar } from '@/components/booking/BookingCalendar';
import { AnimatedPressable } from '@/components/common/AnimatedPressable';
import { Button } from '@/components/common/Button';
import { Screen } from '@/components/common/Screen';
import { colors } from '@/constants/theme';
import { getServicePresentation } from '@/data/serviceCatalog';
import { useAppStore } from '@/store/useAppStore';
import { toScheduledIso } from '@/utils/date';

export default function BookingScreen() {
  const { id, requestId } = useLocalSearchParams<{ id: string; requestId?: string }>();
  const provider = useAppStore((state) => state.providers.find((item) => item.id === id));
  const relatedRequest = useAppStore((state) =>
    state.serviceRequests.find((request) => request.id === requestId),
  );
  const selectedQuote = useAppStore((state) =>
    state.serviceQuotes.find((quote) => quote.id === relatedRequest?.selectedQuoteId),
  );
  const createAppointment = useAppStore((state) => state.createAppointment);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [details, setDetails] = useState(relatedRequest?.description.slice(0, 500) ?? '');

  if (!provider) return null;
  const service = getServicePresentation(provider.profession);

  const handleBook = () => {
    if (!selectedDate || !selectedTime || details.trim().length < 10) {
      Alert.alert(
        'Complete a solicitação',
        'Selecione data e horário e descreva o serviço com pelo menos 10 caracteres.',
      );
      return;
    }

    const appointment = createAppointment({
      providerId: provider.id,
      scheduledAt: toScheduledIso(selectedDate, selectedTime),
      details,
    });
    if (!appointment) {
      Alert.alert('Agenda indisponível', 'Este profissional não está recebendo solicitações agora.');
      return;
    }

    Alert.alert(
      'Solicitação enviada!',
      `${provider.fullName} recebeu seu pedido e poderá confirmar ou recusar o horário.`,
      [
        {
          text: 'Acompanhar pedido',
          onPress: () =>
            router.replace({
              pathname: '/(client)/(tabs)/bookings',
              params: { tab: 'upcoming' },
            }),
        },
      ],
    );
  };

  return (
    <Screen bottomInset className="bg-white">
      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
          <Text className="flex-1 pr-10 text-center text-base font-black text-slate-950">Agendar serviço</Text>
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerClassName="px-5 pb-7">
          <View className="mt-5 flex-row items-center gap-3 rounded-2xl bg-brand-50 p-4">
            <View className="h-11 w-11 items-center justify-center rounded-xl bg-brand-600">
              <CalendarCheck2 size={22} color={colors.white} />
            </View>
            <View className="flex-1">
              <Text className="font-black text-slate-950">{service.title}</Text>
              <Text className="mt-1 text-xs text-slate-500">com {provider.fullName}</Text>
            </View>
            {selectedQuote ? (
              <View className="items-end">
                <Text className="text-[10px] font-bold text-emerald-700">Valor acordado</Text>
                <Text className="font-black text-emerald-700">
                  R$ {selectedQuote.amount.toFixed(0)}
                </Text>
              </View>
            ) : null}
          </View>

          {selectedQuote ? (
            <View className="mt-3 flex-row gap-3 rounded-2xl bg-emerald-50 p-4">
              <CheckCircle2 size={20} color={colors.success} />
              <View className="flex-1">
                <Text className="font-extrabold text-emerald-800">Orçamento escolhido</Text>
                <Text className="mt-1 text-xs leading-5 text-emerald-700">
                  O relato do problema foi preenchido abaixo. Fotos e vídeos continuam disponíveis no pedido original.
                </Text>
              </View>
            </View>
          ) : null}

          <Text className="mt-7 text-2xl font-black text-slate-950">Escolha o melhor horário</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-500">O profissional receberá sua solicitação para confirmar.</Text>
          <View className="mt-5">
            <BookingCalendar
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onSelectDate={(date) => {
                setSelectedDate(date);
                setSelectedTime(null);
              }}
              onSelectTime={setSelectedTime}
              availability={provider.availability}
              agendaOpen={provider.agendaOpen}
            />
          </View>

          <View className="mt-7">
            <Text className="mb-2 font-black text-slate-900">Detalhes do serviço</Text>
            <TextInput
              value={details}
              onChangeText={setDetails}
              placeholder="Descreva o que precisa ser feito e outras informações úteis."
              placeholderTextColor={colors.slate400}
              multiline
              maxLength={500}
              textAlignVertical="top"
              className="min-h-32 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-base text-slate-900"
            />
            <Text className="mt-2 text-right text-xs text-slate-400">{details.length}/500</Text>
          </View>

          <View className="mt-6">
            <Button label="Enviar solicitação" onPress={handleBook} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
