import { X } from 'lucide-react-native';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { ReduceMotion, SlideInDown } from 'react-native-reanimated';

import { AnimatedPressable } from '@/components/common/AnimatedPressable';
import { Button } from '@/components/common/Button';
import { colors } from '@/constants/theme';

type DeclineModalProps = {
  visible: boolean;
  clientName?: string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
};

export function DeclineModal({
  visible,
  clientName,
  onClose,
  onConfirm,
}: DeclineModalProps) {
  const [reason, setReason] = useState('');

  const handleClose = () => {
    setReason('');
    onClose();
  };

  const handleConfirm = () => {
    onConfirm(reason.trim());
    setReason('');
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1 justify-end bg-slate-950/50"
      >
        <Pressable className="flex-1" onPress={handleClose} />
        <Animated.View
          entering={SlideInDown.duration(220).reduceMotion(ReduceMotion.System)}
          className="rounded-t-[32px] bg-white px-6 pb-8 pt-6"
        >
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text className="text-xl font-extrabold text-slate-900">Recusar solicitação</Text>
              <Text className="mt-1 leading-5 text-slate-500">
                Explique brevemente {clientName ? `para ${clientName} ` : ''}o motivo da recusa.
              </Text>
            </View>
            <AnimatedPressable
              accessibilityRole="button"
              accessibilityLabel="Fechar"
              onPress={handleClose}
              pressedScale={0.88}
              className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
            >
              <X size={20} color={colors.slate700} />
            </AnimatedPressable>
          </View>

          <TextInput
            value={reason}
            onChangeText={setReason}
            placeholder="Ex.: Não terei disponibilidade nesse horário."
            placeholderTextColor={colors.slate400}
            multiline
            maxLength={300}
            textAlignVertical="top"
            className="mt-5 min-h-28 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-base text-slate-900"
          />
          <Text className="mb-5 mt-2 text-right text-xs text-slate-400">
            {reason.trim().length}/300
          </Text>

          <Button
            label="Confirmar recusa"
            variant="danger"
            disabled={reason.trim().length < 10}
            onPress={handleConfirm}
          />
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
