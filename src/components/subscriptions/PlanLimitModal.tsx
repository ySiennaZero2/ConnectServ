import { Crown, X } from 'lucide-react-native';
import { Modal, Pressable, Text, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { colors } from '@/constants/theme';

type PlanLimitModalProps = {
  visible: boolean;
  onClose: () => void;
  onViewPlans: () => void;
};

export function PlanLimitModal({ visible, onClose, onViewPlans }: PlanLimitModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 items-center justify-center bg-slate-950/60 px-5">
        <Pressable className="absolute inset-0" onPress={onClose} />
        <View className="w-full max-w-md rounded-[32px] bg-white p-6">
          <View className="flex-row items-start gap-4">
            <View className="h-14 w-14 items-center justify-center rounded-2xl bg-amber-100">
              <Crown size={28} color="#D97706" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-black text-slate-950">Limite mensal atingido!</Text>
              <Text className="mt-2 text-sm leading-6 text-slate-600">
                Você atingiu o limite de 5 atendimentos gratuitos deste mês. Não perca novos clientes! Assine o Plano Profissional ou Premium para atender de forma ilimitada.
              </Text>
            </View>
            <Pressable accessibilityLabel="Fechar" onPress={onClose} className="h-9 w-9 items-center justify-center rounded-full bg-slate-100">
              <X size={18} color={colors.slate700} />
            </Pressable>
          </View>
          <View className="mt-6">
            <Button label="Conhecer Planos" onPress={onViewPlans} />
          </View>
          <Pressable onPress={onClose} className="mt-3 items-center py-2">
            <Text className="text-sm font-bold text-slate-500">Agora não</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
