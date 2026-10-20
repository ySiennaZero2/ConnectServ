import { Camera, ChevronRight, Clock3, MapPin, MessageSquareQuote, Video } from 'lucide-react-native';
import { Text, View } from 'react-native';

import { AnimatedPressable } from '@/components/common/AnimatedPressable';
import { colors } from '@/constants/theme';
import { getServiceCategory } from '@/data/serviceCategories';
import type { ServiceRequest } from '@/types';

const urgencyLabels = {
  flexible: 'Flexível',
  soon: 'Nos próximos dias',
  urgent: 'Urgente',
};

type ServiceRequestCardProps = {
  request: ServiceRequest;
  quoteCount: number;
  providerHasQuoted?: boolean;
  onPress: () => void;
};

export function ServiceRequestCard({
  request,
  quoteCount,
  providerHasQuoted = false,
  onPress,
}: ServiceRequestCardProps) {
  const category = getServiceCategory(request.category);
  const imageCount = request.media.filter((item) => item.type === 'image').length;
  const videoCount = request.media.filter((item) => item.type === 'video').length;
  const selected = request.status === 'quote_selected';
  const closed = request.status === 'cancelled' || request.status === 'closed';

  return (
    <AnimatedPressable
      accessibilityLabel={`Abrir pedido ${request.title}`}
      accessibilityRole="button"
      onPress={onPress}
      pressedOpacity={0.92}
      pressedScale={0.985}
      className="mb-4 rounded-3xl border border-slate-100 bg-white p-4"
      style={{ shadowColor: colors.slate900, shadowOpacity: 0.05, shadowRadius: 12, elevation: 2 }}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-brand-700">
              {category.shortLabel}
            </Text>
            <Text
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                request.urgency === 'urgent'
                  ? 'bg-red-50 text-red-600'
                  : 'bg-slate-100 text-slate-500'
              }`}
            >
              {urgencyLabels[request.urgency]}
            </Text>
          </View>
          <Text className="mt-3 text-base font-extrabold leading-5 text-slate-900" numberOfLines={2}>
            {request.title}
          </Text>
        </View>
        <ChevronRight size={20} color={colors.slate400} />
      </View>

      <Text className="mt-2 text-sm leading-5 text-slate-500" numberOfLines={2}>
        {request.description}
      </Text>

      <View className="mt-4 flex-row flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-3">
        <View className="flex-row items-center gap-1.5">
          <MapPin size={14} color={colors.slate500} />
          <Text className="text-xs font-medium text-slate-500">{request.city}</Text>
        </View>
        {imageCount ? (
          <View className="flex-row items-center gap-1.5">
            <Camera size={14} color={colors.slate500} />
            <Text className="text-xs font-medium text-slate-500">{imageCount}</Text>
          </View>
        ) : null}
        {videoCount ? (
          <View className="flex-row items-center gap-1.5">
            <Video size={14} color={colors.slate500} />
            <Text className="text-xs font-medium text-slate-500">{videoCount}</Text>
          </View>
        ) : null}
        <View className="ml-auto flex-row items-center gap-1.5">
          {providerHasQuoted ? (
            <>
              <Clock3 size={14} color={colors.success} />
              <Text className="text-xs font-bold text-emerald-700">Proposta enviada</Text>
            </>
          ) : (
            <>
              <MessageSquareQuote
                size={14}
                color={selected ? colors.success : closed ? colors.slate500 : colors.brand700}
              />
              <Text
                className={`text-xs font-bold ${
                  selected
                    ? 'text-emerald-700'
                    : closed
                      ? 'text-slate-500'
                      : 'text-brand-700'
                }`}
              >
                {selected
                  ? 'Profissional escolhido'
                  : closed
                    ? 'Pedido encerrado'
                    : `${quoteCount} proposta${quoteCount === 1 ? '' : 's'}`}
              </Text>
            </>
          )}
        </View>
      </View>
    </AnimatedPressable>
  );
}
