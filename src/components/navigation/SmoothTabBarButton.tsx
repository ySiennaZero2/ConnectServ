import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';

import { AnimatedPressable } from '@/components/common/AnimatedPressable';

export function SmoothTabBarButton({
  accessibilityLabel,
  accessibilityState,
  children,
  onLongPress,
  onPress,
  style,
  testID,
}: BottomTabBarButtonProps) {
  return (
    <AnimatedPressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={accessibilityState}
      animationDuration={100}
      onLongPress={onLongPress}
      onPress={onPress}
      pressedOpacity={0.75}
      pressedScale={0.92}
      style={[{ flex: 1 }, style]}
      testID={testID}
    >
      {children}
    </AnimatedPressable>
  );
}
