import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {
  ArrowLeft,
  Banknote,
  CalendarRange,
  CheckCircle2,
  FileDown,
  ReceiptText,
  WalletCards,
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { isSupabaseConfigured } from '@/lib/supabase';
import { appointmentsService } from '@/services/appointments';
import { Alert, ScrollView, Text, View } from 'react-native';

import { AnimatedPressable } from '@/components/common/AnimatedPressable';
import { Button } from '@/components/common/Button';
import { Screen } from '@/components/common/Screen';
import { colors } from '@/constants/theme';
import {
  formatCurrency,
  getPaymentMethodLabel,
  paymentMethodOptions,
} from '@/data/paymentMethods';
import type { Appointment, PaymentMethod, SubscriptionPlan } from '@/types';

type ProviderFinancialDashboardProps = {
  appointments: Appointment[];
  onBack: () => void;
  currentPlan: SubscriptionPlan;
};

const paymentColors: Record<PaymentMethod, string> = {
  pix: '#059669',
  credit_card: '#075FE4',
  debit_card: '#7C3AED',
  cash: '#D97706',
};

function getReceiptDate(appointment: Appointment) {
  return new Date(appointment.completedAt ?? appointment.scheduledAt);
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function ProviderFinancialDashboard({
  appointments,
  onBack,
  currentPlan,
}: ProviderFinancialDashboardProps) {
  const [remoteAppointments, setRemoteAppointments] = useState<Appointment[]>([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const reload = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true); setLoadError('');
    try { setRemoteAppointments(await appointmentsService.listForProvider()); }
    catch (cause) { setLoadError(cause instanceof Error ? cause.message : 'Erro ao carregar o financeiro.'); }
    finally { setLoading(false); }
  }, []);
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  const source = isSupabaseConfigured ? remoteAppointments : appointments;
  const receipts = useMemo(
    () =>
      source
        .filter(
          (appointment) =>
            appointment.status === 'completed' &&
            typeof appointment.finalAmount === 'number' &&
            appointment.finalAmount > 0 &&
            appointment.paymentMethod,
        )
        .sort((a, b) => getReceiptDate(b).getTime() - getReceiptDate(a).getTime()),
    [source],
  );

  const now = new Date();
  const totalEarnings = receipts.reduce((sum, item) => sum + (item.finalAmount ?? 0), 0);
  const totalCosts = receipts.reduce((sum, item) => sum + (item.totalCost ?? 0), 0);
  const netProfit = totalEarnings - totalCosts;
  const unknownCosts = receipts.filter((item) => item.totalCost == null).length;
  const currentMonthEarnings = receipts
    .filter((item) => {
      const date = getReceiptDate(item);
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    })
    .reduce((sum, item) => sum + (item.finalAmount ?? 0), 0);

  const paymentTotals = paymentMethodOptions.map((option) => ({
    ...option,
    total: receipts
      .filter((item) => item.paymentMethod === option.id)
      .reduce((sum, item) => sum + (item.finalAmount ?? 0), 0),
  }));
  const maxPaymentTotal = Math.max(...paymentTotals.map((item) => item.total), 1);

  const monthlyTotals = Array.from({ length: 6 }, (_, reverseIndex) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - reverseIndex), 1);
    const total = receipts
      .filter((item) => {
        const receiptDate = getReceiptDate(item);
        return (
          receiptDate.getMonth() === date.getMonth() &&
          receiptDate.getFullYear() === date.getFullYear()
        );
      })
      .reduce((sum, item) => sum + (item.finalAmount ?? 0), 0);
    return {
      key: `${date.getFullYear()}-${date.getMonth()}`,
      label: date
        .toLocaleDateString('pt-BR', { month: 'short' })
        .replace('.', '')
        .slice(0, 3),
      total,
    };
  });
  const maxMonthlyTotal = Math.max(...monthlyTotals.map((item) => item.total), 1);

  const exportPdf = async () => {
    try {
      const paymentRows = paymentTotals
        .map(
          (item) =>
            `<tr><td>${escapeHtml(item.label)}</td><td>${formatCurrency(item.total)}</td></tr>`,
        )
        .join('');
      const receiptRows = receipts
        .slice(0, 50)
        .map(
          (receipt) =>
            `<tr><td>${escapeHtml(receipt.service)}</td><td>${getReceiptDate(receipt).toLocaleDateString('pt-BR')}</td><td>${escapeHtml(getPaymentMethodLabel(receipt.paymentMethod))}</td><td>${formatCurrency(receipt.finalAmount ?? 0)}</td><td>${receipt.totalCost == null ? "Não informado" : formatCurrency(receipt.totalCost)}</td><td>${receipt.totalCost == null ? "—" : formatCurrency((receipt.finalAmount ?? 0) - receipt.totalCost)}</td></tr>`,
        )
        .join('');
      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: Arial, sans-serif; color: #0f172a; padding: 28px; }
              h1 { color: #4c1d95; margin-bottom: 4px; }
              .muted { color: #64748b; font-size: 12px; }
              .summary { display: flex; gap: 12px; margin: 24px 0; }
              .card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; flex: 1; }
              .value { font-size: 20px; font-weight: 700; margin-top: 6px; }
              table { width: 100%; border-collapse: collapse; margin-top: 12px; }
              th, td { border-bottom: 1px solid #e2e8f0; padding: 9px; text-align: left; font-size: 12px; }
              th { background: #f8fafc; }
              h2 { margin-top: 28px; font-size: 17px; }
            </style>
          </head>
          <body>
            <h1>Relatório Financeiro ConectaServ</h1>
            <div class="muted">Gerado em ${new Date().toLocaleString('pt-BR')}</div>
            <div class="summary">
              <div class="card"><div>Faturamento bruto</div><div class="value">${formatCurrency(totalEarnings)}</div></div>
              <div class="card"><div>Custos de insumos/produtos</div><div class="value">${formatCurrency(totalCosts)}</div></div>
              <div class="card"><div>Lucro líquido real</div><div class="value">${formatCurrency(netProfit)}</div></div>
              <div class="card"><div>Ganhos no mês</div><div class="value">${formatCurrency(currentMonthEarnings)}</div></div>
              <div class="card"><div>Serviços feitos</div><div class="value">${receipts.length}</div></div>
            </div>
            ${unknownCosts ? `<p class="muted">${unknownCosts} recebimentos antigos sem custos registrados; lucro considera somente os custos conhecidos.</p>` : ''}
            <h2>Ganhos por forma de pagamento</h2>
            <table><thead><tr><th>Forma</th><th>Total</th></tr></thead><tbody>${paymentRows}</tbody></table>
            <h2>Últimos recebimentos</h2>
            <table><thead><tr><th>Serviço</th><th>Data</th><th>Pagamento</th><th>Valor</th><th>Custo</th><th>Lucro</th></tr></thead><tbody>${receiptRows || '<tr><td colspan="6">Nenhum recebimento registrado.</td></tr>'}</tbody></table>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: 'Compartilhar relatório financeiro',
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Relatório gerado', `O PDF foi salvo em: ${uri}`);
      }
    } catch (error) {
      Alert.alert(
        'Não foi possível exportar',
        error instanceof Error ? error.message : 'Tente novamente em instantes.',
      );
    }
  };

  return (
    <Screen className="bg-slate-50">
      <View className="flex-row items-center border-b border-slate-100 bg-white px-5 py-3">
        <AnimatedPressable
          accessibilityLabel="Voltar para Minha Conta"
          onPress={onBack}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-slate-100"
        >
          <ArrowLeft size={22} color={colors.slate900} />
        </AnimatedPressable>
        <View className="flex-1 pr-10">
          <Text className="text-center text-base font-black text-slate-950">
            Pagamentos e recebimentos
          </Text>
          <Text className="text-center text-[11px] text-slate-500">Gerenciador financeiro</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-5 pb-8">
        {loading ? <Text className="mt-4 text-slate-500">Carregando recebimentos...</Text> : null}
        {loadError ? <View className="mt-4 gap-3"><Text className="text-red-700">{loadError}</Text>
          <Button label="Tentar novamente" onPress={() => void reload()} /></View> : null}
        <View className="mt-5 rounded-3xl bg-brand-700 p-5">
          <View className="flex-row items-center gap-2">
            <WalletCards size={20} color={colors.brand100} />
            <Text className="text-sm font-bold text-brand-100">Faturamento bruto</Text>
          </View>
          <Text className="mt-3 text-3xl font-black text-white">
            {formatCurrency(totalEarnings)}
          </Text>
          <Text className="mt-2 text-xs leading-5 text-brand-100">
            Valores informados ao concluir cada serviço. O app não movimenta o dinheiro.
          </Text>
        </View>

        <View className="mt-3 gap-3">
          <View className="rounded-2xl border border-slate-100 bg-white p-4">
            <Text className="text-xs font-bold text-slate-500">Custos de insumos/produtos</Text>
            <Text className="mt-1 text-xl font-black text-slate-950">{formatCurrency(totalCosts)}</Text>
          </View>
          <View className="rounded-2xl border border-slate-100 bg-white p-4">
            <Text className="text-xs font-bold text-slate-500">Lucro líquido real</Text>
            <Text className={`mt-1 text-xl font-black ${netProfit < 0 ? 'text-red-700' : 'text-emerald-700'}`}>{formatCurrency(netProfit)}</Text>
            <Text className="mt-1 text-xs text-slate-500">Faturamento bruto menos custos de produtos utilizados.</Text>
          </View>
          {unknownCosts ? <Text className="text-xs text-amber-800">{unknownCosts} recebimentos antigos sem custos registrados. O lucro considera somente os custos conhecidos.</Text> : null}
        </View>
        <View className="mt-3 flex-row gap-3">
          <View className="flex-1 rounded-2xl border border-slate-100 bg-white p-4">
            <CalendarRange size={20} color={colors.brand700} />
            <Text className="mt-3 text-xs font-bold text-slate-500">Ganhos no mês</Text>
            <Text className="mt-1 text-lg font-black text-slate-950">
              {formatCurrency(currentMonthEarnings)}
            </Text>
          </View>
          <View className="flex-1 rounded-2xl border border-slate-100 bg-white p-4">
            <CheckCircle2 size={20} color={colors.success} />
            <Text className="mt-3 text-xs font-bold text-slate-500">Serviços feitos</Text>
            <Text className="mt-1 text-lg font-black text-slate-950">{receipts.length}</Text>
          </View>
        </View>

        {currentPlan === 'gratuito' ? (
          <View className="mt-6 rounded-3xl border border-blue-200 bg-blue-50 p-5">
            <Text className="font-black text-blue-900">Relatórios completos no Plano Profissional</Text>
            <Text className="mt-2 text-sm leading-5 text-blue-700">
              Faça upgrade para visualizar evolução mensal e distribuição por forma de pagamento.
            </Text>
          </View>
        ) : (
          <>
        <View className="mt-6 rounded-3xl border border-slate-100 bg-white p-5">
          <Text className="text-base font-black text-slate-950">Evolução dos últimos 6 meses</Text>
          <View className="mt-5 h-40 flex-row items-end justify-between gap-2">
            {monthlyTotals.map((month) => {
              const height = month.total
                ? Math.max(16, (month.total / maxMonthlyTotal) * 112)
                : 5;
              return (
                <View key={month.key} className="flex-1 items-center">
                  <Text className="mb-2 text-[9px] font-bold text-slate-500" numberOfLines={1}>
                    {month.total ? formatCurrency(month.total).replace(',00', '') : '—'}
                  </Text>
                  <View
                    className={`w-full rounded-t-lg ${month.total ? 'bg-brand-600' : 'bg-slate-200'}`}
                    style={{ height }}
                  />
                  <Text className="mt-2 text-[10px] font-bold capitalize text-slate-500">
                    {month.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View className="mt-6 rounded-3xl border border-slate-100 bg-white p-5">
          <Text className="text-base font-black text-slate-950">Por forma de pagamento</Text>
          <View className="mt-4 gap-4">
            {paymentTotals.map((item) => (
              <View key={item.id}>
                <View className="mb-2 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-2">
                    <View
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: paymentColors[item.id] }}
                    />
                    <Text className="text-xs font-bold text-slate-600">{item.shortLabel}</Text>
                  </View>
                  <Text className="text-xs font-black text-slate-800">
                    {formatCurrency(item.total)}
                  </Text>
                </View>
                <View className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <View
                    className="h-full rounded-full"
                    style={{
                      backgroundColor: paymentColors[item.id],
                      width: `${item.total ? Math.max(4, (item.total / maxPaymentTotal) * 100) : 0}%`,
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>
          </>
        )}

        {currentPlan === 'premium' ? (
          <View className="mt-6 rounded-3xl border border-amber-300 bg-amber-50 p-5">
            <Text className="font-black text-amber-950">Relatório financeiro Premium</Text>
            <Text className="mt-1 text-sm leading-5 text-amber-800">
              Gere um demonstrativo em PDF com ganhos, formas de pagamento e histórico.
            </Text>
            <View className="mt-4">
              <Button
                label="Exportar relatório em PDF"
                variant="secondary"
                icon={<FileDown size={19} color={colors.brand700} />}
                disabled={loading || Boolean(loadError)}
                onPress={exportPdf}
              />
            </View>
          </View>
        ) : null}

        <View className="mt-7 flex-row items-center gap-2">
          <ReceiptText size={20} color={colors.brand700} />
          <Text className="text-lg font-black text-slate-950">Últimos recebimentos</Text>
        </View>
        <View className="mt-3 overflow-hidden rounded-3xl border border-slate-100 bg-white">
          {receipts.length ? (
            receipts.slice(0, 10).map((receipt, index) => (
              <View
                key={receipt.id}
                className={`flex-row items-center gap-3 px-4 py-4 ${
                  index < Math.min(receipts.length, 10) - 1 ? 'border-b border-slate-100' : ''
                }`}
              >
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50">
                  <Banknote size={20} color={colors.success} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="font-extrabold text-slate-900" numberOfLines={1}>
                    {receipt.service}
                  </Text>
                  <Text className="mt-1 text-xs text-slate-500">
                    {getReceiptDate(receipt).toLocaleDateString('pt-BR')} ·{' '}
                    {getPaymentMethodLabel(receipt.paymentMethod)}
                  </Text>
                  <Text className="mt-1 text-xs text-slate-500">Custo: {receipt.totalCost == null ? 'não informado' : formatCurrency(receipt.totalCost)} · Lucro: {receipt.totalCost == null ? '—' : formatCurrency((receipt.finalAmount ?? 0) - receipt.totalCost)}</Text>
                  {receipt.items?.map((item, itemIndex) => <Text key={itemIndex} className="mt-1 text-xs text-slate-500">{item.quantity} × {item.name} · {formatCurrency(item.unitPrice)} / un.</Text>)}
                </View>
                <Text className="font-black text-emerald-700">
                  {formatCurrency(receipt.finalAmount ?? 0)}
                </Text>
              </View>
            ))
          ) : (
            <View className="items-center px-6 py-10">
              <ReceiptText size={30} color={colors.slate400} />
              <Text className="mt-3 text-center font-bold text-slate-700">
                Nenhum recebimento registrado
              </Text>
              <Text className="mt-1 text-center text-sm leading-5 text-slate-500">
                Ao concluir um serviço, informe o valor e a forma de pagamento.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}
