import type { PaymentMethod } from '@/types';

export const paymentMethodOptions: {
  id: PaymentMethod;
  label: string;
  shortLabel: string;
}[] = [
  { id: 'pix', label: 'Pix', shortLabel: 'Pix' },
  { id: 'credit_card', label: 'Cartão de Crédito', shortLabel: 'Crédito' },
  { id: 'debit_card', label: 'Cartão de Débito', shortLabel: 'Débito' },
  { id: 'cash', label: 'Dinheiro', shortLabel: 'Dinheiro' },
];

export function getPaymentMethodLabel(method?: PaymentMethod) {
  return paymentMethodOptions.find((option) => option.id === method)?.label ?? 'Não informado';
}

export function formatCurrency(amount: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
}
