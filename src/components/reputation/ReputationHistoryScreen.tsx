import {
  Ban,
  Flag,
  MessageCircleReply,
  ShieldAlert,
  Star,
  X,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { AccountSectionHeader } from '@/components/account/AccountSectionHeader';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { Screen } from '@/components/common/Screen';
import { colors } from '@/constants/theme';
import {
  getCancellationAuthorLabel,
  getCancellationReasonLabel,
} from '@/data/cancellationReasons';
import { isSupabaseConfigured } from '@/lib/supabase';
import { historyService } from '@/services/history';
import { useAppStore } from '@/store/useAppStore';
import type { CancellationRecord, ReputationTab, UserRole } from '@/types';

type ReputationHistoryScreenProps = {
  userId: string;
  profileName?: string;
  profileRole: UserRole;
  initialTab?: ReputationTab;
  onBack: () => void;
};

const tabs: { id: ReputationTab; label: string }[] = [
  { id: 'reviews', label: 'Avaliações' },
  { id: 'cancellations', label: 'Cancelamentos' },
];

export function ReputationHistoryScreen({
  userId,
  profileName,
  profileRole,
  initialTab = 'reviews',
  onBack,
}: ReputationHistoryScreenProps) {
  const currentUser = useAppStore((state) => state.currentUser);
  const appointments = useAppStore((state) => state.appointments);
  const reviews = useAppStore((state) => state.reviews);
  const cancellationRecords = useAppStore((state) => state.cancellationRecords);
  const replyToCancellation = useAppStore((state) => state.replyToCancellation);
  const reportHistoryItem = useAppStore((state) => state.reportHistoryItem);
  const [activeTab, setActiveTab] = useState<ReputationTab>(initialTab);
  const [replyingTo, setReplyingTo] = useState<CancellationRecord | null>(null);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const viewingOwnProfile = currentUser?.id === userId;

  const receivedReviews = useMemo(
    () =>
      reviews
        .filter((review) => review.reviewedId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [reviews, userId],
  );
  const cancellations = useMemo(
    () =>
      cancellationRecords
        .filter((record) => record.clientId === userId || record.providerId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [cancellationRecords, userId],
  );

  const report = (kind: 'review' | 'cancellation', id: string) => {
    Alert.alert(
      'Denunciar comentário?',
      'O texto ficará oculto temporariamente enquanto a equipe analisa o conteúdo.',
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Denunciar',
          style: 'destructive',
          onPress: async () => {
            try {
              if (isSupabaseConfigured) await historyService.reportComment(kind, id);
              if (!reportHistoryItem(kind, id)) {
                throw new Error('Este comentário não pode ser denunciado por esta conta.');
              }
              Alert.alert('Enviado para análise', 'O conteúdo foi ocultado preventivamente.');
            } catch (error) {
              Alert.alert(
                'Não foi possível denunciar',
                error instanceof Error ? error.message : 'Tente novamente em instantes.',
              );
            }
          },
        },
      ],
    );
  };

  const sendReply = async () => {
    if (!replyingTo || !reply.trim()) return;
    setSending(true);
    try {
      if (isSupabaseConfigured) {
        await historyService.replyToCancellation(replyingTo.id, reply.trim());
      }
      if (!replyToCancellation(replyingTo.id, reply.trim())) {
        throw new Error('Não foi possível registrar esta resposta.');
      }
      setReplyingTo(null);
      setReply('');
      Alert.alert('Resposta publicada', 'Seu ponto de vista foi adicionado ao histórico.');
    } catch (error) {
      Alert.alert(
        'Não foi possível responder',
        error instanceof Error ? error.message : 'Tente novamente em instantes.',
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Screen className="bg-slate-50">
      <AccountSectionHeader
        title={profileName ? `Histórico de ${profileName.split(' ')[0]}` : 'Comentários e histórico'}
        subtitle={profileRole === 'provider' ? 'Reputação profissional' : 'Reputação como cliente'}
        onBack={onBack}
      />

      <View className="mx-5 mt-3 flex-row rounded-2xl bg-slate-200/70 p-1">
        {tabs.map((tab) => {
          const selected = activeTab === tab.id;
          const count = tab.id === 'reviews' ? receivedReviews.length : cancellations.length;
          return (
            <Pressable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              onPress={() => setActiveTab(tab.id)}
              className={`min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-xl px-2 ${
                selected ? 'bg-white' : 'bg-transparent'
              }`}
            >
              <Text className={`text-xs font-black ${selected ? 'text-brand-700' : 'text-slate-500'}`}>
                {tab.label}
              </Text>
              <View className={selected ? 'rounded-full bg-brand-50 px-2 py-0.5' : 'rounded-full bg-slate-300 px-2 py-0.5'}>
                <Text className={selected ? 'text-[10px] font-black text-brand-700' : 'text-[10px] font-black text-slate-500'}>
                  {count}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-5 pb-8 pt-5">
        {activeTab === 'reviews' ? (
          receivedReviews.length ? (
            receivedReviews.map((review) => {
              const appointment = appointments.find((item) => item.id === review.appointmentId);
              const authorName =
                review.reviewerRole === 'client'
                  ? appointment?.clientName ?? 'Cliente'
                  : appointment?.providerName ?? 'Prestador';
              const underReview = review.moderationStatus === 'sob_analise';
              return (
                <View key={review.id} className="mb-3 rounded-3xl border border-slate-100 bg-white p-5">
                  <View className="flex-row items-start gap-3">
                    <View className="flex-1">
                      <Text className="font-black text-slate-900">{authorName}</Text>
                      <Text className="mt-0.5 text-xs text-slate-400">
                        {appointment?.service} · {new Date(review.createdAt).toLocaleDateString('pt-BR')}
                      </Text>
                    </View>
                    {viewingOwnProfile && !underReview ? (
                      <Pressable
                        accessibilityLabel="Denunciar comentário"
                        onPress={() => report('review', review.id)}
                        className="h-9 w-9 items-center justify-center rounded-full bg-slate-100"
                      >
                        <Flag size={17} color={colors.slate500} />
                      </Pressable>
                    ) : null}
                  </View>
                  <View className="mt-3 flex-row gap-1">
                    {Array.from({ length: 5 }, (_, index) => (
                      <Star
                        key={index}
                        size={18}
                        color="#FBBF24"
                        fill={index < review.rating ? '#FBBF24' : 'transparent'}
                      />
                    ))}
                    <Text className="ml-1 text-xs font-black text-slate-600">{review.rating}/5</Text>
                  </View>
                  <ModeratedText underReview={underReview} text={review.comment} />
                </View>
              );
            })
          ) : (
            <EmptyState
              icon={<Star size={27} color={colors.brand700} />}
              title="Nenhuma avaliação recebida"
              description="As notas de serviços concluídos aparecerão aqui."
            />
          )
        ) : cancellations.length ? (
          cancellations.map((record) => {
            const cancelledByMe =
              record.cancelledBy === 'client'
                ? record.clientId === currentUser?.id
                : record.providerId === currentUser?.id;
            const underReview = record.moderationStatus === 'sob_analise';
            return (
              <View key={record.id} className="mb-3 rounded-3xl border border-red-100 bg-white p-5">
                <View className="flex-row items-start gap-3">
                  <View className="flex-1">
                    <Text className="text-xs font-black uppercase tracking-wide text-red-600">
                      Cancelado por {getCancellationAuthorLabel(record.cancelledBy)}
                    </Text>
                    <Text className="mt-1 font-black text-slate-900">{record.service}</Text>
                    <Text className="mt-1 text-xs text-slate-400">
                      {new Date(record.createdAt).toLocaleDateString('pt-BR')}
                    </Text>
                  </View>
                  {viewingOwnProfile && !cancelledByMe && !underReview ? (
                    <Pressable
                      accessibilityLabel="Denunciar justificativa"
                      onPress={() => report('cancellation', record.id)}
                      className="h-9 w-9 items-center justify-center rounded-full bg-red-50"
                    >
                      <Flag size={17} color={colors.danger} />
                    </Pressable>
                  ) : null}
                </View>
                <View className="mt-4 self-start rounded-full bg-red-50 px-3 py-1.5">
                  <Text className="text-xs font-black text-red-700">
                    {getCancellationReasonLabel(record.reason)}
                  </Text>
                </View>
                <ModeratedText underReview={underReview} text={record.justification} />
                {record.reply ? (
                  <View className="mt-4 rounded-2xl border border-brand-100 bg-brand-50 p-4">
                    <Text className="text-xs font-black uppercase text-brand-700">Resposta da outra parte</Text>
                    <Text className="mt-2 text-sm leading-5 text-brand-900">{record.reply}</Text>
                  </View>
                ) : viewingOwnProfile && !cancelledByMe && !underReview ? (
                  <View className="mt-4">
                    <Button
                      label="Responder / Tréplica"
                      variant="secondary"
                      icon={<MessageCircleReply size={18} color={colors.brand700} />}
                      onPress={() => setReplyingTo(record)}
                    />
                  </View>
                ) : null}
              </View>
            );
          })
        ) : (
          <EmptyState
            icon={<Ban size={27} color={colors.slate500} />}
            title="Nenhum cancelamento"
            description="Não há serviços confirmados cancelados neste histórico."
          />
        )}
      </ScrollView>

      <Modal visible={Boolean(replyingTo)} transparent animationType="fade" onRequestClose={() => setReplyingTo(null)}>
        <View className="flex-1 justify-end bg-slate-950/60">
          <Pressable className="flex-1" onPress={() => setReplyingTo(null)} />
          <View className="rounded-t-[32px] bg-white px-5 pb-8 pt-5">
            <View className="flex-row items-center gap-3">
              <View className="flex-1">
                <Text className="text-xl font-black text-slate-950">Responder cancelamento</Text>
                <Text className="mt-1 text-sm text-slate-500">Apresente seu ponto de vista com respeito.</Text>
              </View>
              <Pressable accessibilityLabel="Fechar" onPress={() => setReplyingTo(null)} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100">
                <X size={19} color={colors.slate700} />
              </Pressable>
            </View>
            <TextInput
              value={reply}
              onChangeText={setReply}
              multiline
              maxLength={140}
              textAlignVertical="top"
              placeholder="Escreva sua resposta..."
              placeholderTextColor={colors.slate400}
              className="mt-5 min-h-28 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900"
            />
            <Text className="mt-2 text-right text-xs text-slate-400">{reply.length}/140</Text>
            <View className="mt-5">
              <Button label="Publicar resposta" loading={sending} disabled={!reply.trim()} onPress={sendReply} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function ModeratedText({ underReview, text }: { underReview: boolean; text?: string }) {
  if (underReview) {
    return (
      <View className="mt-4 flex-row items-center gap-2 rounded-2xl bg-amber-50 p-4">
        <ShieldAlert size={18} color={colors.warning} />
        <Text className="flex-1 text-xs font-bold leading-5 text-amber-800">
          Conteúdo ocultado temporariamente — sob análise da moderação.
        </Text>
      </View>
    );
  }
  return text ? <Text className="mt-4 text-sm leading-6 text-slate-600">{text}</Text> : null;
}
