import { Clock3, Eye, MapPin, MessageSquareQuote, UserRound, X } from 'lucide-react-native';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { AnimatedPressable } from '@/components/common/AnimatedPressable';
import { Button } from '@/components/common/Button';
import { RequestMediaGallery } from '@/components/requests/RequestMediaGallery';
import { colors } from '@/constants/theme';
import { getServiceCategory } from '@/data/serviceCategories';
import type { ServiceRequest } from '@/types';

type CommunityPostDetailsModalProps = {
  post: ServiceRequest | null;
  quoteCount: number;
  onClose: () => void;
};

const urgencyLabels = {
  flexible: 'Data flexível',
  soon: 'Nos próximos dias',
  urgent: 'Atendimento urgente',
};

export function CommunityPostDetailsModal({
  post,
  quoteCount,
  onClose,
}: CommunityPostDetailsModalProps) {
  if (!post) return null;
  const category = getServiceCategory(post.category);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-slate-950/55">
        <Pressable accessibilityLabel="Fechar detalhes" className="flex-1" onPress={onClose} />
        <View className="max-h-[88%] rounded-t-[32px] bg-slate-50 pb-7">
          <View className="flex-row items-center gap-3 border-b border-slate-100 bg-white px-5 pb-4 pt-5">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-brand-50">
              <Eye size={21} color={colors.brand700} />
            </View>
            <View className="flex-1">
              <Text className="text-lg font-black text-slate-950">Detalhes da publicação</Text>
              <Text className="mt-0.5 text-xs text-slate-500">Visualização somente leitura</Text>
            </View>
            <AnimatedPressable
              accessibilityLabel="Fechar"
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"
            >
              <X size={20} color={colors.slate700} />
            </AnimatedPressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerClassName="px-5 pb-5 pt-5"
          >
            <View className="flex-row flex-wrap gap-2">
              <Text className="rounded-full bg-brand-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-brand-700">
                {category.label}
              </Text>
              <Text
                className={`rounded-full px-3 py-1.5 text-[10px] font-black ${
                  post.urgency === 'urgent'
                    ? 'bg-red-50 text-red-600'
                    : 'bg-amber-50 text-amber-700'
                }`}
              >
                {urgencyLabels[post.urgency]}
              </Text>
              <Text className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-black text-emerald-700">
                Sua publicação
              </Text>
            </View>

            <Text className="mt-5 text-xl font-black leading-7 text-slate-950">{post.title}</Text>
            <Text className="mt-3 text-sm leading-6 text-slate-600">{post.description}</Text>

            <View className="mt-5 flex-row flex-wrap gap-x-4 gap-y-3 border-y border-slate-100 py-4">
              <View className="flex-row items-center gap-1.5">
                <UserRound size={15} color={colors.brand700} />
                <Text className="text-xs font-bold text-slate-700">{post.clientName}</Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <MapPin size={15} color={colors.slate500} />
                <Text className="text-xs font-semibold text-slate-500">{post.city}</Text>
              </View>
              <View className="flex-row items-center gap-1.5">
                <Clock3 size={15} color={colors.slate500} />
                <Text className="text-xs font-semibold text-slate-500">
                  {new Date(post.createdAt).toLocaleDateString('pt-BR')}
                </Text>
              </View>
            </View>

            {post.media.length ? (
              <View className="mt-5">
                <Text className="mb-3 text-xs font-black uppercase tracking-wide text-slate-400">
                  Fotos e vídeos
                </Text>
                <RequestMediaGallery media={post.media} />
              </View>
            ) : null}

            <View className="mt-5 flex-row items-center gap-3 rounded-2xl bg-white p-4">
              <MessageSquareQuote size={21} color={colors.brand700} />
              <View className="flex-1">
                <Text className="font-black text-slate-800">
                  {quoteCount} proposta{quoteCount === 1 ? '' : 's'} recebida{quoteCount === 1 ? '' : 's'}
                </Text>
                <Text className="mt-0.5 text-xs leading-5 text-slate-500">
                  As conversas são abertas somente pelos cards de profissionais interessados.
                </Text>
              </View>
            </View>

            <View className="mt-6">
              <Button label="Fechar detalhes" onPress={onClose} />
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
