import { useProviderCatalog } from '@/hooks/useProviderCatalog';
import { snapshotItems } from '@/utils/catalog';
import { router, useFocusEffect, type Href } from 'expo-router';
import { BellRing, CalendarClock, CalendarX2, CheckCircle2, History } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { Alert, ScrollView, Switch, Text, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';

import { AppointmentCard } from '@/components/booking/AppointmentCard';
import { CancellationModal } from '@/components/booking/CancellationModal';
import { CompletionPaymentModal } from '@/components/booking/CompletionPaymentModal';
import { DeclineModal } from '@/components/booking/DeclineModal';
import { PlanLimitModal } from '@/components/subscriptions/PlanLimitModal';
import { AnimatedPressable } from '@/components/common/AnimatedPressable';
import { EmptyState } from '@/components/common/EmptyState';
import { Screen } from '@/components/common/Screen';
import { colors } from '@/constants/theme';
import { isSupabaseConfigured } from '@/lib/supabase';
import { hasReachedMonthlyServiceLimit } from '@/data/subscriptionPlans';
import { appointmentsService } from '@/services/appointments';
import { useAppStore } from '@/store/useAppStore';
import type { Appointment, CancellationReason, PaymentMethod, SelectedItem } from '@/types';

type DashboardTab = 'pending' | 'confirmed' | 'history';

const tabs: { id: DashboardTab; label: string }[] = [
  { id: 'pending', label: 'Pendentes' },
  { id: 'confirmed', label: 'Confirmadas' },
  { id: 'history', label: 'Histórico' },
];

export default function ProviderDashboardScreen() {
  const catalog = useProviderCatalog();
  const [remoteAppointments, setRemoteAppointments] = useState<Appointment[]>([]);
  const [loadError, setLoadError] = useState('');
  const reloadAppointments = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoadError('');
    try { setRemoteAppointments(await appointmentsService.listForProvider()); }
    catch (cause) { setLoadError(cause instanceof Error ? cause.message : 'Erro ao carregar atendimentos.'); }
  }, []);
  useFocusEffect(useCallback(() => { void reloadAppointments(); }, [reloadAppointments]));
  const currentUser = useAppStore((state) => state.currentUser);
  const provider = useAppStore((state) =>
    state.providers.find((item) => item.id === state.currentUser?.id),
  );
  const appointments = useAppStore((state) => state.appointments);
  const setAgendaOpen = useAppStore((state) => state.setAgendaOpen);
  const setAppointmentStatus = useAppStore((state) => state.setAppointmentStatus);
  const acceptAppointmentInStore = useAppStore((state) => state.acceptAppointment);
  const completeAppointmentInStore = useAppStore((state) => state.completeAppointment);
  const cancelAppointment = useAppStore((state) => state.cancelAppointment);
  const [activeTab, setActiveTab] = useState<DashboardTab>('pending');
  const [decliningAppointment, setDecliningAppointment] = useState<Appointment | null>(null);
  const [completingAppointment, setCompletingAppointment] = useState<Appointment | null>(null);
  const [cancellingAppointment, setCancellingAppointment] = useState<Appointment | null>(null);
  const [planLimitVisible, setPlanLimitVisible] = useState(false);

  const providerAppointments = useMemo(
    () => isSupabaseConfigured ? remoteAppointments : appointments.filter((appointment) => appointment.providerId === currentUser?.id),
    [appointments, currentUser?.id, remoteAppointments],
  );
  const pendingCount = providerAppointments.filter((item) => item.status === 'pending').length;

  const alertCount = pendingCount;

  const visibleAppointments = useMemo(() => {
    const statuses =
      activeTab === 'pending'
        ? ['pending']
        : activeTab === 'confirmed'
          ? ['accepted']
          : ['completed', 'declined', 'cancelled'];
    return providerAppointments
      .filter((appointment) => statuses.includes(appointment.status))
      .sort((a, b) =>
        activeTab === 'history'
          ? new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
          : new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
      );
  }, [activeTab, providerAppointments]);

  const acceptAppointment = async (appointment: Appointment) => {
    if (provider && hasReachedMonthlyServiceLimit(provider)) {
      setPlanLimitVisible(true);
      return;
    }
    try {
      if (isSupabaseConfigured) {
        await appointmentsService.respond(appointment.id, 'accepted');
      }
      const result = isSupabaseConfigured ? 'accepted' : acceptAppointmentInStore(appointment.id);
      if (isSupabaseConfigured) await reloadAppointments();
      if (result === 'limit_reached') {
        setPlanLimitVisible(true);
        return;
      }
      if (result !== 'accepted') throw new Error('Esta solicitação não está mais disponível.');
      Alert.alert('Agendamento confirmado', `${appointment.clientName} será avisado da confirmação.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Tente novamente em instantes.';
      if (message.includes('LIMIT_MONTHLY_FREE_PLAN')) {
        setPlanLimitVisible(true);
        return;
      }
      Alert.alert('Não foi possível aceitar', message);
    }
  };

  const completeAppointment = async (
    finalAmount: number,
    paymentMethod: PaymentMethod,
    items: SelectedItem[],
  ) => {
    if (!completingAppointment) throw new Error('Selecione um atendimento.');
    if (isSupabaseConfigured) {
      await appointmentsService.complete(completingAppointment.id, finalAmount, paymentMethod, items);
      await reloadAppointments();
    } else if (!completeAppointmentInStore(completingAppointment.id, finalAmount, paymentMethod,
      snapshotItems(catalog.items, items))) {
      throw new Error('Este atendimento não pode ser concluído. Revise os dados.');
    }
    setCompletingAppointment(null);
    setActiveTab('history');
    Alert.alert('Serviço concluído', 'Recebimento e custos registrados no dashboard financeiro.');
  };

  const confirmCancellation = async (
    reason: CancellationReason,
    justification?: string,
  ) => {
    if (!cancellingAppointment) return;
    try {
      if (isSupabaseConfigured) {
        await appointmentsService.cancel(cancellingAppointment.id, reason, justification);
      }
      if (isSupabaseConfigured) await reloadAppointments();
      if (!isSupabaseConfigured && !cancelAppointment(cancellingAppointment.id, reason, justification)) {
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

  return (
    <Screen>
      {loadError ? <View className="p-4"><Text className="text-red-700">{loadError}</Text>
        <AnimatedPressable onPress={() => void reloadAppointments()}><Text className="py-3 font-bold text-brand-700">Tentar novamente</Text></AnimatedPressable></View> : null}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="pb-8">
        <View className="rounded-b-[36px] bg-brand-700 px-5 pb-7 pt-4">
          <View className="flex-row items-start justify-between">
            <View>
              <Text className="text-sm text-brand-200">Olá, {currentUser?.fullName.split(' ')[0]} 👋</Text>
              <Text className="mt-1 text-2xl font-extrabold text-white">Central de serviços</Text>
            </View>
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-white/20">
              <BellRing size={22} color={colors.white} />
              {alertCount ? (
                <View className="absolute -right-1 -top-1 h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1">
                  <Text className="text-[10px] font-extrabold text-white">{alertCount}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View className="mt-5 flex-row items-center justify-between rounded-3xl bg-white/10 p-4">
            <View className="flex-1 pr-4">
              <Text className="font-extrabold text-white">Agenda aberta</Text>
              <Text className="mt-1 text-sm leading-5 text-brand-100">
                {provider?.profileHidden
                  ? 'Modo férias ativo. Seu perfil está oculto das buscas.'
                  : provider?.agendaOpen
                    ? 'Seu perfil aparece nas buscas e aceita pedidos.'
                    : 'Novas solicitações estão pausadas.'}
              </Text>
            </View>
            <Switch
              accessibilityLabel="Alternar agenda aberta"
              value={provider?.agendaOpen ?? false}
              onValueChange={setAgendaOpen}
              trackColor={{ false: '#A78BFA', true: '#4ADE80' }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        {pendingCount ? (
          <View className="mx-5 mt-5 flex-row gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <CalendarClock size={21} color={colors.warning} />
            <View className="flex-1">
              <Text className="font-bold text-amber-800">
                {pendingCount} {pendingCount === 1 ? 'solicitação aguardando' : 'solicitações aguardando'}
              </Text>
              <Text className="mt-1 text-sm leading-5 text-amber-700">Responda rápido para manter uma boa experiência.</Text>
            </View>
          </View>
        ) : null}

        <View className="mx-5 mt-6 flex-row rounded-2xl bg-slate-100 p-1">
          {tabs.map((tab) => {
            const selected = activeTab === tab.id;
            const badge = tab.id === 'pending' ? pendingCount : 0;
            return (
              <AnimatedPressable
                key={tab.id}
                onPress={() => setActiveTab(tab.id)}
                pressedOpacity={0.75}
                pressedScale={0.97}
                className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-3 ${
                  selected ? 'bg-white' : 'bg-transparent'
                }`}
              >
                <Text className={`text-[10px] font-bold ${selected ? 'text-brand-700' : 'text-slate-500'}`}>
                  {tab.label}
                </Text>
                {badge ? (
                  <View className="min-w-5 items-center rounded-full bg-red-100 px-1.5 py-0.5">
                    <Text className="text-[10px] font-extrabold text-red-600">{badge}</Text>
                  </View>
                ) : null}
              </AnimatedPressable>
            );
          })}
        </View>

        <Animated.View
          key={activeTab}
          entering={FadeIn.duration(160).reduceMotion(ReduceMotion.System)}
          className="mt-5 px-5"
        >
          {visibleAppointments.length ? (
            visibleAppointments.map((appointment) => (
              <AppointmentCard
                key={appointment.id}
                appointment={appointment}
                viewerRole="provider"
                onAccept={() => acceptAppointment(appointment)}
                onDecline={() => setDecliningAppointment(appointment)}
                onComplete={() => setCompletingAppointment(appointment)}
                onCancel={() => setCancellingAppointment(appointment)}
                onProfilePress={() =>
                  router.push({
                    pathname: '/(provider)/client/[clientId]',
                    params: { clientId: appointment.clientId },
                  } as unknown as Href)
                }
                onReview={() =>
                  router.push({
                    pathname: '/(provider)/review/[appointmentId]',
                    params: { appointmentId: appointment.id },
                  })
                }
              />
            ))
          ) : (
            <EmptyState
              icon={
                activeTab === 'pending' ? (
                  <CalendarX2 size={27} color={colors.brand700} />
                ) : activeTab === 'confirmed' ? (
                  <CheckCircle2 size={27} color={colors.brand700} />
                ) : (
                  <History size={27} color={colors.brand700} />
                )
              }
              title={
                activeTab === 'pending'
                  ? 'Tudo em dia!'
                  : activeTab === 'confirmed'
                    ? 'Nenhum serviço confirmado'
                    : 'Histórico vazio'
              }
              description={
                activeTab === 'pending'
                  ? 'Você não possui novas solicitações para responder.'
                  : 'Os serviços desta categoria aparecerão aqui.'
              }
            />
          )}
        </Animated.View>
      </ScrollView>

      <DeclineModal
        visible={Boolean(decliningAppointment)}
        clientName={decliningAppointment?.clientName}
        onClose={() => setDecliningAppointment(null)}
        onConfirm={async (reason) => {
          if (!decliningAppointment) return;
          try {
            if (isSupabaseConfigured) {
              await appointmentsService.respond(decliningAppointment.id, 'declined', reason);
              await reloadAppointments();
            } else setAppointmentStatus(decliningAppointment.id, 'declined', reason);
          } catch (cause) {
            Alert.alert('Não foi possível recusar', cause instanceof Error ? cause.message : 'Tente novamente.');
            return;
          }
          setDecliningAppointment(null);
          Alert.alert('Solicitação recusada', 'O cliente receberá sua justificativa.');
        }}
      />

      <CompletionPaymentModal
        appointment={completingAppointment}
        onClose={() => setCompletingAppointment(null)}
        key={completingAppointment?.id ?? 'closed'}
        catalog={catalog.items}
        catalogLoading={catalog.loading}
        catalogError={catalog.error}
        onRetryCatalog={() => void catalog.reload()}
        onConfirm={completeAppointment}
      />

      <CancellationModal
        appointment={cancellingAppointment}
        onClose={() => setCancellingAppointment(null)}
        onConfirm={confirmCancellation}
      />

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
