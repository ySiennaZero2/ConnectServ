import { ChevronDown, ChevronUp, CircleHelp, Headphones, MessageCircle, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';

import { AccountSectionHeader } from '@/components/account/AccountSectionHeader';
import { AnimatedPressable } from '@/components/common/AnimatedPressable';
import { Button } from '@/components/common/Button';
import { Screen } from '@/components/common/Screen';
import { colors } from '@/constants/theme';
import { useAppStore } from '@/store/useAppStore';
import type { UserRole } from '@/types';

type HelpSupportScreenProps = {
  role: UserRole;
  onBack: () => void;
};

const clientFaqs = [
  {
    question: 'Como peço um orçamento?',
    answer:
      'Na tela inicial, toque em “Comunidade”, escolha a categoria, descreva o serviço e envie fotos ou vídeos. A publicação ficará no mural dos profissionais que atendem à cidade selecionada.',
  },
  {
    question: 'O ConectaServ cobra taxas dos clientes?',
    answer:
      'Não. Solicitar e comparar orçamentos não gera cobrança no aplicativo. O valor do serviço é combinado diretamente com o profissional.',
  },
  {
    question: 'Como escolho uma data disponível?',
    answer:
      'Após escolher o profissional, o calendário mostra apenas os dias e horários habilitados na agenda dele.',
  },
  {
    question: 'Posso cancelar uma solicitação?',
    answer:
      'Pedidos ainda abertos podem ser cancelados na área de serviços. Se já houver confirmação, converse com o profissional antes do horário marcado.',
  },
];

const providerFaqs = [
  {
    question: 'Como gerenciar minha agenda e cidades?',
    answer:
      'Em “Meu perfil”, marque os dias, o horário comercial e todas as cidades onde atende. Você só recebe pedidos compatíveis com essas configurações.',
  },
  {
    question: 'Como funciona o dashboard de ganhos?',
    answer:
      'Ao concluir um serviço, registre o valor final e a forma de pagamento. O dashboard calcula totais, evolução mensal e histórico sem movimentar o dinheiro.',
  },
  {
    question: 'O que fazer se o cliente não responder?',
    answer:
      'Mantenha a solicitação pendente e tente contato pelos canais combinados. Não marque o serviço como concluído sem a execução e o recebimento.',
  },
  {
    question: 'Como pausar meu perfil durante as férias?',
    answer:
      'Em “Segurança e privacidade”, ative “Ocultar meu perfil temporariamente”. Você deixa de aparecer nas buscas sem perder os agendamentos existentes.',
  },
];

export function HelpSupportScreen({ role, onBack }: HelpSupportScreenProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0);
  const professional = role === 'provider';
  const providerPlan = useAppStore((state) =>
    state.providers.find((item) => item.id === state.currentUser?.id)?.currentPlan,
  );
  const vip = professional && providerPlan === 'premium';
  const faqs = professional ? providerFaqs : clientFaqs;

  const openSupport = () => {
    const protocol = `CS-${Date.now().toString().slice(-6)}`;
    Alert.alert(
      vip ? 'Suporte VIP via WhatsApp' : professional ? 'Central profissional iniciada' : 'WhatsApp de suporte',
      vip
        ? `Canal VIP via WhatsApp simulado com sucesso. Protocolo: ${protocol}.`
        : professional
        ? `Chamado prioritário ${protocol} simulado com sucesso. Nossa equipe responderá pelo seu WhatsApp cadastrado.`
        : `Abertura do WhatsApp simulada. Informe este protocolo ao suporte: ${protocol}.`,
    );
  };

  return (
    <Screen className="bg-slate-50">
      <AccountSectionHeader
        title="Ajuda e suporte"
        subtitle={professional ? 'Suporte para sua rotina profissional' : 'Como podemos ajudar?'}
        onBack={onBack}
      />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerClassName="px-5 pb-8">
        <View className="mt-5 overflow-hidden rounded-3xl bg-brand-700 p-5">
          <View className="absolute -right-6 -top-8 h-28 w-28 rounded-full bg-white/10" />
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            {professional ? (
              <Headphones size={24} color={colors.white} />
            ) : (
              <Sparkles size={24} color={colors.white} />
            )}
          </View>
          <Text className="mt-4 text-xl font-black text-white">
            {professional ? 'Conte com a gente no seu trabalho' : 'Resolver dúvidas ficou fácil'}
          </Text>
          <Text className="mt-2 text-sm leading-6 text-brand-100">
            {professional
              ? 'Encontre respostas sobre agenda, pedidos e organização dos seus recebimentos.'
              : 'Veja respostas rápidas ou inicie uma conversa com nosso suporte.'}
          </Text>
        </View>

        <View className="mt-7 flex-row items-center gap-2">
          <CircleHelp size={20} color={colors.brand700} />
          <Text className="text-lg font-black text-slate-950">FAQs rápidas</Text>
        </View>
        <View className="mt-3 overflow-hidden rounded-3xl border border-slate-100 bg-white">
          {faqs.map((faq, index) => {
            const expanded = expandedIndex === index;
            return (
              <View
                key={faq.question}
                className={index < faqs.length - 1 ? 'border-b border-slate-100' : ''}
              >
                <AnimatedPressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  onPress={() => setExpandedIndex((current) => (current === index ? null : index))}
                  className="flex-row items-center gap-3 px-4 py-4 active:bg-slate-50"
                >
                  <Text className="flex-1 font-extrabold leading-5 text-slate-800">
                    {faq.question}
                  </Text>
                  {expanded ? (
                    <ChevronUp size={19} color={colors.brand700} />
                  ) : (
                    <ChevronDown size={19} color={colors.slate400} />
                  )}
                </AnimatedPressable>
                {expanded ? (
                  <View className="bg-slate-50 px-4 pb-4 pt-1">
                    <Text className="text-sm leading-6 text-slate-600">{faq.answer}</Text>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>

        <View className="mt-6 rounded-3xl border border-brand-100 bg-white p-5">
          <Text className="font-black text-slate-950">Ainda precisa de ajuda?</Text>
          <Text className="mt-1 text-sm leading-5 text-slate-500">
            {professional
              ? 'Abra um chamado prioritário com a equipe especializada.'
              : 'Converse com a equipe e envie os detalhes da sua dúvida.'}
          </Text>
          <View className="mt-4">
            <Button
              label={
                professional
                  ? vip
                    ? 'Suporte VIP via WhatsApp'
                    : 'Central de Ajuda ao Profissional'
                  : 'Falar com Suporte via WhatsApp'
              }
              icon={
                professional ? (
                  <Headphones size={19} color={colors.white} />
                ) : (
                  <MessageCircle size={19} color={colors.white} />
                )
              }
              onPress={openSupport}
            />
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}
