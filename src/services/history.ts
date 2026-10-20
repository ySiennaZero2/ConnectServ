import { requireSupabase } from '@/lib/supabase';

export const historyService = {
  async listMine() {
    const client = requireSupabase();
    const [reviewsResult, cancellationsResult] = await Promise.all([
      client
        .from('reviews')
        .select('*, appointment:appointments(*)')
        .order('created_at', { ascending: false }),
      client
        .from('appointment_cancellations')
        .select('*, appointment:appointments(*)')
        .order('created_at', { ascending: false }),
    ]);
    if (reviewsResult.error) throw new Error(reviewsResult.error.message);
    if (cancellationsResult.error) throw new Error(cancellationsResult.error.message);
    return {
      reviews: reviewsResult.data ?? [],
      cancellations: cancellationsResult.data ?? [],
    };
  },

  async replyToCancellation(cancellationId: string, reply: string) {
    const client = requireSupabase();
    const { data, error } = await client.rpc('reply_to_cancellation', {
      p_cancellation_id: cancellationId,
      p_reply: reply.trim(),
    });
    if (error) throw new Error(error.message);
    return data;
  },

  async reportComment(kind: 'review' | 'cancellation', id: string) {
    const client = requireSupabase();
    const { data, error } = await client.rpc('report_history_comment', {
      p_kind: kind,
      p_comment_id: id,
    });
    if (error) throw new Error(error.message);
    return data;
  },
};
