import { apiError, json } from '@/server/apiResponse';
import { getChargeAmount, getMercadoPagoPublicKey } from '@/server/mercadopagoService';

export function GET() {
  try {
    return json({
      publicKey: getMercadoPagoPublicKey(),
      checkoutAmounts: {
        profissional: getChargeAmount('profissional'),
        premium: getChargeAmount('premium'),
      },
    });
  } catch (error) {
    return apiError(error, 'assinaturas.config');
  }
}
