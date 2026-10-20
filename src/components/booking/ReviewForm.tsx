import { ArrowLeft, BadgeCheck, MessageSquareText } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { Screen } from '@/components/common/Screen';
import { StarRating } from '@/components/common/StarRating';
import { colors } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';
import type { UserRole } from '@/types';
import { formatAppointmentDate } from '@/utils/date';

type ReviewFormProps = {
  appointmentId: string;
  viewerRole: UserRole;
  onBack: () => void;
  onDone: () => void;
};

const ratingLabels: Record<number, string> = {
  1: 'Muito ruim',
  2: 'Ruim',
  3: 'Bom',
  4: 'Muito bom',
  5: 'Excelente!',
};

export function ReviewForm({ appointmentId, viewerRole, onBack, onDone }: ReviewFormProps) {
  const appointment = useAppStore((state) =>
    state.appointments.find((item) => item.id === appointmentId),
  );
  const submitReview = useAppStore((state) => state.submitReview);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  if (!appointment) {
    return (
      <Screen>
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-lg font-bold text-slate-900">Serviço não encontrado</Text>
          <View className="mt-5 w-full">
            <Button label="Voltar" onPress={onBack} />
          </View>
        </View>
      </Screen>
    );
  }

  const reviewedName =
    viewerRole === 'client' ? appointment.providerName : appointment.clientName;

  const handleSubmit = () => {
    if (!rating) {
      Alert.alert('Escolha uma nota', 'Toque de 1 a 5 estrelas antes de enviar.');
      return;
    }
    submitReview(appointment.id, viewerRole, rating, comment);
    Alert.alert('Avaliação enviada!', 'Obrigado por ajudar a comunidade ConectaServ.', [
      { text: 'Concluir', onPress: onDone },
    ]);
  };

  return (
    <Screen bottomInset>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerClassName="px-5 pb-8" keyboardShouldPersistTaps="handled">
          <View className="flex-row items-center py-4">
            <Pressable
              onPress={onBack}
              className="h-11 w-11 items-center justify-center rounded-full bg-white"
            >
              <ArrowLeft size={22} color={colors.slate700} />
            </Pressable>
            <Text className="flex-1 pr-11 text-center text-lg font-extrabold text-slate-900">
              Avaliar serviço
            </Text>
          </View>

          <View className="mt-4 items-center rounded-3xl bg-brand-700 px-6 py-8">
            <View className="h-16 w-16 items-center justify-center rounded-2xl bg-white/20">
              <BadgeCheck size={34} color={colors.white} />
            </View>
            <Text className="mt-4 text-sm font-semibold uppercase tracking-wider text-brand-200">
              Serviço concluído
            </Text>
            <Text className="mt-2 text-center text-2xl font-extrabold text-white">
              Como foi sua experiência com {reviewedName}?
            </Text>
            <Text className="mt-2 text-center text-sm text-brand-100">
              {formatAppointmentDate(appointment.scheduledAt)}
            </Text>
          </View>

          <View className="mt-6 items-center rounded-3xl border border-slate-200 bg-white px-5 py-7">
            <Text className="text-base font-bold text-slate-900">Sua nota</Text>
            <View className="mt-4">
              <StarRating value={rating} onChange={setRating} size={38} />
            </View>
            <Text className="mt-3 h-6 text-base font-bold text-brand-700">
              {rating ? ratingLabels[rating] : 'Toque nas estrelas'}
            </Text>
          </View>

          <View className="mt-6">
            <View className="mb-2 flex-row items-center gap-2">
              <MessageSquareText size={18} color={colors.brand700} />
              <Text className="font-bold text-slate-900">Conte um pouco mais</Text>
              <Text className="text-xs text-slate-400">(opcional)</Text>
            </View>
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="O que mais se destacou nessa experiência?"
              placeholderTextColor={colors.slate400}
              multiline
              maxLength={500}
              textAlignVertical="top"
              className="min-h-32 rounded-2xl border border-slate-200 bg-white p-4 text-base text-slate-900"
            />
            <Text className="mt-2 text-right text-xs text-slate-400">{comment.length}/500</Text>
          </View>

          <View className="mt-7">
            <Button label="Enviar avaliação" disabled={!rating} onPress={handleSubmit} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
