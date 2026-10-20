# ConectaServ

MVP mobile de intermediação de serviços locais. O projeto separa os fluxos de **cliente** e **prestador**, oferece pedidos de orçamento concorrentes, anexos, agendamento por calendário e avaliação mútua.

## O que já funciona

- entrada e cadastro separados por tipo de conta;
- validação de CPF para clientes e cadastro profissional dinâmico por CPF ou CNPJ;
- cadastro empresarial com Razão Social, Nome Fantasia e endereço físico protegido;
- edição autenticada dos dados fiscais do cliente e dos dados pessoais/jurídicos do prestador;
- modo demonstração sem backend, com dados persistidos no aparelho;
- busca e filtro de profissionais;
- mural da Comunidade com ordens de serviço públicas filtradas pelas cidades atendidas;
- propostas concorrentes e chat individual entre cliente e profissional;
- descrição detalhada com até 6 anexos de imagem ou vídeo;
- acompanhamento dos posts e das propostas recebidas pelo cliente;
- envio de propostas com valor, prazo, materiais, peças e observações;
- comparação de propostas e escolha do profissional pelo cliente;
- perfil público, portfólio e reputação do prestador;
- calendário mensal com seleção de data e horário;
- envio e acompanhamento de solicitações;
- dashboard do prestador com agenda aberta/fechada e acesso ao mural da Comunidade;
- aceite, recusa com justificativa obrigatória e conclusão do serviço;
- avaliação de 1 a 5 estrelas por cliente e prestador;
- formulário de edição do perfil profissional;
- disponibilidade semanal com dias e horário comercial configuráveis;
- bloqueio de datas e horários indisponíveis no agendamento do cliente;
- seleção das cidades atendidas no Vale do Ribeira e busca filtrada por município;
- conclusão com valor final e forma de pagamento obrigatórios;
- dashboard de ganhos, meios de pagamento e últimos recebimentos;
- edição de dados pessoais do cliente com WhatsApp e cidade principal;
- troca de senha e exclusão segura de contas de clientes e profissionais;
- modo férias para ocultar temporariamente profissionais das buscas;
- centrais de ajuda com FAQs específicas para clientes e prestadores;
- cadastro de até 3 classes de serviço por profissional;
- seleção e upload de fotos do portfólio;
- integração Supabase pronta para autenticação, banco, mídia privada e chat em tempo real;
- schema PostgreSQL com RLS e funções seguras.

## Stack

- Expo SDK 57 + React Native 0.86 + TypeScript 6
- Expo Router
- NativeWind / Tailwind CSS
- Lucide React Native
- Zustand + AsyncStorage
- Supabase Auth, PostgreSQL e Storage

## Executar no Antigravity IDE

Abra o terminal integrado na raiz desta pasta e execute:

```bash
npm install
npx expo start
```

Depois:

- escaneie o QR Code com o **Expo Go** para testar no celular;
- pressione `a` para abrir no Android Emulator;
- pressione `w` para abrir a versão web.

O projeto inicia em modo demonstração quando não encontra as variáveis do Supabase. Em qualquer uma das duas opções de acesso, toque em **Explorar como Cliente** ou **Explorar como Profissional**.

## Ativar o Supabase

1. Crie um projeto no [Supabase](https://supabase.com/).
2. Abra o SQL Editor e execute [`supabase/schema.sql`](supabase/schema.sql).
3. Copie `.env.example` para `.env`.
4. Preencha as chaves encontradas em **Project Settings → API**:

```env
EXPO_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sua-chave-publicavel
```

5. Reinicie o Expo limpando o cache:

```bash
npm run start:clear
```

O app detecta as variáveis automaticamente. A autenticação passa a usar contas reais. Os serviços de backend ficam em `src/services`.

> Nunca coloque a `service_role` no aplicativo. Use apenas a chave publicável/anon protegida pelas políticas RLS.

## Estrutura principal

```text
app/
├── (client)/                 # Rotas protegidas do cliente
│   ├── (tabs)/               # Início, agendamentos e conta
│   ├── professional/[id]/    # Perfil e calendário do prestador
│   ├── request-quote.tsx      # Novo pedido com fotos e vídeos
│   ├── request/[requestId]/  # Comparação e escolha das propostas
│   └── review/               # Avaliação feita pelo cliente
├── (provider)/               # Rotas protegidas do prestador
│   ├── (tabs)/               # Dashboard, perfil e conta
│   ├── request/[requestId]/  # Análise e envio do orçamento
│   └── review/               # Avaliação feita pelo prestador
├── auth.tsx                  # Login/cadastro por papel
└── welcome.tsx               # Escolha do tipo de conta

src/
├── components/
│   ├── booking/              # Calendário, cards, modal e avaliação
│   ├── common/               # Componentes reutilizáveis
│   ├── providers/            # Cartões de profissionais
│   └── requests/             # Pedidos, anexos e alertas
├── data/                     # Dados demonstrativos
├── lib/                      # Cliente Supabase
├── services/                 # Auth, pedidos, propostas, agenda, perfis e portfólio
├── store/                    # Estado global Zustand
├── types/                    # Modelos TypeScript
└── utils/                    # Datas e formatação

supabase/
└── schema.sql                # Banco, triggers, RPCs, RLS e Storage
```

## Validação

Após instalar as dependências:

```bash
npm run typecheck
npm run lint
```

## Próximas evoluções sugeridas

1. conectar os demais módulos do store às consultas reais do Supabase;
2. bloquear conflitos entre agendamentos simultâneos;
3. habilitar push notifications com Expo Notifications;
4. incluir geolocalização, mapa e ordenação por distância real;
5. adicionar testes unitários e E2E antes da publicação.

