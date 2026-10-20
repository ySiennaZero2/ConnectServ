import * as Clipboard from 'expo-clipboard';
import {
  ArrowLeft,
  Check,
  CircleCheck,
  Copy,
  CreditCard,
  Crown,
  QrCode,
  ShieldCheck,
  Sparkles,
  Star,
  X,
} from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import { AnimatedPressable } from '@/components/common/AnimatedPressable';
import { Button } from '@/components/common/Button';
import { Screen } from '@/components/common/Screen';
import { MercadoPagoCardForm } from '@/components/subscriptions/MercadoPagoCardForm';
import { colors } from '@/constants/theme';
import { formatCurrency } from '@/data/paymentMethods';
import { getSubscriptionPlan, subscriptionPlans } from '@/data/subscriptionPlans';
import { isSupabaseConfigured } from '@/lib/supabase';
import { providersService } from '@/services/providers';
import {
  subscriptionsService,
  type CardTokenData,
  type CheckoutMethod,
  type CheckoutResponse,
  type PaidPlan,
} from '@/services/subscriptions';
import { useAppStore } from '@/store/useAppStore';
import type { SubscriptionPlan } from '@/types';

type PlansScreenProps = { onBack: () => void };

const planStyles: Record<SubscriptionPlan, { border: string; background: string; accent: string }> = {
  gratuito: { border: 'border-slate-200', background: 'bg-white', accent: '#475569' },
  profissional: { border: 'border-blue-400', background: 'bg-blue-50', accent: '#2563EB' },
  premium: { border: 'border-amber-400', background: 'bg-amber-50', accent: '#D97706' },
};

