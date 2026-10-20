// npm install --prefix .tmp/sql-validation --no-save --package-lock=false @electric-sql/pglite@0.5.8
// node --test tests/checkout-sql.test.cjs
const { PGlite } = require('../.tmp/sql-validation/node_modules/@electric-sql/pglite');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const id = (n) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`;

test('SQL: transação, histórico, RLS, validação, compatibilidade e reaplicação', async () => {
  const db = new PGlite();
  try {
    // Contrato mínimo das tabelas preexistentes, sem acesso a dados ou credenciais reais.
    await db.exec(`
      create role authenticated; create role anon; create schema auth;
      create function auth.uid() returns uuid language sql stable as
        $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      grant usage on schema auth, public to authenticated, anon;
      create type public.payment_method as enum ('pix','cash','credit_card','debit_card');
      create type public.appointment_status as enum ('pending','accepted','completed','cancelled','declined');
      create table public.provider_profiles(user_id uuid primary key);
      create table public.appointments(id uuid primary key, provider_id uuid references provider_profiles(user_id),
        client_id uuid, status appointment_status default 'accepted', final_amount numeric(10,2),
        payment_method payment_method, completed_at timestamptz, created_at timestamptz default now());
      alter table public.appointments enable row level security;
      grant select on public.appointments to authenticated;
      create policy participants on public.appointments for select to authenticated
        using (provider_id = auth.uid() or client_id = auth.uid());
      insert into public.provider_profiles values ('${id(1)}'), ('${id(2)}');
      insert into public.appointments(id,provider_id,client_id) values
        ('${id(10)}','${id(1)}','${id(3)}'), ('${id(11)}','${id(1)}','${id(3)}'),
        ('${id(12)}','${id(1)}','${id(3)}'), ('${id(13)}','${id(2)}','${id(3)}');
      insert into public.appointments(id,provider_id,client_id,status,final_amount,payment_method)
        values ('${id(14)}','${id(1)}','${id(3)}','completed',50,'pix');
    `);
    const script = readFileSync('supabase/product_service_checkout.sql', 'utf8');
    await db.exec(script);
    await db.exec(script);
    const actor = async (n) => db.exec(`reset role; set request.jwt.claim.sub = '${id(n)}'; set role authenticated;`);
    await actor(1);
    await db.exec(`insert into public.provider_catalog_items(id,provider_id,kind,name,cost_price,sale_price) values
      ('${id(20)}','${id(1)}','product','Cabo',10.15,20.25),
      ('${id(21)}','${id(1)}','service','Instalação',0,100);`);
    const complete = (appointment, items, amount = 250) => db.query(
      'select public.complete_appointment_with_items($1::uuid,$2::numeric,$3::public.payment_method,$4::jsonb)',
      [id(appointment), amount, 'pix', JSON.stringify(items)],
    );
    const picked = (n, quantity) => ({ catalog_item_id: id(n), quantity });
    await complete(10, [picked(20, 3), picked(21, 2)]);
    assert.equal((await db.query('select total_cost from appointment_finances where appointment_id=$1', [id(10)])).rows[0].total_cost, '30.45');
    const summary = (await db.query('select * from provider_financial_summary')).rows[0];
    assert.equal(summary.gross_revenue, '300.00');
    assert.equal(summary.net_profit, '269.55');
    assert.equal(Number(summary.receipts_without_cost), 1);
    await assert.rejects(() => complete(10, []), /já concluído/);
    for (const quantity of [0, -1, 1.5, 10000, 'NaN']) {
      await assert.rejects(() => complete(11, [picked(20, quantity)]));
    }
    for (const amount of [0, -1, 100000000, 'NaN', 1.001]) {
      await assert.rejects(() => complete(11, [], amount));
    }
    await assert.rejects(() => complete(11, [picked(20, 1), picked(20, 2)]), /repetido/);
    await assert.rejects(() => complete(11, [picked(20, 1), picked(99, 1)]), /indisponível/);
    assert.equal(Number((await db.query('select count(*) as n from appointment_items where appointment_id=$1', [id(11)])).rows[0].n), 0);
    assert.equal((await db.query('select status from appointments where id=$1', [id(11)])).rows[0].status, 'accepted');
    await db.exec(`update provider_catalog_items set cost_price=99, name='Novo nome', deleted_at=now() where id='${id(20)}';`);
    const snapshot = (await db.query('select name,unit_cost from appointment_items where catalog_item_id=$1', [id(20)])).rows[0];
    assert.equal(snapshot.name, 'Cabo'); assert.equal(snapshot.unit_cost, '10.15');
    await assert.rejects(() => complete(11, [picked(20, 1)]), /indisponível/);
    await complete(11, []);
    await db.query('select complete_appointment($1::uuid,100::numeric,\'cash\'::payment_method)', [id(12)]);
    assert.equal((await db.query('select total_cost from appointment_finances where appointment_id=$1', [id(12)])).rows[0].total_cost, '0.00');
    await actor(2);
    assert.equal((await db.query('select * from provider_catalog_items')).rows.length, 0);
    assert.equal((await db.query('select * from appointment_items')).rows.length, 0);
    assert.equal((await db.query('select * from appointment_finances')).rows.length, 0);
    assert.equal((await db.query('select * from provider_financial_summary')).rows.length, 0);
    await assert.rejects(() => complete(13, [picked(21, 1)]), /indisponível/);
    await assert.rejects(() => complete(10, []), /sem permissão/);
    await assert.rejects(() => db.exec(`insert into provider_catalog_items(provider_id,kind,name,cost_price,sale_price) values ('${id(1)}','product','Invasão',0,1)`), /row-level security/);
    await actor(3);
    assert.equal((await db.query('select * from appointment_finances')).rows.length, 0);
    assert.equal((await db.query('select * from appointment_items')).rows.length, 0);
    assert.equal((await db.query('select * from provider_financial_summary')).rows.length, 0);
    await assert.rejects(() => db.exec('update appointment_finances set total_cost=0'), /permission denied/);
    await db.exec('reset role; set role anon;');
    await assert.rejects(() => complete(13, []), /permission denied/);
    // O fluxo preexistente de exclusão da conta remove agendamentos antes do perfil.
    await db.exec(`reset role; delete from appointments where provider_id='${id(1)}';
      delete from provider_profiles where user_id='${id(1)}';`);
    assert.equal((await db.query('select * from provider_catalog_items')).rows.length, 0);
  } finally { await db.close(); }
});
