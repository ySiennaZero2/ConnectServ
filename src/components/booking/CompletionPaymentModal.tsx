import { Banknote, Check, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  ScrollView,
  Platform,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AnimatedPressable } from '@/components/common/AnimatedPressable';
import { Button } from '@/components/common/Button';
import { colors } from '@/constants/theme';
import { formatCurrency, paymentMethodOptions } from '@/data/paymentMethods';
import type { Appointment, PaymentMethod, SelectedItem, CatalogItem } from '@/types';
import { itemTotals, snapshotItems } from '@/utils/catalog';

type CompletionPaymentModalProps = {
  appointment: Appointment | null;
  onClose: () => void;
  catalog: CatalogItem[];
  catalogLoading?: boolean;
  catalogError?: string;
  onRetryCatalog: () => void;
  onConfirm: (finalAmount: number, paymentMethod: PaymentMethod, items: SelectedItem[]) => Promise<void>;
};

export function CompletionPaymentModal({
  appointment,
  onClose,
  onConfirm, catalog, catalogLoading, catalogError, onRetryCatalog,
}: CompletionPaymentModalProps) {
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [manualAmount, setManualAmount] = useState(false);
  const [amountDigits, setAmountDigits] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const missingItems = selectedItems.some((entry) => !catalog.some((item) => item.id === entry.catalogItemId));
  const total = missingItems ? 0 : itemTotals(snapshotItems(catalog, selectedItems)).price;
  const amount = manualAmount ? Number(amountDigits || '0') / 100 : total;
  const changeQuantity = (id: string, quantity: number) => setSelectedItems((current) => [
    ...current.filter((item) => item.catalogItemId !== id),
    ...(quantity > 0 ? [{ catalogItemId: id, quantity: Math.min(9999, quantity) }] : []),
  ]);

  const resetForm = () => {
    setSelectedItems([]); setSearch(''); setError(''); setManualAmount(false);
    setAmountDigits('');
    setPaymentMethod(null);
  };

  const handleClose = () => {
    if (saving) return;
    resetForm();
    onClose();
  };

  const handleConfirm = async () => {
    if (!paymentMethod || saving) return;
    setSaving(true); setError('');
    try { await onConfirm(amount, paymentMethod, selectedItems); resetForm(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível concluir.'); }
    finally { setSaving(false); }
  };

  return (
    <Modal
      animationType="fade"
      transparent
      visible={Boolean(appointment)}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-slate-950/50"
      >
        <ScrollView style={{ maxHeight: '90%' }} keyboardShouldPersistTaps="handled" className="rounded-t-[32px] bg-white" contentContainerClassName="px-5 pb-8 pt-5">
          <View className="flex-row items-start justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-xl font-black text-slate-950">Concluir serviço</Text>
              <Text className="mt-1 text-sm leading-5 text-slate-500">
                Registre o recebimento de {appointment?.clientName} para atualizar seu painel.
              </Text>
            </View>
            <AnimatedPressable
              accessibilityLabel="Fechar"
              onPress={handleClose}
              className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
            >
              <X size={20} color={colors.slate700} />
            </AnimatedPressable>
          </View>

          <View className="mt-5 gap-3">
            <Text className="font-extrabold text-slate-800">Produtos e serviços utilizados</Text>
            <TextInput accessibilityLabel="Buscar itens" placeholder="Buscar por nome ou descrição" value={search}
              onChangeText={setSearch} editable={!saving} className="rounded-xl border border-slate-200 p-3" />
            {catalogLoading ? <Text>Carregando itens...</Text> : null}
            {catalogError ? <><Text className="text-red-700">{catalogError}</Text>
              <Button label="Recarregar catálogo" onPress={onRetryCatalog} /></> : null}
            {!catalogLoading && !catalogError && !catalog.length ? <Text className="text-slate-500">Cadastre itens em Meu perfil → Gerenciar produtos e serviços.</Text> : null}
            <ScrollView nestedScrollEnabled style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled">
              {catalog.filter((item) => `${item.name} ${item.description}`.toLowerCase().includes(search.toLowerCase())).map((item) => {
                const quantity = selectedItems.find((entry) => entry.catalogItemId === item.id)?.quantity ?? 0;
                return <View key={item.id} className="gap-2 border-b border-slate-100 py-3">
                  <Text className="font-bold">{item.name} · {item.kind === 'product' ? 'Produto' : 'Serviço'}</Text>
                  <Text>{formatCurrency(item.salePrice)} por unidade</Text>
                  <View className="flex-row items-center gap-3">
                    <Button label="−" fullWidth={false} variant="secondary" disabled={saving || !quantity}
                      onPress={() => changeQuantity(item.id, quantity - 1)} />
                    <TextInput accessibilityLabel={`Quantidade de ${item.name}`} keyboardType="number-pad"
                      value={String(quantity)} editable={!saving} className="min-w-14 rounded-xl border border-slate-200 p-3 text-center"
                      onChangeText={(value) => changeQuantity(item.id, Number(value.replace(/\D/g, '').slice(0, 4)))} />
                    <Button label="+" fullWidth={false} variant="secondary" disabled={saving || quantity === 9999 || (!quantity && selectedItems.length >= 200)}
                      onPress={() => changeQuantity(item.id, quantity + 1)} />
                  </View>
                </View>;
              })}
            </ScrollView>
            {missingItems ? <Text className="text-red-700">Um item foi excluído. Remova-o da seleção antes de concluir.</Text> : null}
            <Text className="font-bold">{selectedItems.length} itens selecionados · Total: {formatCurrency(total)}</Text>
            {selectedItems.map((entry) => <View key={entry.catalogItemId} className="flex-row items-center gap-2">
              <Text className="flex-1">{entry.quantity} × {catalog.find((item) => item.id === entry.catalogItemId)?.name ?? 'Item indisponível'}</Text>
              <Button label="Remover" variant="ghost" fullWidth={false} disabled={saving} onPress={() => changeQuantity(entry.catalogItemId, 0)} />
            </View>)}
            <Button label="Usar total dos itens como valor final" variant="secondary" disabled={saving || !selectedItems.length}
              onPress={() => setManualAmount(false)} />
          </View>
          <View className="mt-6">
            <Text className="mb-2 font-extrabold text-slate-800">Valor final do serviço</Text>
            <View className="flex-row items-center rounded-2xl border border-slate-200 bg-slate-50 px-4">
              <Banknote size={21} color={colors.brand700} />
              <TextInput
                value={amount || amountDigits ? formatCurrency(amount) : ''}
                editable={!saving}
                onChangeText={(value) => { setManualAmount(true); setAmountDigits(value.replace(/\D/g, '').slice(0, 10)); }}
                keyboardType="number-pad"
                placeholder="R$ 0,00"
                placeholderTextColor={colors.slate400}
                className="min-h-14 flex-1 px-3 text-lg font-black text-slate-900"
              />
            </View>
          </View>

          <View className="mt-5">
            <Text className="mb-3 font-extrabold text-slate-800">Forma de pagamento</Text>
            <View className="flex-row flex-wrap gap-2">
              {paymentMethodOptions.map((option) => {
                const selected = paymentMethod === option.id;
                return (
                  <AnimatedPressable
                    key={option.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    disabled={saving}
                    onPress={() => setPaymentMethod(option.id)}
                    className={`w-[48.5%] flex-row items-center gap-2 rounded-2xl border px-3 py-3.5 ${
                      selected
                        ? 'border-brand-700 bg-brand-50'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <View
                      className={`h-5 w-5 items-center justify-center rounded-full ${
                        selected ? 'bg-brand-700' : 'border border-slate-300'
                      }`}
                    >
                      {selected ? <Check size={13} color={colors.white} /> : null}
                    </View>
                    <Text
                      className={`flex-1 text-xs font-bold ${
                        selected ? 'text-brand-800' : 'text-slate-600'
                      }`}
                    >
                      {option.label}
                    </Text>
                  </AnimatedPressable>
                );
              })}
            </View>
          </View>

          <View className="mt-6">
            <Button
              label="Confirmar conclusão"
              loading={saving}
              disabled={amount <= 0 || amount > 99999999.99 || !paymentMethod || catalogLoading || Boolean(catalogError) || missingItems || selectedItems.length > 200}
              onPress={() => void handleConfirm()}
            />
          </View>
          {error ? <Text accessibilityRole="alert" className="mt-3 text-red-700">{error}</Text> : null}
          <Text className="mt-3 text-center text-xs leading-5 text-slate-400">
            O app registra o recebimento para organização financeira. Nenhum pagamento é processado aqui.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
