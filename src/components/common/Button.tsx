import type { ReactNode } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { AnimatedPressable } from '@/components/common/AnimatedPressable';
import { colors } from '@/constants/theme';

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  fullWidth?: boolean;
};

const containerClasses: Record<ButtonVariant, string> = {
  primary: 'bg-brand-700 active:bg-brand-800',
  secondary: 'border border-brand-200 bg-brand-50 active:bg-brand-100',
  success: 'bg-green-600 active:bg-green-700',
  danger: 'bg-red-50 active:bg-red-100',
  ghost: 'bg-transparent active:bg-slate-100',
};

const textClasses: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-brand-700',
  success: 'text-white',
  danger: 'text-red-600',
  ghost: 'text-slate-700',
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  fullWidth = true,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      disabled={isDisabled}
      onPress={onPress}
      pressedOpacity={0.88}
      pressedScale={0.975}
      className={`min-h-12 flex-row items-center justify-center gap-2 rounded-2xl px-5 ${
        containerClasses[variant]
      } ${fullWidth ? 'w-full' : ''} ${isDisabled ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'primary' || variant === 'success' ? colors.white : colors.brand700}
        />
      ) : (
        <>
          {icon ? <View>{icon}</View> : null}
          <Text className={`text-base font-bold ${textClasses[variant]}`}>{label}</Text>
        </>
      )}
    </AnimatedPressable>
  );
}
