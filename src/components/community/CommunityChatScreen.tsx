import { ArrowLeft, MessageCircle, Send } from 'lucide-react-native';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { AnimatedPressable } from '@/components/common/AnimatedPressable';
import { Screen } from '@/components/common/Screen';
import { colors } from '@/constants/theme';
import { isSupabaseConfigured } from '@/lib/supabase';
import { communityService, isDatabaseId } from '@/services/community';
import { useAppStore } from '@/store/useAppStore';
import type { ProviderProfile, ServiceQuote, ServiceRequest } from '@/types';

type CommunityChatScreenProps = {
  request: ServiceRequest;
  quote: ServiceQuote;
  provider?: ProviderProfile;
  onBack: () => void;
};

export function CommunityChatScreen({
  request,
  quote,
  provider,
  onBack,
}: CommunityChatScreenProps) {
  const currentUser = useAppStore((state) => state.currentUser);
  const allMessages = useAppStore((state) => state.communityMessages);
  const sendCommunityMessage = useAppStore((state) => state.sendCommunityMessage);
  const receiveCommunityMessage = useAppStore((state) => state.receiveCommunityMessage);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const messages = useMemo(
    () =>
      allMessages
        .filter((message) => message.quoteId === quote.id)
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
    [allMessages, quote.id],
  );
  const databaseConversation =
    isSupabaseConfigured && isDatabaseId(request.id) && isDatabaseId(quote.id);

  useEffect(() => {
    if (!databaseConversation) return;
    let active = true;
    void communityService
      .listMessages(quote.id)
      .then((items) => {
        if (active) items.forEach(receiveCommunityMessage);
      })
      .catch(() => undefined);
    const unsubscribe = communityService.subscribeToMessages(
      quote.id,
      receiveCommunityMessage,
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [databaseConversation, quote.id, receiveCommunityMessage]);

  const handleSend = async () => {
    const trimmedBody = body.trim();
    if (!trimmedBody || sending) return;
    setSending(true);
    try {
      if (databaseConversation) {
        const message = await communityService.sendMessage(request.id, quote.id, trimmedBody);
        receiveCommunityMessage(message);
      } else if (!sendCommunityMessage(quote.id, trimmedBody)) {
        throw new Error('Não foi possível identificar os participantes desta conversa.');
      }
      setBody('');
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
    } catch (error) {
      Alert.alert(
        'Não foi possível enviar',
        error instanceof Error ? error.message : 'Tente novamente em instantes.',
      );
    } finally {
      setSending(false);
    }
  };

  const viewerIsClient = currentUser?.role === 'client';
  const partnerName = viewerIsClient ? quote.providerName : request.clientName;

  return (
    <Screen bottomInset className="bg-slate-50">
      <View className="flex-row items-center gap-3 border-b border-slate-100 bg-white px-4 py-3">
        <AnimatedPressable
          accessibilityLabel="Voltar para a Comunidade"
          onPress={onBack}
          className="h-10 w-10 items-center justify-center rounded-full active:bg-slate-100"
        >
          <ArrowLeft size={22} color={colors.slate900} />
        </AnimatedPressable>
        {viewerIsClient ? (
          <Image
            source={{ uri: provider?.avatarUrl }}
            className="h-10 w-10 rounded-full bg-slate-200"
          />
        ) : (
          <View className="h-10 w-10 items-center justify-center rounded-full bg-brand-50">
            <MessageCircle size={20} color={colors.brand700} />
          </View>
        )}
        <View className="min-w-0 flex-1">
          <Text className="font-black text-slate-950" numberOfLines={1}>{partnerName}</Text>
          <Text className="mt-0.5 text-xs text-emerald-600">Conversa sobre a proposta</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="mx-4 mt-3 rounded-2xl border border-brand-100 bg-brand-50 px-4 py-3">
          <Text className="text-xs font-black uppercase tracking-wide text-brand-700">
            {request.title}
          </Text>
          <Text className="mt-1 text-xs text-brand-600" numberOfLines={2}>{quote.message}</Text>
        </View>

        <ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerClassName="px-4 py-5"
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {!messages.length ? (
            <View className="items-center px-8 py-12">
              <MessageCircle size={30} color={colors.slate400} />
              <Text className="mt-3 text-center font-bold text-slate-700">
                Inicie o alinhamento
              </Text>
              <Text className="mt-1 text-center text-sm leading-5 text-slate-500">
                Combine detalhes, materiais e disponibilidade antes do agendamento.
              </Text>
            </View>
          ) : null}
          {messages.map((message) => {
            const own = viewerIsClient
              ? message.senderId === request.clientId
              : message.senderId === quote.providerId;
            return (
              <View key={message.id} className={`mb-3 ${own ? 'items-end' : 'items-start'}`}>
                <View
                  className={`max-w-[82%] rounded-2xl px-4 py-3 ${
                    own ? 'rounded-br-md bg-brand-700' : 'rounded-bl-md bg-white'
                  }`}
                >
                  {!own ? (
                    <Text className="mb-1 text-[10px] font-black text-brand-700">
                      {message.senderName}
                    </Text>
                  ) : null}
                  <Text className={`text-sm leading-5 ${own ? 'text-white' : 'text-slate-700'}`}>
                    {message.body}
                  </Text>
                  <Text className={`mt-1 text-right text-[9px] ${own ? 'text-brand-200' : 'text-slate-400'}`}>
                    {new Date(message.createdAt).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        <View className="flex-row items-end gap-2 border-t border-slate-100 bg-white px-4 py-3">
          <TextInput
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={1000}
            placeholder="Digite uma mensagem..."
            placeholderTextColor={colors.slate400}
            className="max-h-28 min-h-12 flex-1 rounded-2xl bg-slate-100 px-4 py-3 text-sm text-slate-900"
          />
          <AnimatedPressable
            accessibilityLabel="Enviar mensagem"
            accessibilityState={{ disabled: !body.trim() || sending }}
            disabled={!body.trim() || sending}
            onPress={handleSend}
            className="h-12 w-12 items-center justify-center rounded-2xl bg-brand-700 disabled:opacity-40"
          >
            <Send size={20} color={colors.white} />
          </AnimatedPressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
