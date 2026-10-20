import { CheckCircle2, Clock3, MapPin, MessageSquareQuote, Send, UserRound, X } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Text, TextInput, View } from 'react-native';

import { AnimatedPressable } from '@/components/common/AnimatedPressable';
import { Button } from '@/components/common/Button';
import { RequestMediaGallery } from '@/components/requests/RequestMediaGallery';
import { colors } from '@/constants/theme';
import { formatCurrency } from '@/data/paymentMethods';
import { getServiceCategory } from '@/data/serviceCategories';
import type { ServiceQuote, ServiceRequest } from '@/types';

type CommunityPostCardProps = {
  request: ServiceRequest;
  existingQuote?: ServiceQuote;
  onSubmitProposal: (
    amount: number,
    message: string,
  ) => 'submitted' | 'blocked' | 'failed' | Promise<'submitted' | 'blocked' | 'failed'>;
  onOpenChat?: () => void;
  onClientPress?: () => void;
};

const urgencyLabels = {
  flexible: 'Flexível',
  soon: 'Em breve',
  urgent: 'Urgente',
};

export function CommunityPostCard({
  request,
  existingQuote,
  onSubmitProposal,
  onOpenChat,
  onClientPress,
}: CommunityPostCardProps) {
  const category = getServiceCategory(request.category);
  const [composing, setComposing] = useState(false);
  const [amount, setAmount] = useState(existingQuote?.amount.toString() ?? '');
  const [message, setMessage] = useState(existingQuote?.message ?? '');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const numericAmount = Number(amount.replace(',', '.'));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || message.trim().length < 20) {
      Alert.alert(
        'Revise a proposta',
        'Informe um valor inicial e uma mensagem com pelo menos 20 caracteres.',
      );
      return;
    }
    setSubmitting(true);
    const result = await onSubmitProposal(numericAmount, message.trim());
    setSubmitting(false);
    if (result === 'blocked') return;
    if (result === 'failed') {
      Alert.alert('Não foi possível enviar', 'Verifique sua agenda e tente novamente.');
      return;
    }
    setComposing(false);
    Alert.alert(
      existingQuote ? 'Proposta atualizada' : 'Proposta enviada',
      'O cliente já pode visualizar sua proposta e iniciar uma conversa.',
    );
  };

  return (
    <View
      className="mb-4 rounded-3xl border border-slate-100 bg-white p-5"
      style={{ shadowColor: colors.slate900, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 }}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 flex-row flex-wrap gap-2">
          <Text className="rounded-full bg-brand-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-brand-700">
            {category.shortLabel}
          </Text>
          <Text
            className={`rounded-full px-3 py-1.5 text-[10px] font-black ${
              request.urgency === 'urgent'
                ? 'bg-red-50 text-red-600'
                : 'bg-amber-50 text-amber-700'
            }`}
          >
            {urgencyLabels[request.urgency]}
          </Text>
        </View>
        {existingQuote ? <CheckCircle2 size={22} color={colors.success} /> : null}
      </View>

      <Text className="mt-4 text-lg font-black leading-6 text-slate-950">{request.title}</Text>
      <Text className="mt-2 text-sm leading-6 text-slate-600">{request.description}</Text>

      <View className="mt-4 flex-row flex-wrap gap-4 border-t border-slate-100 pt-4">
        <AnimatedPressable
          accessibilityLabel={`Abrir perfil de ${request.clientName}`}
          accessibilityRole="button"
          onPress={onClientPress}
          disabled={!onClientPress}
          className="flex-row items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1.5"
        >
          <View className="h-7 w-7 items-center justify-center rounded-full bg-brand-100">
            <UserRound size={15} color={colors.brand700} />
          </View>
          <Text className="text-xs font-black text-brand-800">{request.clientName}</Text>
        </AnimatedPressable>
        <View className="flex-row items-center gap-1.5">
          <MapPin size={15} color={colors.slate500} />
          <Text className="text-xs font-semibold text-slate-500">{request.city}</Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          <Clock3 size={15} color={colors.slate500} />
          <Text className="text-xs font-semibold text-slate-500">
            {new Date(request.createdAt).toLocaleDateString('pt-BR')}
          </Text>
        </View>
      </View>

      {request.media.length ? (
        <View className="mt-4">
          <Text className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">
            Fotos e vídeos anexados
          </Text>
          <RequestMediaGallery media={request.media} />
        </View>
      ) : null}

      {existingQuote && !composing ? (
        <View className="mt-4 rounded-2xl bg-emerald-50 p-4">
          <Text className="text-xs font-black uppercase tracking-wide text-emerald-700">
            Sua proposta
          </Text>
          <Text className="mt-1 text-xl font-black text-emerald-800">
            {formatCurrency(existingQuote.amount)}
          </Text>
          <Text className="mt-2 text-sm leading-5 text-emerald-700">{existingQuote.message}</Text>
        </View>
      ) : null}

      {existingQuote && !composing && onOpenChat ? (
        <View className="mt-3">
          <Button
            label="Abrir chat com o cliente"
            variant="secondary"
            icon={<MessageSquareQuote size={18} color={colors.brand700} />}
            onPress={onOpenChat}
          />
        </View>
      ) : null}

      {composing ? (
        <View className="mt-5 rounded-2xl border border-brand-200 bg-brand-50 p-4">
          <View className="flex-row items-center justify-between">
            <Text className="font-black text-brand-900">Proposta inicial</Text>
            <AnimatedPressable
              accessibilityLabel="Fechar proposta"
              onPress={() => setComposing(false)}
              className="h-8 w-8 items-center justify-center rounded-full bg-white"
            >
              <X size={17} color={colors.slate700} />
            </AnimatedPressable>
          </View>
          <View className="mt-4 flex-row items-center rounded-2xl border border-brand-200 bg-white px-4">
            <Text className="font-black text-brand-700">R$</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder="Valor inicial"
              placeholderTextColor={colors.slate400}
              className="min-h-13 flex-1 px-3 text-base font-bold text-slate-900"
            />
          </View>
          <TextInput
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={500}
            textAlignVertical="top"
            placeholder="Apresente sua solução, condições e uma estimativa inicial..."
            placeholderTextColor={colors.slate400}
            className="mt-3 min-h-28 rounded-2xl border border-brand-200 bg-white p-4 text-sm leading-5 text-slate-900"
          />
          <View className="mt-3">
            <Button
              label="Enviar proposta ao cliente"
              loading={submitting}
              icon={<Send size={18} color={colors.white} />}
              onPress={handleSubmit}
            />
          </View>
        </View>
      ) : (
        <View className="mt-5">
          <Button
            label={existingQuote ? 'Editar proposta enviada' : 'Tenho interesse / Enviar proposta'}
            variant={existingQuote ? 'secondary' : 'primary'}
            icon={<MessageSquareQuote size={18} color={existingQuote ? colors.brand700 : colors.white} />}
            onPress={() => setComposing(true)}
          />
        </View>
      )}
    </View>
  );
}
