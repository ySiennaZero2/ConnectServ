import { router, useLocalSearchParams } from 'expo-router';
import { CalendarX2, FilePlus2, MessageSquareQuote } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { AppointmentCard } from '@/components/booking/AppointmentCard';
import { CancellationModal } from '@/components/booking/CancellationModal';
import { AnimatedPressable } from '@/components/common/AnimatedPressable';
import { EmptyState } from '@/components/common/EmptyState';
import { Screen } from '@/components/common/Screen';
import { ServiceRequestCard } from '@/components/requests/ServiceRequestCard';
import { colors } from '@/constants/theme';
import { isSupabaseConfigured } from '@/lib/supabase';
import { appointmentsService } from '@/services/appointments';
import { useAppStore } from '@/store/useAppStore';
import type { Appointment, CancellationReason } from '@/types';

type ClientBookingTab = 'quotes' | 'upcoming' | 'history';

export default function ClientBookingsScreen() {
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  const currentUser = useAppStore((state) => state.currentUser);
  const appointments = useAppStore((state) => state.appointments);
  const serviceRequests = useAppStore((state) => state.serviceRequests);
  const serviceQuotes = useAppStore((state) => state.serviceQuotes);
  const cancelAppointment = useAppStore((state) => state.cancelAppointment);
  const [activeTab, setActiveTab] = useState<ClientBookingTab>(
    tab === 'upcoming' || tab === 'history' ? tab : 'quotes',
  );
  const [cancellingAppointment, setCancellingAppointment] = useState<Appointment | null>(null);

  const confirmCancellation = async (
    reason: CancellationReason,
    justification?: string,
  ) => {
    if (!cancellingAppointment) return;
    try {
      if (isSupabaseConfigured) {
        await appointmentsService.cancel(cancellingAppointment.id, reason, justification);
      }
      if (!cancelAppointment(cancellingAppointment.id, reason, justification)) {
        throw new Error('Este serviço não pode mais ser cancelado.');
      }
      setCancellingAppointment(null);
      setActiveTab('history');
      Alert.alert('Serviço cancelado', 'O motivo foi registrado no histórico das duas partes.');
    } catch (error) {
      Alert.alert(
        'Não foi possível cancelar',
        error instanceof Error ? error.message : 'Tente novamente em instantes.',
      );
    }
  };

  const myRequests = useMemo(
    () =>
      serviceRequests
        .filter((request) => request.clientId === currentUser?.id)
        .sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
    [currentUser?.id, serviceRequests],
  );

  const visibleAppointments = useMemo(() => {
    return appointments
      .filter((appointment) => appointment.clientId === currentUser?.id)
      .filter((appointment) =>
        activeTab === 'upcoming'
          ? ['pending', 'accepted'].includes(appointment.status)
          : ['declined', 'cancelled', 'completed'].includes(appointment.status),
      )
      .sort((a, b) =>
        activeTab === 'upcoming'
          ? new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
          : new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime(),
      );
  }, [activeTab, appointments, currentUser?.id]);

  return (
    <Screen>
      <View className="flex-row items-center gap-3 px-5 pb-4 pt-5">
        <View className="flex-1">
          <Text className="text-2xl font-extrabold text-slate-900">Meus serviços</Text>
          <Text className="mt-1 text-sm text-slate-500">Compare propostas e acompanhe agendamentos.</Text>
        </View>
        <AnimatedPressable
          accessibilityLabel="Solicitar novo orçamento"
          accessibilityRole="button"
          onPress={() => router.push('/(client)/request-quote')}
          pressedScale={0.9}
          className="h-12 w-12 items-center justify-center rounded-2xl bg-brand-700"
        >
          <FilePlus2 size={22} color={colors.white} />
        </AnimatedPressable>
      </View>

      <View className="mx-5 mb-5 flex-row rounded-2xl bg-slate-100 p-1">
        {[
          { id: 'quotes' as const, label: 'Orçamentos' },
          { id: 'upcoming' as const, label: 'Agenda' },
          { id: 'history' as const, label: 'Histórico' },
        ].map((tab) => (
          <AnimatedPressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab.id }}
            onPress={() => setActiveTab(tab.id)}
            pressedOpacity={0.75}
            pressedScale={0.97}
            className={`flex-1 items-center rounded-xl py-3 ${
              activeTab === tab.id ? 'bg-white' : 'bg-transparent'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                activeTab === tab.id ? 'text-brand-700' : 'text-slate-500'
              }`}
            >
              {tab.label}
            </Text>
          </AnimatedPressable>
        ))}
      </View>

      <ScrollView contentContainerClassName="px-5 pb-8" showsVerticalScrollIndicator={false}>
        <Animated.View
          key={activeTab}
          entering={FadeIn.duration(160).reduceMotion(ReduceMotion.System)}
        >
          {activeTab === 'quotes' ? (
            myRequests.length ? (
              myRequests.map((request) => (
                <ServiceRequestCard
                  key={request.id}
                  request={request}
                  quoteCount={
                    serviceQuotes.filter((quote) => quote.requestId === request.id).length
                  }
                  onPress={() =>
                    router.push({
                      pathname: '/(client)/request/[requestId]',
                      params: { requestId: request.id },
                    })
                  }
                />
              ))
            ) : (
              <EmptyState
                icon={<MessageSquareQuote size={27} color={colors.brand700} />}
                title="Nenhum orçamento solicitado"
                description="Descreva o serviço uma vez e receba propostas de profissionais da categoria."
              />
            )
          ) : visibleAppointments.length ? (
            visibleAppointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                viewerRole="client"
                onCancel={() => setCancellingAppointment(appointment)}
                onReview={() =>
                  router.push({
                    pathname: '/(client)/review/[appointmentId]',
                    params: { appointmentId: appointment.id },
                  })
                }
              />
            ))
          ) : (
            <EmptyState
              icon={<CalendarX2 size={27} color={colors.brand700} />}
              title={activeTab === 'upcoming' ? 'Nenhum agendamento próximo' : 'Histórico vazio'}
              description="Depois de escolher um orçamento, combine a data do serviço por aqui."
            />
          )}
        </Animated.View>
      </ScrollView>
      <CancellationModal
        appointment={cancellingAppointment}
        onClose={() => setCancellingAppointment(null)}
        onConfirm={confirmCancellation}
      />
    </Screen>
  );
}