export function PlansScreen({ onBack }: PlansScreenProps) {
  const currentUser = useAppStore((state) => state.currentUser);
  const provider = useAppStore((state) =>
    state.providers.find((item) => item.id === state.currentUser?.id),
  );
  const changeProviderPlan = useAppStore((state) => state.changeProviderPlan);
  const refreshProviderUsageCycle = useAppStore((state) => state.refreshProviderUsageCycle);
  const [checkoutPlan, setCheckoutPlan] = useState<PaidPlan | null>(null);
  const [method, setMethod] = useState<CheckoutMethod>('pix');
  const [pixPayment, setPixPayment] = useState<CheckoutResponse | null>(null);
  const [publicKey, setPublicKey] = useState('');
  const [checkoutAmounts, setCheckoutAmounts] = useState<Record<PaidPlan, number> | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successPlan, setSuccessPlan] = useState<PaidPlan | null>(null);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');

  useEffect(() => {
    refreshProviderUsageCycle();
    if (isSupabaseConfigured) providersService.refreshMyPlanCycle().catch(() => undefined);
  }, [refreshProviderUsageCycle]);

  useEffect(() => {
    if (!checkoutPlan || method !== 'cartao' || publicKey) return;
    subscriptionsService
      .getConfig()
      .then(({ publicKey: key, checkoutAmounts: amounts }) => {
        setPublicKey(key);
        setCheckoutAmounts(amounts);
      })
      .catch((error: unknown) =>
        setErrorMessage(error instanceof Error ? error.message : 'Não foi possível carregar o cartão.'),
      );
  }, [checkoutPlan, method, publicKey]);

  const activateInApp = useCallback(
    (plan: PaidPlan) => {
      changeProviderPlan(plan);
      setCheckoutPlan(null);
      setPixPayment(null);
      setSuccessPlan(plan);
    },
    [changeProviderPlan],
  );

  useEffect(() => {
    if (
      !checkoutPlan ||
      !pixPayment?.orderId ||
      !['pending', 'in_process'].includes(pixPayment.status)
    ) return;
    let checking = false;
    const interval = setInterval(async () => {
      if (checking) return;
      checking = true;
      try {
        const result = await subscriptionsService.getStatus(pixPayment.orderId);
        if (result.activated || result.status === 'approved') activateInApp(result.plan);
        else {
          setPixPayment((current) => (current ? { ...current, status: result.status } : current));
          if (!['pending', 'in_process'].includes(result.status)) {
            setErrorMessage('Este Pix expirou ou não foi aprovado. Feche o checkout e gere um novo código.');
          }
        }
      } catch {
        // Mantém o polling; falhas transitórias não fecham nem invalidam o Pix.
      } finally {
        checking = false;
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [activateInApp, checkoutPlan, pixPayment?.orderId, pixPayment?.status]);

  if (!provider || currentUser?.role !== 'provider') return null;

  const closeCheckout = () => {
    if (loading) return;
    setCheckoutPlan(null);
    setPixPayment(null);
    setErrorMessage('');
    setMethod('pix');
  };

  const startPaidCheckout = (plan: PaidPlan) => {
    setCheckoutPlan(plan);
    setMethod('pix');
    setPixPayment(null);
    setErrorMessage('');
  };

  const createPix = async () => {
    if (!checkoutPlan) return;
    setLoading(true);
    setErrorMessage('');
    try {
      const payment = await subscriptionsService.checkout({
        plan: checkoutPlan,
        method: 'pix',
      });
      if (!payment.qrCodeBase64 || !payment.pixCopyPaste) {
        throw new Error('O Mercado Pago não retornou os dados do Pix. Tente novamente.');
      }
      setPixPayment(payment);
      if (payment.activated || payment.status === 'approved') activateInApp(checkoutPlan);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível gerar o Pix.');
    } finally {
      setLoading(false);
    }
  };

  const payWithCard = async (card: CardTokenData) => {
    if (!checkoutPlan) return;
    setLoading(true);
    setErrorMessage('');
    try {
      const payment = await subscriptionsService.checkout({
        plan: checkoutPlan,
        method: 'cartao',
        card,
      });
      if (payment.activated || payment.status === 'approved') {
        activateInApp(checkoutPlan);
      } else {
        throw new Error(
          payment.statusDetail
            ? `Pagamento não aprovado (${payment.statusDetail}). Revise os dados ou use Pix.`
            : 'Pagamento não aprovado. Revise os dados ou use Pix.',
        );
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Não foi possível processar o cartão.');
    } finally {
      setLoading(false);
    }
  };

  const cancelSubscription = async () => {
    setCancelling(true);
    setCancelError('');
    try {
      await subscriptionsService.cancel();
      if (!changeProviderPlan('gratuito')) throw new Error('Não foi possível atualizar o plano local.');
      setCancelModalVisible(false);
      Alert.alert(
        'Assinatura cancelada',
        'Você voltou ao Plano Gratuito e o limite de 5 atendimentos mensais já está ativo.',
      );
    } catch (error) {
      setCancelError(error instanceof Error ? error.message : 'Não foi possível cancelar a assinatura.');
    } finally {
      setCancelling(false);
    }
  };

  const nextReset = new Date(new Date(provider.lastUsageResetAt).getTime() + 30 * 86400000);
  const selectedDefinition = checkoutPlan ? getSubscriptionPlan(checkoutPlan) : null;
  const documentType = provider.documentType ?? currentUser.documentType ?? 'CPF';
  const documentNumber = (provider.cpfCnpj ?? currentUser.cpfCnpj ?? '').replace(/\D/g, '');

  return (
    <Screen className="bg-slate-50">
      <View className="flex-row items-center border-b border-slate-100 bg-white px-5 py-3">
        <AnimatedPressable accessibilityLabel="Voltar" onPress={onBack} className="h-10 w-10 items-center justify-center rounded-full active:bg-slate-100">
          <ArrowLeft size={22} color={colors.slate900} />
        </AnimatedPressable>
        <View className="flex-1 pr-10">
          <Text className="text-center text-base font-black text-slate-950">Meus Planos</Text>
          <Text className="text-center text-[11px] text-slate-500">Cresça no ConectaServ</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-5 pb-9">
        <View className="mt-5 rounded-3xl bg-brand-950 p-5">
          <View className="flex-row items-center gap-3">
            <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/10"><Sparkles size={23} color="#FBBF24" /></View>
            <View className="flex-1">
              <Text className="text-xs font-bold uppercase tracking-wider text-brand-200">Seu ciclo atual</Text>
              <Text className="mt-1 text-xl font-black text-white">{getSubscriptionPlan(provider.currentPlan).name}</Text>
            </View>
          </View>
          <View className="mt-4 rounded-2xl bg-white/10 p-4">
            <Text className="text-sm font-bold text-white">{provider.currentMonthServices} ações contabilizadas</Text>
            <Text className="mt-1 text-xs text-brand-100">Renovação do ciclo em {nextReset.toLocaleDateString('pt-BR')}.</Text>
          </View>
        </View>

        <View className="mt-6 gap-5">
          {subscriptionPlans.map((plan) => {
            const current = plan.id === provider.currentPlan;
            const style = planStyles[plan.id];
            const Icon = plan.id === 'premium' ? Crown : plan.id === 'profissional' ? ShieldCheck : Star;
            return (
              <View key={plan.id} className={`overflow-hidden rounded-[28px] border-2 ${style.border} ${style.background}`}>
                {plan.popular ? <View className="items-center bg-blue-600 py-2"><Text className="text-xs font-black uppercase tracking-widest text-white">Mais Popular</Text></View> : null}
                <View className="p-5">
                  <View className="flex-row items-start gap-3">
                    <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white"><Icon size={23} color={style.accent} /></View>
                    <View className="flex-1">
                      <Text className="text-xl font-black text-slate-950">{plan.name}</Text>
                      <View className="mt-1 flex-row items-end gap-1"><Text className="text-2xl font-black text-slate-950">{formatCurrency(plan.price)}</Text><Text className="pb-1 text-xs font-bold text-slate-500">/mês</Text></View>
                    </View>
                    {current ? <View className="rounded-full bg-emerald-100 px-3 py-1.5"><Text className="text-[10px] font-black text-emerald-700">Seu Plano Atual</Text></View> : null}
                  </View>
                  <View className="mt-5 gap-3">
                    {plan.features.map((feature) => <View key={feature} className="flex-row items-start gap-2.5"><View className="mt-0.5 h-5 w-5 items-center justify-center rounded-full bg-white"><Check size={13} color={style.accent} strokeWidth={3} /></View><Text className="flex-1 text-sm leading-5 text-slate-700">{feature}</Text></View>)}
                  </View>
                  <View className="mt-6">
                    <Button
                      label={
                        current
                          ? 'Seu Plano Atual'
                          : plan.id === 'gratuito'
                            ? 'Cancelar Assinatura / Voltar para o Gratuito'
                            : 'Assinar Agora'
                      }
                      variant={plan.id === 'gratuito' && provider.currentPlan !== 'gratuito' ? 'danger' : plan.id === 'premium' ? 'secondary' : 'primary'}
                      disabled={current}
                      onPress={() => {
                        if (plan.id === 'gratuito') {
                          setCancelError('');
                          setCancelModalVisible(true);
                        } else {
                          startPaidCheckout(plan.id);
                        }
                      }}
                    />
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      <Modal visible={Boolean(checkoutPlan)} transparent animationType="slide" onRequestClose={closeCheckout}>
        <View className="flex-1 justify-end bg-slate-950/60">
          <Pressable className="flex-1" onPress={closeCheckout} />
          <View className="max-h-[94%] rounded-t-[32px] bg-white px-5 pb-8 pt-5">
            <View className="flex-row items-center gap-3">
              <View className="flex-1"><Text className="text-xl font-black text-slate-950">Checkout seguro</Text><Text className="mt-1 text-sm text-slate-500">{selectedDefinition?.name} • {formatCurrency(selectedDefinition?.price ?? 0)}</Text></View>
              <Pressable accessibilityLabel="Fechar" onPress={closeCheckout} className="h-10 w-10 items-center justify-center rounded-full bg-slate-100"><X size={19} color={colors.slate700} /></Pressable>
            </View>

            <View className="mt-5 flex-row rounded-2xl bg-slate-100 p-1">
              {([{ id: 'pix', label: 'Pix', icon: QrCode }, { id: 'cartao', label: 'Cartão', icon: CreditCard }] as const).map((item) => {
                const active = method === item.id;
                const Icon = item.icon;
                return <Pressable key={item.id} disabled={Boolean(pixPayment) || loading} onPress={() => { setMethod(item.id); setErrorMessage(''); }} className={`flex-1 flex-row items-center justify-center gap-2 rounded-xl py-3 ${active ? 'bg-white' : ''}`}><Icon size={17} color={active ? colors.brand700 : colors.slate500} /><Text className={`font-bold ${active ? 'text-brand-700' : 'text-slate-500'}`}>{item.label}</Text></Pressable>;
              })}
            </View>

            {errorMessage ? <View className="mt-4 rounded-2xl bg-red-50 p-3"><Text className="text-sm font-semibold text-red-700">{errorMessage}</Text></View> : null}

            <ScrollView className="mt-4" showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {method === 'pix' ? (
                pixPayment ? (
                  <View className="items-center pb-3">
                    <View className="rounded-3xl border border-slate-200 bg-white p-3"><Image source={{ uri: `data:image/png;base64,${pixPayment.qrCodeBase64}` }} className="h-56 w-56" resizeMode="contain" /></View>
                    <Text className="mt-4 text-center text-lg font-black text-slate-950">Escaneie ou copie o código Pix</Text>
                    <Text className="mt-1 text-center text-sm leading-5 text-slate-500">Aprovação instantânea assim que o Pix for pago.</Text>
                    <View className="mt-4 w-full rounded-2xl bg-slate-100 p-3"><Text numberOfLines={3} className="text-xs leading-5 text-slate-600">{pixPayment.pixCopyPaste}</Text></View>
                    <View className="mt-3 w-full"><Button label="Copiar Código Pix" icon={<Copy size={17} color={colors.white} />} onPress={() => { void Clipboard.setStringAsync(pixPayment.pixCopyPaste ?? ''); Alert.alert('Código copiado', 'Cole o código no aplicativo do seu banco.'); }} /></View>
                    <View className="mt-4 flex-row items-center gap-2"><ActivityIndicator size="small" color={colors.brand700} /><Text className="text-xs font-semibold text-slate-500">Aguardando confirmação do Mercado Pago...</Text></View>
                  </View>
                ) : (
                  <View className="pb-3"><View className="rounded-2xl bg-blue-50 p-4"><Text className="font-black text-blue-950">Pix com validade de 30 minutos</Text><Text className="mt-1 text-sm leading-5 text-blue-800">O plano será ativado automaticamente após a confirmação do pagamento.</Text></View><View className="mt-4"><Button label="Gerar QR Code Pix" loading={loading} onPress={createPix} /></View></View>
                )
              ) : loading ? (
                <View className="items-center py-16"><ActivityIndicator size="large" color={colors.brand700} /><Text className="mt-3 text-sm font-semibold text-slate-500">Processando pagamento com segurança...</Text></View>
              ) : publicKey && documentNumber ? (
                <MercadoPagoCardForm publicKey={publicKey} amount={checkoutPlan ? checkoutAmounts?.[checkoutPlan] ?? selectedDefinition?.price ?? 0 : 0} email={currentUser.email} documentType={documentType} documentNumber={documentNumber} onTokenized={payWithCard} onError={setErrorMessage} />
              ) : publicKey ? (
                <View className="rounded-2xl bg-amber-50 p-4"><Text className="font-bold text-amber-900">Complete seu CPF/CNPJ nos dados profissionais antes de pagar com cartão.</Text></View>
              ) : (
                <View className="items-center py-16"><ActivityIndicator size="large" color={colors.brand700} /><Text className="mt-3 text-sm text-slate-500">Carregando checkout seguro...</Text></View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => !cancelling && setCancelModalVisible(false)}
      >
        <View className="flex-1 items-center justify-center bg-slate-950/70 px-6">
          <View className="w-full max-w-md rounded-[32px] bg-white p-6">
            <View className="flex-row items-start gap-3">
              <View className="h-12 w-12 items-center justify-center rounded-2xl bg-red-50">
                <X size={23} color="#DC2626" />
              </View>
              <View className="flex-1">
                <Text className="text-xl font-black text-slate-950">Cancelar assinatura?</Text>
                <Text className="mt-2 text-sm leading-6 text-slate-600">
                  Tem certeza que deseja cancelar? Você perderá o Selo Verificado e voltará ao
                  limite de 5 atendimentos/mês.
                </Text>
              </View>
            </View>
            {cancelError ? (
              <View className="mt-4 rounded-2xl bg-red-50 p-3">
                <Text className="text-sm font-semibold text-red-700">{cancelError}</Text>
              </View>
            ) : null}
            <View className="mt-6 gap-3">
              <Button
                label="Confirmar Cancelamento"
                variant="danger"
                loading={cancelling}
                onPress={cancelSubscription}
              />
              <Button
                label="Manter meu plano"
                variant="ghost"
                disabled={cancelling}
                onPress={() => setCancelModalVisible(false)}
              />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(successPlan)} transparent animationType="fade" onRequestClose={() => setSuccessPlan(null)}>
        <View className="flex-1 items-center justify-center bg-slate-950/70 px-6">
          <View className="w-full max-w-md items-center rounded-[32px] bg-white p-6"><View className="h-20 w-20 items-center justify-center rounded-full bg-emerald-100"><CircleCheck size={45} color="#059669" /></View><Text className="mt-5 text-center text-2xl font-black text-slate-950">Plano Ativado com Sucesso!</Text><Text className="mt-2 text-center text-sm leading-5 text-slate-500">Os benefícios do plano {successPlan ? getSubscriptionPlan(successPlan).name : ''} já estão liberados.</Text><View className="mt-6 w-full"><Button label="Continuar" variant="success" onPress={() => setSuccessPlan(null)} /></View></View>
        </View>
      </Modal>
    </Screen>
  );
}
