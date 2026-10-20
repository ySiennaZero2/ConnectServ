import { BellRing, Camera, MapPin, Video, Wrench } from 'lucide-react-native';
import { Modal, Pressable, Text, View } from 'react-native';
import Animated, { ReduceMotion, SlideInDown } from 'react-native-reanimated';

import { Button } from '@/components/common/Button';
import { colors } from '@/constants/theme';
import { getServiceCategory } from '@/data/serviceCategories';
import type { ServiceRequest } from '@/types';

type NewServiceRequestModalProps = {
  request: ServiceRequest | null;
  onClose: () => void;
  onView: () => void;
};

export function NewServiceRequestModal({
  request,
  onClose,
  onView,
}: NewServiceRequestModalProps) {
  if (!request) return null;

  const category = getServiceCategory(request.category);
  const images = request.media.filter((item) => item.type === 'image').length;
  const videos = request.media.filter((item) => item.type === 'video').length;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-slate-950/55">
        <Pressable className="flex-1" onPress={onClose} />
        <Animated.View
          entering={SlideInDown.duration(240).reduceMotion(ReduceMotion.System)}
          className="rounded-t-[32px] bg-white px-6 pb-8 pt-6"
        >
          <View className="h-1.5 w-12 self-center rounded-full bg-slate-200" />
          <View className="mt-5 flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-brand-700">
              <BellRing size={23} color={colors.white} />
            </View>
            <View className="flex-1">
              <Text className="text-xs font-extrabold uppercase tracking-widest text-brand-700">
                Novo pedido de {category.shortLabel}
              </Text>
              <Text className="mt-1 text-xl font-black text-slate-950">Você pode enviar um orçamento</Text>
            </View>
          </View>

          <View className="mt-5 rounded-3xl bg-slate-50 p-4">
            <Text className="text-base font-extrabold text-slate-900">{request.title}</Text>
            <Text className="mt-2 text-sm leading-5 text-slate-500" numberOfLines={3}>
              {request.description}
            </Text>
            <View className="mt-4 flex-row flex-wrap gap-3">
              <View className="flex-row items-center gap-1.5">
                <MapPin size={15} color={colors.slate500} />
                <Text className="text-xs font-semibold text-slate-500">{request.city}</Text>
              </View>
              {images ? (
                <View className="flex-row items-center gap-1.5">
                  <Camera size={15} color={colors.slate500} />
                  <Text className="text-xs font-semibold text-slate-500">{images} foto(s)</Text>
                </View>
              ) : null}
              {videos ? (
                <View className="flex-row items-center gap-1.5">
                  <Video size={15} color={colors.slate500} />
                  <Text className="text-xs font-semibold text-slate-500">{videos} vídeo(s)</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View className="mt-4 flex-row gap-3 rounded-2xl bg-amber-50 p-3">
            <Wrench size={19} color={colors.warning} />
            <Text className="flex-1 text-xs leading-5 text-amber-800">
              Analise os anexos para prever ferramentas, materiais e peças antes de informar o valor.
            </Text>
          </View>

          <View className="mt-5 gap-3">
            <Button label="Analisar e enviar orçamento" onPress={onView} />
            <Button label="Agora não" variant="ghost" onPress={onClose} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
