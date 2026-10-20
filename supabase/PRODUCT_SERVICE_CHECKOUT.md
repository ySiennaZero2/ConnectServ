# Produtos, serviços e conclusão financeira

## Aplicação

- Base existente: executar **`product_service_checkout.sql`** inteiro no SQL Editor do projeto Supabase, antes de disponibilizar o aplicativo atualizado.
- Base nova: executar `schema.sql` e, depois, `product_service_checkout.sql`.
- O script incremental é transacional e reaplicável. Não reexecutar apenas `schema.sql` depois dele: o schema base contém a versão anterior de `complete_appointment`.
- Nenhum script adicional de migração é necessário. A aplicação no Supabase de produção não foi executada por esta implementação.
- O schema `private` deve permanecer fora da lista de schemas expostos pela Data API.

## Objetos criados

| Objeto | Finalidade |
| --- | --- |
| `provider_catalog_items` | Catálogo privado do prestador, com tipo, descrição, custo e cobrança. Exclusão lógica por `deleted_at`. |
| `appointment_items` | Quantidades e cópias dos nomes, descrições e preços vigentes na conclusão. Relação com catálogo e `appointments`. |
| `appointment_finances` | Custo total, com relação 1:1 ao agendamento. Valor final e pagamento continuam em `appointments`. |
| `provider_financial_summary` | Faturamento, custos conhecidos, lucro e contagem de recebimentos sem custo informado; respeita RLS. |
| `complete_appointment_with_items` | RPC que recebe IDs e quantidades. A função privada valida o prestador, bloqueia o agendamento e grava toda a conclusão em uma transação. |
| `complete_appointment` | Compatibilidade com o contrato antigo, delegando à mesma transação sem itens. |

O SQL inclui chaves estrangeiras, índices, permissões e políticas RLS. Clientes não têm acesso aos custos internos ou ao catálogo do prestador. Escritas diretas nos itens e nas finanças não são permitidas ao aplicativo.

## Comportamento

- Acesso: **Meu perfil → Gerenciar produtos e serviços**, rota `/(provider)/products`.
- Na conclusão, o total sugerido acompanha os itens até o usuário editar o valor final. O botão “Usar total dos itens como valor final” restaura o cálculo automático.
- Quantidades inteiras de 1 a 9999; no máximo 200 itens distintos por atendimento. Remover um item não apaga seu cadastro.
- O servidor lê preços do catálogo na hora da conclusão. Alterações posteriores não modificam os registros históricos.
- O valor final é o recebimento informado pelo prestador; nenhum pagamento é processado por este fluxo.
- Custos de serviços cadastrados são zero; somente produtos entram no custo de insumos.
- Registros antigos recebem custo `NULL` (não informado). O painel sinaliza que o lucro desses registros considera somente custos conhecidos. Não há estimativa retroativa de custos.
- Sem Supabase configurado, catálogo e conclusões persistem no armazenamento local do modo de demonstração. Com Supabase configurado, catálogo, atendimentos e financeiro são consultados do banco autenticado, sem fallback silencioso para dados de demonstração.

## Validação

```sh
npm run typecheck
npm run lint
node --test tests/catalog.test.cjs
npm install --prefix .tmp/sql-validation --no-save --package-lock=false @electric-sql/pglite@0.5.8
node --test tests/checkout-sql.test.cjs
npx expo export --platform web --output-dir .tmp/web-check
```

Os testes SQL usam Postgres em memória (PGlite) com o contrato mínimo das tabelas preexistentes. Cobrem reaplicação, cálculo, rollback, quantidades/valores inválidos, duplicidade, exclusão lógica, preservação dos preços, compatibilidade da RPC antiga e acesso por prestador, outro prestador, cliente e anônimo. Não substituem uma validação final contra as políticas adicionais eventualmente existentes no projeto de produção.

Após aplicar o script, conectado como prestador, é possível consultar:

```sql
select * from public.provider_financial_summary;
select * from public.appointment_finances order by recorded_at desc;
```

No SQL Editor, `auth.uid()` normalmente é nulo; a consulta do resumo exige uma sessão autenticada (ou a simulação explícita do usuário de teste).
