import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { Easing, FadeIn, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type ScreenProps = {
  children: ReactNode;
  className?: string;
  topInset?: boolean;
  bottomInset?: boolean;
  animated?: boolean;
};

export function Screen({
  children,
  className = '',
  topInset = true,
  bottomInset = false,
  animated = true,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

  const content = animated ? (
    <Animated.View
      entering={FadeIn.duration(180)
        .easing(Easing.out(Easing.quad))
        .reduceMotion(ReduceMotion.System)}
      style={{ flex: 1 }}
    >
      {children}
    </Animated.View>
  ) : (
    children
  );

  return (
    <View
      className={`flex-1 bg-slate-50 ${className}`}
      style={{
        paddingTop: topInset ? insets.top : 0,
        paddingBottom: bottomInset ? insets.bottom : 0,
      }}
    >
      {content}
    </View>
  );
}
