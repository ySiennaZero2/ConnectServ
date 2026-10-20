import { ExternalLink, ImageIcon, Play, Trash2, Video } from 'lucide-react-native';
import { Image, Linking, ScrollView, Text, View } from 'react-native';

import { AnimatedPressable } from '@/components/common/AnimatedPressable';
import { colors } from '@/constants/theme';
import type { RequestMedia } from '@/types';

type RequestMediaGalleryProps = {
  media: RequestMedia[];
  editable?: boolean;
  onRemove?: (mediaId: string) => void;
};

export function RequestMediaGallery({
  media,
  editable = false,
  onRemove,
}: RequestMediaGalleryProps) {
  if (!media.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="gap-3 pr-5"
    >
      {media.map((item) => (
        <View key={item.id} className="w-36 overflow-hidden rounded-2xl bg-slate-100">
          {item.type === 'image' ? (
            <AnimatedPressable
              accessibilityLabel="Abrir imagem anexada"
              accessibilityRole="button"
              onPress={() => Linking.openURL(item.uri)}
              pressedOpacity={0.86}
              className="h-28 w-full"
            >
              <Image source={{ uri: item.uri }} className="h-full w-full bg-slate-200" />
              <View className="absolute bottom-2 right-2 h-7 w-7 items-center justify-center rounded-full bg-slate-950/60">
                <ExternalLink size={14} color={colors.white} />
              </View>
            </AnimatedPressable>
          ) : (
            <AnimatedPressable
              accessibilityLabel="Reproduzir vídeo anexado"
              accessibilityRole="button"
              onPress={() => Linking.openURL(item.uri)}
              pressedOpacity={0.86}
              className="h-28 items-center justify-center bg-brand-950"
            >
              <View className="h-12 w-12 items-center justify-center rounded-full bg-white/20">
                <Play size={22} color={colors.white} fill={colors.white} />
              </View>
              <Text className="mt-2 text-xs font-bold text-white">Abrir vídeo</Text>
            </AnimatedPressable>
          )}

          <View className="flex-row items-center gap-1.5 px-2.5 py-2">
            {item.type === 'image' ? (
              <ImageIcon size={13} color={colors.slate500} />
            ) : (
              <Video size={13} color={colors.slate500} />
            )}
            <Text className="flex-1 text-[10px] font-semibold text-slate-500" numberOfLines={1}>
              {item.fileName || (item.type === 'image' ? 'Imagem' : 'Vídeo')}
            </Text>
            {editable ? (
              <AnimatedPressable
                accessibilityLabel="Remover anexo"
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => onRemove?.(item.id)}
                pressedScale={0.8}
              >
                <Trash2 size={15} color={colors.danger} />
              </AnimatedPressable>
            ) : null}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}
