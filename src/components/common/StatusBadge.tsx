import { Text, View } from 'react-native';

import type { AppointmentStatus } from '@/types';

const badgeConfig: Record<AppointmentStatus, { label: string; classes: string }> = {
  pending: { label: 'Pendente', classes: 'bg-amber-100 text-amber-700' },
  accepted: { label: 'Confirmado', classes: 'bg-green-100 text-green-700' },
  declined: { label: 'Recusado', classes: 'bg-red-100 text-red-700' },
  completed: { label: 'Concluído', classes: 'bg-slate-200 text-slate-700' },
  cancelled: { label: 'Cancelado', classes: 'bg-slate-200 text-slate-600' },
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const config = badgeConfig[status];
  const [backgroundClass, textClass] = config.classes.split(' ');

  return (
    <View className={`rounded-full px-3 py-1 ${backgroundClass}`}>
      <Text className={`text-xs font-bold ${textClass}`}>{config.label}</Text>
    </View>
  );
}
