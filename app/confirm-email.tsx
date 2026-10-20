import { router } from 'expo-router';
import { AlertCircle, CheckCircle2, MailCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { Button } from '@/components/common/Button';
import { Logo } from '@/components/common/Logo';
import { Screen } from '@/components/common/Screen';
import { colors } from '@/constants/theme';
import {
  requireSupabase,
  subscribeToAuthDeepLinks,
  type AuthDeepLinkResult,
} from '@/lib/supabase';

type ConfirmationState =
  | { status: 'processing' }
  | { status: 'success'; role?: 'client' | 'provider' }
  | { status: 'error'; message: string };

export default function ConfirmEmailScreen() {
  const [confirmation, setConfirmation] = useState<ConfirmationState>({
    status: 'processing',
  });

  useEffect(() => {
    const applyResult = (result: AuthDeepLinkResult) => {
      if (result.status === 'success') {
        setConfirmation({ status: 'success', role: result.role });
      } else if (result.status === 'error') {
        setConfirmation({ status: 'error', message: result.message });
      }
    };

    const unsubscribeFromLinks = subscribeToAuthDeepLinks(applyResult);
    const client = requireSupabase();
    const { data: authListener } = client.auth.onAuthStateChange((_event, session) => {
      if (!session?.user.email_confirmed_at) return;
      const metadataRole = session.user.user_metadata?.role;
      setConfirmation({
        status: 'success',
        role:
          metadataRole === 'client' || metadataRole === 'provider'
            ? metadataRole
            : undefined,
      });
    });

    return () => {
      unsubscribeFromLinks();
      authListener.subscription.unsubscribe();
    };
  }, []);

  const goToLogin = () => {
    router.replace({
      pathname: '/auth',
      params: confirmation.status === 'success' ? { role: confirmation.role ?? 'client' } : {},
    });
  };

  return (
    <Screen bottomInset>
      <View className="flex-1 px-6">
        <View className="items-center pt-8">
          <Logo />
        </View>

        <View className="flex-1 items-center justify-center pb-16">
          <View className="h-24 w-24 items-center justify-center rounded-full bg-brand-50">
            {confirmation.status === 'processing' ? (
              <ActivityIndicator size="large" color={colors.brand700} />
            ) : confirmation.status === 'success' ? (
              <CheckCircle2 size={48} color={colors.success} />
            ) : (
              <AlertCircle size={48} color={colors.danger} />
            )}
          </View>

          <View className="mt-7 items-center">
            <Text className="text-center text-2xl font-extrabold text-slate-900">
              {confirmation.status === 'processing'
                ? 'Confirmando seu e-mail...'
                : confirmation.status === 'success'
                  ? 'E-mail confirmado!'
                  : 'Não foi possível confirmar'}
            </Text>
            <Text className="mt-3 max-w-sm text-center text-base leading-6 text-slate-500">
              {confirmation.status === 'processing'
                ? 'Aguarde enquanto validamos o link com segurança.'
                : confirmation.status === 'success'
                  ? 'Sua conta está ativa. Agora você já pode entrar no ConectaServ.'
                  : confirmation.message}
            </Text>
          </View>

          <View className="mt-8 w-full gap-3">
            {confirmation.status === 'success' ? (
              <Button
                label="Entrar no ConectaServ"
                icon={<MailCheck size={20} color={colors.white} />}
                onPress={goToLogin}
              />
            ) : null}
            {confirmation.status === 'error' ? (
              <>
                <Button label="Voltar para o login" onPress={goToLogin} />
                <Text className="text-center text-xs leading-5 text-slate-400">
                  Se o link expirou, faça um novo cadastro ou solicite outro e-mail de confirmação.
                </Text>
              </>
            ) : null}
          </View>
        </View>
      </View>
    </Screen>
  );
}
