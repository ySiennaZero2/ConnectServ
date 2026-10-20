import { Star } from 'lucide-react-native';
import { View } from 'react-native';

import { AnimatedPressable } from '@/components/common/AnimatedPressable';
import { colors } from '@/constants/theme';

type StarRatingProps = {
  value: number;
  onChange?: (rating: number) => void;
  size?: number;
};

export function StarRating({ value, onChange, size = 32 }: StarRatingProps) {
  return (
    <View className="flex-row gap-2">
      {[1, 2, 3, 4, 5].map((rating) => {
        const selected = rating <= value;
        return (
          <AnimatedPressable
            key={rating}
            accessibilityRole={onChange ? 'button' : 'image'}
            accessibilityLabel={`${rating} estrela${rating > 1 ? 's' : ''}`}
            disabled={!onChange}
            onPress={() => onChange?.(rating)}
            hitSlop={6}
            pressedOpacity={0.7}
            pressedScale={0.8}
          >
            <Star
              size={size}
              color={selected ? '#F59E0B' : colors.slate200}
              fill={selected ? '#F59E0B' : 'transparent'}
            />
          </AnimatedPressable>
        );
      })}
    </View>
  );
}
