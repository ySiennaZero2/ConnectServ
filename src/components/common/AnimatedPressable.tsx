import type { ComponentProps } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Pressable } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const ReanimatedPressable = Animated.createAnimatedComponent(Pressable);

type AnimatedPressableProps = Omit<ComponentProps<typeof Pressable>, 'style'> & {
  className?: string;
  style?: StyleProp<ViewStyle>;
  pressedOpacity?: number;
  pressedScale?: number;
  animationDuration?: number;
};

export function AnimatedPressable({
  animationDuration = 120,
  disabled,
  onPressIn,
  onPressOut,
  pressedOpacity = 0.9,
  pressedScale = 0.98,
  style,
  ...props
}: AnimatedPressableProps) {
  const progress = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - (1 - pressedOpacity) * progress.value,
    transform: [{ scale: 1 - (1 - pressedScale) * progress.value }],
  }));

  const animateTo = (value: number) => {
    progress.value = withTiming(value, {
      duration: reduceMotion ? 0 : animationDuration,
      easing: Easing.out(Easing.quad),
    });
  };

  return (
    <ReanimatedPressable
      {...props}
      disabled={disabled}
      onPressIn={(event) => {
        if (!disabled) animateTo(1);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        animateTo(0);
        onPressOut?.(event);
      }}
      style={[style, animatedStyle]}
    />
  );
}
