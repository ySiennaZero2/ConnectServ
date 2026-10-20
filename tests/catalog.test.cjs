const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { test } = require('node:test');
const ts = require('typescript');
const vm = require('node:vm');

const compiled = ts.transpileModule(readFileSync('src/utils/catalog.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const context = { exports: {} };
vm.runInNewContext(compiled, context);
const { snapshotItems, itemTotals, validateCatalogItem } = context.exports;
const catalog = [
  { id: 'p1', providerId: 'provider', kind: 'product', name: 'Cabo', description: '', costPrice: 10.15, salePrice: 20.25 },
  { id: 's1', providerId: 'provider', kind: 'service', name: 'Instalação', description: '', costPrice: 999, salePrice: 100 },
];

test('quantidade, custos apenas de produtos e lucro sobre valor final negociado', () => {
  const items = snapshotItems(catalog, [{ catalogItemId: 'p1', quantity: 3 }, { catalogItemId: 's1', quantity: 2 }]);
  const totals = itemTotals(items);
  assert.equal(totals.price, 260.75);
  assert.equal(totals.cost, 30.45);
  assert.equal(Number((250 - totals.cost).toFixed(2)), 219.55);
});
test('edição ou exclusão posterior do catálogo não altera os custos históricos', () => {
  const copy = catalog.map((item) => ({ ...item }));
  const items = snapshotItems(copy, [{ catalogItemId: 'p1', quantity: 2 }]);
  copy[0].costPrice = 500;
  copy.splice(0, 1);
  assert.equal(itemTotals(items).cost, 20.3);
  assert.equal(items[0].name, 'Cabo');
});
test('sem itens permite conclusão e custo zero', () => {
  assert.equal(itemTotals(snapshotItems(catalog, [])).cost, 0);
});
test('rejeita itens ausentes, duplicados e quantidades inválidas', () => {
  for (const quantity of [0, -1, 1.5, NaN, Infinity, 10000]) {
    assert.throws(() => snapshotItems(catalog, [{ catalogItemId: 'p1', quantity }]));
  }
  assert.throws(() => snapshotItems(catalog, [{ catalogItemId: 'outro', quantity: 1 }]));
  assert.throws(() => snapshotItems(catalog, [{ catalogItemId: 'p1', quantity: 1 }, { catalogItemId: 'p1', quantity: 2 }]));
});
test('validação rejeita preços inválidos e nomes vazios', () => {
  for (const salePrice of [-1, NaN, Infinity, 100000000]) {
    assert.throws(() => validateCatalogItem({ ...catalog[0], salePrice }));
  }
  assert.throws(() => validateCatalogItem({ ...catalog[0], name: ' ' }));
  assert.doesNotThrow(() => validateCatalogItem({ ...catalog[0], salePrice: 0, costPrice: 0 }));
});
