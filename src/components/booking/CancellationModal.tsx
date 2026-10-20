import { AlertTriangle, Check, X } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { colors } from '@/constants/theme';
import { cancellationReasonOptions } from '@/data/cancellationReasons';
import type { Appointment, CancellationReason } from '@/types';

type CancellationModalProps = {
  appointment: Appointment | null;
  onClose: () => void;
  onConfirm: (reason: CancellationReason, justification?: string) => void;
};

export function CancellationModal({
  appointment,
  onClose,
  onConfirm,
}: CancellationModalProps) {
  const [reason, setReason] = useState<CancellationReason | null>(null);
  const [justification, setJustification] = useState('');

  const close = () => {
    setReason(null);
    setJustification('');
    onClose();
  };

  const confirm = () => {
    if (!reason) return;
    onConfirm(reason, justification.trim() || undefined);
    setReason(null);
    setJustification('');
  };

  return (
    <Modal visible={Boolean(appointment)} transparent animationType="fade" onRequestClose={close}>
      <View className="flex-1 justify-end bg-slate-950/60">
        <Pressable accessibilityLabel="Fechar cancelamento" className="flex-1" onPress={close} />
        <View className="rounded-t-[32px] bg-white px-5 pb-8 pt-5">
          <View className="flex-row items-start gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
              <AlertTriangle size={23} color={colors.danger} />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-black text-slate-950">Cancelar serviço</Text>
              <Text className="mt-1 text-sm leading-5 text-slate-500">
                O motivo ficará registrado no histórico das duas partes.
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Fechar"
              onPress={close}
              className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
            >
              <X size={19} color={colors.slate700} />
            </Pressable>
          </View>

          <Text className="mb-2 mt-6 text-sm font-black text-slate-800">Motivo principal *</Text>
          <View className="gap-2">
            {cancellationReasonOptions.map((option) => {
              const selected = reason === option.id;
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  onPress={() => setReason(option.id)}
                  className={`min-h-12 flex-row items-center rounded-2xl border px-4 ${
                    selected ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <View
                    className={`h-5 w-5 items-center justify-center rounded-full border ${
                      selected ? 'border-brand-700 bg-brand-700' : 'border-slate-300'
                    }`}
                  >
                    {selected ? <Check size={13} color={colors.white} /> : null}
                  </View>
                  <Text className={`ml-3 flex-1 font-bold ${selected ? 'text-brand-800' : 'text-slate-700'}`}>
                    {option.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View className="mb-2 mt-5 flex-row items-center justify-between">
            <Text className="text-sm font-black text-slate-800">Justificativa</Text>
            <Text className="text-xs text-slate-400">Opcional · {justification.length}/140</Text>
          </View>
          <TextInput
            value={justification}
            onChangeText={setJustification}
            multiline
            maxLength={140}
            textAlignVertical="top"
            placeholder="Explique brevemente o que aconteceu..."
            placeholderTextColor={colors.slate400}
            className="min-h-24 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900"
          />

          <View className="mt-6 gap-3">
            <Button
              label="Confirmar cancelamento"
              variant="danger"
              disabled={!reason}
              onPress={confirm}
            />
            <Button label="Manter serviço" variant="ghost" onPress={close} />
          </View>
        </View>
      </View>
    </Modal>
  );
}
