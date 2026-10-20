import { requireSupabase } from '@/lib/supabase';
import type { CommunityMessage } from '@/types';

type CommunityMessageRow = {
  id: string;
  request_id: string;
  quote_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  sender?: { full_name?: string } | null;
};

function mapMessage(row: CommunityMessageRow): CommunityMessage {
  return {
    id: row.id,
    requestId: row.request_id,
    quoteId: row.quote_id,
    senderId: row.sender_id,
    senderName: row.sender?.full_name ?? 'Participante',
    body: row.body,
    createdAt: row.created_at,
  };
}

export function isDatabaseId(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}

export const communityService = {
  async listMessages(quoteId: string) {
    const client = requireSupabase();
    const { data, error } = await client
      .from('community_messages')
      .select('*, sender:profiles!community_messages_sender_id_fkey(full_name)')
      .eq('quote_id', quoteId)
      .order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return ((data ?? []) as CommunityMessageRow[]).map(mapMessage);
  },

  async sendMessage(requestId: string, quoteId: string, body: string) {
    const client = requireSupabase();
    const { data: userData } = await client.auth.getUser();
    if (!userData.user) throw new Error('Sessão expirada. Entre novamente.');

    const { data, error } = await client
      .from('community_messages')
      .insert({
        request_id: requestId,
        quote_id: quoteId,
        sender_id: userData.user.id,
        body: body.trim(),
      })
      .select('*, sender:profiles!community_messages_sender_id_fkey(full_name)')
      .single();
    if (error) throw new Error(error.message);
    return mapMessage(data as CommunityMessageRow);
  },

  subscribeToMessages(
    quoteId: string,
    onMessage: (message: CommunityMessage) => void,
  ) {
    const client = requireSupabase();
    const channel = client
      .channel(`community-chat-${quoteId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'community_messages',
          filter: `quote_id=eq.${quoteId}`,
        },
        async (payload) => {
          const messageId = (payload.new as { id?: string }).id;
          if (!messageId) return;
          const { data } = await client
            .from('community_messages')
            .select('*, sender:profiles!community_messages_sender_id_fkey(full_name)')
            .eq('id', messageId)
            .single();
          if (data) onMessage(mapMessage(data as CommunityMessageRow));
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  },
};
