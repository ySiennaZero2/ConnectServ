import { requireSupabase } from '@/lib/supabase';
import type {
  CreateServiceQuoteInput,
  CreateServiceRequestInput,
  RequestMedia,
} from '@/types';
import type { ValeCity } from '@/data/valeCities';

type ServiceRequestAttachmentRow = {
  storage_path: string;
  [key: string]: unknown;
};

function getSafeFileInfo(media: RequestMedia) {
  const mimeType = media.mimeType || (media.type === 'video' ? 'video/mp4' : 'image/jpeg');
  const mimeExtension = mimeType.split('/').pop()?.toLowerCase() || '';
  const fileExtension = media.fileName?.split('.').pop()?.toLowerCase() || mimeExtension;
  const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov', 'webm'];
  const extension = allowedExtensions.includes(fileExtension)
    ? fileExtension
    : media.type === 'video'
      ? 'mp4'
      : 'jpg';
  return { mimeType, extension };
}

async function createSignedMediaUrl(storagePath: string) {
  const client = requireSupabase();
  const { data, error } = await client.storage
    .from('service-requests')
    .createSignedUrl(storagePath, 60 * 60);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}

export const serviceRequestsService = {
  async listVisible() {
    const client = requireSupabase();
    const { data, error } = await client
      .from('service_requests')
      .select('*, service_request_attachments(*), service_quotes(*)')
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message);

    return Promise.all(
      (data ?? []).map(async (request) => ({
        ...request,
        service_request_attachments: await Promise.all(
          ((request.service_request_attachments ?? []) as ServiceRequestAttachmentRow[]).map(
            async (attachment) => ({
              ...attachment,
              signed_url: await createSignedMediaUrl(attachment.storage_path),
            }),
          ),
        ),
      })),
    );
  },

  async create(input: CreateServiceRequestInput, city: ValeCity) {
    const client = requireSupabase();
    const { data: sessionData } = await client.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) throw new Error('Sessão expirada. Entre novamente.');

    const { data: request, error: requestError } = await client.rpc(
      'create_service_request',
      {
        p_category: input.category,
        p_title: input.title.trim(),
        p_description: input.description.trim(),
        p_city: city,
        p_urgency: input.urgency,
      },
    );
    if (requestError) throw new Error(requestError.message);

    const attachments = [];
    for (const [index, media] of input.media.entries()) {
      const response = await fetch(media.uri);
      const file = await response.arrayBuffer();
      const { extension, mimeType } = getSafeFileInfo(media);
      const storagePath = `${userId}/${request.id}/${Date.now()}-${index}.${extension}`;
      const { error: uploadError } = await client.storage
        .from('service-requests')
        .upload(storagePath, file, { contentType: mimeType, upsert: false });
      if (uploadError) throw new Error(uploadError.message);

      const { data: attachment, error: attachmentError } = await client
        .from('service_request_attachments')
        .insert({
          request_id: request.id,
          media_type: media.type,
          storage_path: storagePath,
          mime_type: mimeType,
          file_name: media.fileName ?? null,
          file_size_bytes: media.fileSize ?? null,
          duration_ms: media.durationMs ?? null,
        })
        .select()
        .single();
      if (attachmentError) throw new Error(attachmentError.message);

      attachments.push({
        ...attachment,
        signed_url: await createSignedMediaUrl(storagePath),
      });
    }

    return { ...request, service_request_attachments: attachments };
  },

  async submitQuote(input: CreateServiceQuoteInput) {
    const client = requireSupabase();
    const { data, error } = await client.rpc('submit_service_quote', {
      p_request_id: input.requestId,
      p_amount: input.amount,
      p_estimated_duration: input.estimatedDuration.trim(),
      p_message: input.message.trim(),
      p_includes_materials: input.includesMaterials,
      p_materials_description: input.materialsDescription?.trim() || null,
    });
    if (error) throw new Error(error.message);
    return data;
  },

  async selectQuote(requestId: string, quoteId: string) {
    const client = requireSupabase();
    const { data, error } = await client.rpc('select_service_quote', {
      p_request_id: requestId,
      p_quote_id: quoteId,
    });
    if (error) throw new Error(error.message);
    return data;
  },

  async cancel(requestId: string) {
    const client = requireSupabase();
    const { data, error } = await client.rpc('cancel_service_request', {
      p_request_id: requestId,
    });
    if (error) throw new Error(error.message);
    return data;
  },
};
