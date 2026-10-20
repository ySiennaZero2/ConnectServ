import { requireSupabase } from '@/lib/supabase';

export const portfolioService = {
  async addFromArrayBuffer(file: ArrayBuffer, extension: string, caption?: string) {
    const client = requireSupabase();
    const { data: sessionData } = await client.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) throw new Error('Sessão expirada. Entre novamente.');

    const requestedExtension = extension.toLowerCase().replace(/[^a-z0-9]/g, '');
    const safeExtension = ['jpg', 'jpeg', 'png', 'webp'].includes(requestedExtension)
      ? requestedExtension
      : 'jpg';
    const contentType =
      safeExtension === 'png'
        ? 'image/png'
        : safeExtension === 'webp'
          ? 'image/webp'
          : 'image/jpeg';
    const fileName = `${userId}/${Date.now()}.${safeExtension}`;
    const { error: uploadError } = await client.storage
      .from('portfolio')
      .upload(fileName, file, { upsert: false, contentType });
    if (uploadError) throw new Error(uploadError.message);

    const { data: publicUrlData } = client.storage.from('portfolio').getPublicUrl(fileName);
    const { data, error } = await client
      .from('portfolio_items')
      .insert({
        provider_id: userId,
        image_url: publicUrlData.publicUrl,
        storage_path: fileName,
        caption: caption?.trim() || null,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  },
};
