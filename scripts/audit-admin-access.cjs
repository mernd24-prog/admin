// Read-only source audit: does not load application config or connect to a DB.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const parser = require('@babel/parser');
const sourceRoot = path.resolve(__dirname, '../src');
const compiled = babel.transformSync(fs.readFileSync(path.join(sourceRoot, '_helpers/rbacRoutes.js'), 'utf8'), {
  plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')], configFile: false, babelrc: false,
}).code;
const context = { exports: {} }; vm.runInNewContext(compiled, context);
const { getRouteModuleCandidates, getRouteAction, isSelfServiceRoute } = context.exports;
function walk(node, callback) {
  if (!node || typeof node !== 'object') return;
  callback(node);
  for (const [key, value] of Object.entries(node)) {
    if (['loc', 'start', 'end'].includes(key)) continue;
    if (Array.isArray(value)) value.forEach(child => walk(child, callback));
    else if (value && typeof value === 'object') walk(value, callback);
  }
}
const routes = [];
walk(parser.parse(fs.readFileSync(path.join(sourceRoot, 'components/Layout/Layout.js'), 'utf8'), { sourceType: 'module', plugins: ['jsx'] }), node => {
  if (node.type !== 'ObjectExpression') return;
  const prop = key => node.properties.find(item => item.key?.name === key)?.value;
  if (prop('path')?.type !== 'StringLiteral') return;
  routes.push({ path: prop('path').value, permissionPath: prop('permissionPath')?.value, redirect: prop('redirectTo')?.value });
});
const sections = ['overview', 'influencers', 'codes', 'rules', 'product-amounts', 'bonuses', 'bonus-rules', 'bonus-progress', 'bonus-history', 'orders', 'commissions', 'payouts', 'hierarchy', 'fraud'];
const rows = [];
for (const route of routes) {
  const samples = route.path.includes(':section') ? sections.map(section => route.path.replace(':section', section))
    : route.path.includes(':id?') ? [route.path.replace('/:id?', ''), route.path.replace(':id?', 'fixture-id')]
    : [route.path.replace(/:[^/]+/g, 'fixture-id')];
  for (const sample of samples) {
    const modulePath = route.permissionPath || sample;
    const modules = isSelfServiceRoute(sample) ? ['self-service'] : getRouteModuleCandidates(modulePath, [], { sellerPanel: false });
    rows.push({ route: sample, modules, action: getRouteAction(sample), redirect: route.redirect });
  }
}
const missing = rows.filter(row => !row.redirect && !row.modules.length);
if (process.argv.includes('--markdown')) {
  console.log('# Admin route access inventory\n\nRead-only source inventory. Route mapping coverage is not proof of endpoint ABAC or every button permission.\n');
  console.log('| Route/sample | Capability | URL action | Redirect |');
  console.log('|---|---|---|---|');
  rows.forEach(row => console.log(`| ${row.route} | ${row.modules.join(', ') || '—'} | ${row.action} | ${row.redirect || '—'} |`));
} else {
  console.log(`${routes.length} registered route patterns; ${rows.length} concrete samples; ${missing.length} unmapped protected samples.`);
  missing.forEach(row => console.error('Unmapped:', row.route));
}
if (missing.length) process.exitCode = 1;
