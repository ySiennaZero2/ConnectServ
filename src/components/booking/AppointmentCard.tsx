import { CalendarDays, CircleUserRound, FileText, WalletCards } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { AnimatedPressable } from '@/components/common/AnimatedPressable';
import { StatusBadge } from '@/components/common/StatusBadge';
import { colors } from '@/constants/theme';
import { formatCurrency, getPaymentMethodLabel } from '@/data/paymentMethods';
import type { Appointment, UserRole } from '@/types';
import { formatAppointmentDate } from '@/utils/date';

type AppointmentCardProps = {
  appointment: Appointment;
  viewerRole: UserRole;
  onAccept?: () => void;
  onDecline?: () => void;
  onComplete?: () => void;
  onCancel?: () => void;
  onReview?: () => void;
  onProfilePress?: () => void;
};

export function AppointmentCard({
  appointment,
  viewerRole,
  onAccept,
  onDecline,
  onComplete,
  onCancel,
  onReview,
  onProfilePress,
}: AppointmentCardProps) {
  const otherParty =
    viewerRole === 'provider' ? appointment.clientName : appointment.providerName;
  const canReview =
    appointment.status === 'completed' &&
    (viewerRole === 'client'
      ? !appointment.clientReviewed
      : !appointment.providerReviewed);

  return (
    <View
      className="mb-4 rounded-3xl border border-slate-100 bg-white p-5"
      style={{ shadowColor: '#0F172A', shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 }}
    >
      <View className="flex-row items-start justify-between gap-3">
        <AnimatedPressable
          accessibilityLabel={`Abrir perfil de ${otherParty}`}
          accessibilityRole="button"
          disabled={!onProfilePress}
          onPress={onProfilePress}
          className="flex-1 flex-row items-center gap-3 rounded-2xl"
        >
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-brand-50">
            <CircleUserRound size={24} color={colors.brand700} />
          </View>
          <View className="flex-1">
            <Text className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              {viewerRole === 'provider' ? 'Cliente' : 'Profissional'}
            </Text>
            <Text className="text-base font-bold text-slate-900" numberOfLines={1}>
              {otherParty}
            </Text>
          </View>
        </AnimatedPressable>
        <StatusBadge status={appointment.status} />
      </View>

      <View className="mt-4 gap-3 rounded-2xl bg-slate-50 p-4">
        <View className="flex-row items-center gap-2">
          <CalendarDays size={17} color={colors.brand700} />
          <Text className="font-semibold text-slate-700">
            {formatAppointmentDate(appointment.scheduledAt)}
          </Text>
        </View>
        <View className="flex-row items-start gap-2">
          <FileText size={17} color={colors.slate500} />
          <Text className="flex-1 leading-5 text-slate-600">{appointment.details}</Text>
        </View>
      </View>

      {appointment.rejectionReason ? (
        <View className="mt-3 rounded-2xl bg-red-50 p-3">
          <Text className="text-xs font-bold uppercase text-red-600">Justificativa</Text>
          <Text className="mt-1 text-sm leading-5 text-red-700">
            {appointment.rejectionReason}
          </Text>
        </View>
      ) : null}

      {viewerRole === 'provider' && appointment.status === 'completed' && appointment.finalAmount ? (
        <View className="mt-3 flex-row items-center gap-3 rounded-2xl bg-emerald-50 p-3">
          <WalletCards size={19} color={colors.success} />
          <View className="flex-1">
            <Text className="text-xs font-bold text-emerald-700">
              {getPaymentMethodLabel(appointment.paymentMethod)}
            </Text>
            <Text className="mt-0.5 font-black text-emerald-800">
              {formatCurrency(appointment.finalAmount)}
            </Text>
          </View>
        </View>
      ) : null}

      {viewerRole === 'provider' && appointment.status === 'pending' ? (
        <View className="mt-4 flex-row gap-3">
          <View className="flex-1">
            <Button label="Recusar" onPress={() => onDecline?.()} variant="danger" />
          </View>
          <View className="flex-1">
            <Button label="Aceitar" onPress={() => onAccept?.()} variant="success" />
          </View>
        </View>
      ) : null}

      {viewerRole === 'provider' && appointment.status === 'accepted' ? (
        <View className="mt-4 gap-3">
          <Button label="Marcar como concluído" onPress={() => onComplete?.()} />
          <Button label="Cancelar serviço" variant="danger" onPress={() => onCancel?.()} />
        </View>
      ) : null}

      {viewerRole === 'client' && appointment.status === 'accepted' ? (
        <View className="mt-4">
          <Button label="Cancelar serviço" variant="danger" onPress={() => onCancel?.()} />
        </View>
      ) : null}

      {canReview ? (
        <View className="mt-4">
          <Button label={`Avaliar ${otherParty}`} onPress={() => onReview?.()} />
        </View>
      ) : null}

      {appointment.status === 'completed' && !canReview ? (
        <Text className="mt-4 text-center text-sm font-medium text-green-700">
          Avaliação enviada ✓
        </Text>
      ) : null}
    </View>
  );
}
