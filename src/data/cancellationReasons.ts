import type { CancellationReason, UserRole } from '@/types';

export const cancellationReasonOptions: {
  id: CancellationReason;
  label: string;
}[] = [
  { id: 'communication_failure', label: 'Falta de comunicação' },
  { id: 'service_disagreement', label: 'Desacordo sobre o serviço' },
  { id: 'lateness', label: 'Impontualidade' },
  { id: 'other', label: 'Outros' },
];

export function getCancellationReasonLabel(reason: CancellationReason) {
  return cancellationReasonOptions.find((item) => item.id === reason)?.label ?? 'Outros';
}

export function getCancellationAuthorLabel(role: UserRole) {
  return role === 'client' ? 'Cliente' : 'Prestador';
}
