import { useMemo } from 'react';
import { Text, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

import type { CardTokenData } from '@/services/subscriptions';

type Props = {
  publicKey: string;
  amount: number;
  email: string;
  documentType: 'CPF' | 'CNPJ';
  documentNumber: string;
  onTokenized: (data: CardTokenData) => void;
  onError: (message: string) => void;
};

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export function MercadoPagoCardForm({
  publicKey,
  amount,
  email,
  documentType,
  documentNumber,
  onTokenized,
  onError,
}: Props) {
  const html = useMemo(() => {
    const safeKey = JSON.stringify(publicKey).replaceAll('<', '\\u003c');
    const safeAmount = amount.toFixed(2);
    return `<!doctype html>
<html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1" />
<style>*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif;color:#0f172a}label{font-size:12px;font-weight:700;color:#475569;display:block;margin:10px 0 5px}.input{height:44px;border:1px solid #cbd5e1;border-radius:12px;padding:0 12px;width:100%;font-size:15px}.row{display:flex;gap:9px}.row>div{flex:1}button{width:100%;height:48px;border:0;border-radius:14px;background:#1671f9;color:white;font-size:16px;font-weight:700;margin-top:16px}button:disabled{opacity:.55}.hint{font-size:11px;color:#64748b;margin:8px 0}</style>
<script src="https://sdk.mercadopago.com/js/v2"></script></head><body>
<form id="form-checkout">
<label>Número do cartão</label><div id="form-checkout__cardNumber" class="input"></div>
<div class="row"><div><label>Validade</label><div id="form-checkout__expirationDate" class="input"></div></div><div><label>CVV</label><div id="form-checkout__securityCode" class="input"></div></div></div>
<label>Nome impresso no cartão</label><input id="form-checkout__cardholderName" class="input" />
<label>E-mail</label><input id="form-checkout__cardholderEmail" class="input" type="email" value="${escapeHtml(email)}" />
<div class="row"><div><label>Documento</label><select id="form-checkout__identificationType" class="input"><option value="${documentType}">${documentType}</option></select></div><div><label>Número</label><input id="form-checkout__identificationNumber" class="input" value="${escapeHtml(documentNumber)}" /></div></div>
<select id="form-checkout__issuer" class="input" style="display:none"></select><select id="form-checkout__installments" class="input" style="display:none"></select>
<p class="hint">Os dados do cartão são enviados diretamente ao Mercado Pago e não ficam armazenados no ConectaServ.</p>
<button id="form-checkout__submit" type="submit">Pagar R$ ${safeAmount.replace('.', ',')}</button>
</form><script>
const send=(payload)=>window.ReactNativeWebView.postMessage(JSON.stringify(payload));
try { const mp=new MercadoPago(${safeKey},{locale:'pt-BR'}); const cardForm=mp.cardForm({amount:'${safeAmount}',iframe:true,form:{id:'form-checkout',cardNumber:{id:'form-checkout__cardNumber'},expirationDate:{id:'form-checkout__expirationDate'},securityCode:{id:'form-checkout__securityCode'},cardholderName:{id:'form-checkout__cardholderName'},cardholderEmail:{id:'form-checkout__cardholderEmail'},issuer:{id:'form-checkout__issuer'},installments:{id:'form-checkout__installments'},identificationType:{id:'form-checkout__identificationType'},identificationNumber:{id:'form-checkout__identificationNumber'},submit:{id:'form-checkout__submit'}},callbacks:{onFormMounted:(error)=>{if(error)send({type:'error',message:'Não foi possível carregar o formulário do cartão.'})},onSubmit:(event)=>{event.preventDefault();const data=cardForm.getCardFormData();send({type:'token',data:{token:data.token,paymentMethodId:data.paymentMethodId,issuerId:data.issuerId,installments:Number(data.installments||1)}})},onFetching:()=>{const button=document.getElementById('form-checkout__submit');button.disabled=true;return()=>button.disabled=false}}}); } catch(error){send({type:'error',message:'Falha ao inicializar o checkout seguro.'})}
</script></body></html>`;
  }, [amount, documentNumber, documentType, email, publicKey]);

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as
        | { type: 'token'; data: CardTokenData }
        | { type: 'error'; message: string };
      if (message.type === 'token') onTokenized(message.data);
      else onError(message.message);
    } catch {
      onError('Resposta inválida do formulário de cartão.');
    }
  };

  return (
    <View className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <WebView
        source={{ html }}
        originWhitelist={['https://*', 'http://*']}
        javaScriptEnabled
        domStorageEnabled
        onMessage={onMessage}
        style={{ height: 420, backgroundColor: '#FFFFFF' }}
      />
      <Text className="px-4 pb-3 text-center text-[10px] text-slate-400">
        Ambiente seguro Mercado Pago
      </Text>
    </View>
  );
}
