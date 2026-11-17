import { posix as path } from 'node:path';
import { createHash } from 'node:crypto';
const fail = message => { throw new Error(`Route freshness: ${message}`); };
const digest = text => createHash('sha256').update(text).digest('hex');
const safe = p => typeof p === 'string' && p.length > 0 && !p.startsWith('/') && !p.split('/').some(x => ['', '.', '..'].includes(x));
const freeze = value => { if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const unique = (rows, key, label) => { const map = new Map(); for (const row of rows) { const id = key(row); if (!id || map.has(id)) fail(`duplicate/invalid ${label}`); map.set(id, row); } return map; };
const extensions = ['', '.tsx', '.ts', '.jsx', '.js', '.mjs', '.json', '/index.tsx', '/index.ts', '/index.js', '/index.mjs'];
const datePattern = /\b(?:20\d{2}-\d{2}-\d{2}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,?\s+20\d{2})?)\b|\bnov16-field-notes\b/g;
/** Pure, conservative lexical planning. Inputs come from a trusted snapshot adapter, never executed. */
export function planRouteFreshness({ files, registry, expectedRegistryDigest, sourceCommit, observedAt, admittedPaths = [], bindings = [] }) {
 if (!Array.isArray(files) || !Array.isArray(admittedPaths) || !Array.isArray(bindings)) fail('arrays required');
 if (!/^[a-f0-9]{40}$/.test(sourceCommit ?? '')) fail('commit pin required');
 if (typeof observedAt !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(observedAt) || !Number.isFinite(Date.parse(observedAt)) || new Date(observedAt).toISOString() !== observedAt) fail('snapshot date');
 if (!registry || registry.schemaVersion !== 1 || registry.generation !== 'cloud-newsroom-v2' || !Array.isArray(registry.sources) || !registry.sources.length) fail('registry schema');
 if (digest(JSON.stringify(registry)) !== expectedRegistryDigest) fail('registry pin mismatch');
 const sourceMap = unique(registry.sources, x => x.id, 'source ID');
 for (const s of sourceMap.values()) if (typeof s.id !== 'string' || typeof s.desk !== 'string' || !s.desk || typeof s.url !== 'string' || !s.url.startsWith('https://')) fail('source metadata');
 const fileMap = unique(files, x => x.path, 'file path');
 for (const f of files) if (!safe(f.path) || typeof f.text !== 'string') fail('file input');
 const admitted = new Set(admittedPaths); if (admitted.size !== admittedPaths.length || admittedPaths.some(p => !safe(p))) fail('admitted paths');
 const pagePaths = [...fileMap.keys()].filter(p => /^app\/.*\bpage\.(?:tsx|jsx|ts|js)$/.test(p)).sort();
 const routeFor = p => { const parts = p.replace(/^app\//, '').replace(/page\.(tsx|jsx|ts|js)$/, '').split('/').filter(s => s && !/^\(.*\)$/.test(s)); return '/' + parts.join('/') + (parts.length ? '/' : ''); };
 const routeMap = unique(pagePaths.map(p => ({path:p, route:routeFor(p)})), x => x.route, 'route');
 const bindingMap = unique(bindings, b => b.route, 'route binding');
 for (const b of bindings) {
  if (!routeMap.has(b.route) || !['historical', 'maintained', 'mixed', 'unknown'].includes(b.intent) || !Array.isArray(b.data) || typeof b.rationale !== 'string' || !b.rationale.trim()) fail('binding declaration');
  unique(b.data, d => d.path, 'data binding');
  for (const d of b.data) if (!fileMap.has(d.path) || !Array.isArray(d.sourceIds) || !d.sourceIds.length || new Set(d.sourceIds).size !== d.sourceIds.length || d.sourceIds.some(id => !sourceMap.has(id))) fail('source/data binding');
 }
 const graph = new Map();
 function scan(p) {
  if (graph.has(p)) return graph.get(p);
  const text = fileMap.get(p).text, dependencies = [], unresolved = [], external = [];
  // Deliberately lexical: may include comments; computed imports/IO are reported as gaps, not executed.
  const re = /(?:\b(?:import|export)\s+(?:[^;'"\n]*?\s+from\s*)?|\b(?:import|require)\s*\(\s*)['"]([^'"\n]+)['"]/g;
  for (const m of (/\.(?:tsx?|jsx?|mjs)$/.test(p) ? text.matchAll(re) : [])) {
   const spec = m[1]; if (!spec.startsWith('.') && !spec.startsWith('@/')) { external.push(spec); continue; }
   const base = spec.startsWith('@/') ? spec.slice(2) : path.normalize(path.join(path.dirname(p), spec));
   const resolved = extensions.map(e => base + e).find(x => fileMap.has(x));
   if (resolved) dependencies.push(resolved); else unresolved.push(spec);
  }
  const node = {dependencies:[...new Set(dependencies)], unresolved:[...new Set(unresolved)], external:[...new Set(external)], runtimeDataHints:/\b(?:fetch|readFile|readFileSync|glob)\s*\(|\bimport\s*\(\s*[^'"\s]/.test(text)};
  graph.set(p,node); return node;
 }
 const dateCache = new Map();
 function dates(p) { if (dateCache.has(p)) return dateCache.get(p); const result = []; const lines = fileMap.get(p).text.split('\n'); lines.forEach((line,i) => { for (const m of line.matchAll(datePattern)) result.push({path:p,line:i+1,literal:m[0],review:'candidate-only-not-an-event-date'}); }); dateCache.set(p,result); return result; }
 const routes = [...routeMap.values()].map(entry => {
  const seen = new Set(), visit = p => { if (seen.has(p)) return; seen.add(p); scan(p).dependencies.forEach(visit); }; visit(entry.path); const pageOnly = new Set(seen);
  // Include shared root/ancestor layouts; their dependencies can affect every rendered route.
  for (let dir = path.dirname(entry.path); dir === 'app' || dir.startsWith('app/'); dir = path.dirname(dir)) for (const ext of ['tsx','ts','jsx','js']) { const p = `${dir}/layout.${ext}`; if (fileMap.has(p)) visit(p); }
  const reachable = [...seen].sort(), binding = bindingMap.get(entry.route);
  if (binding?.data.some(d => !seen.has(d.path))) fail('binding data not reachable');
  const datedLiterals = reachable.flatMap(dates).map(d => ({...d, scope:pageOnly.has(d.path)?'page-dependency':'shared-layout-only'}));
  const dataFiles = reachable.filter(p => /^(?:content|config|app\/data|data)\//.test(p));
  const admittedDependencies = reachable.filter(p => admitted.has(p));
  const unresolvedImports = reachable.flatMap(p => scan(p).unresolved.map(specifier => ({path:p,specifier})));
  const runtimeDataHints = reachable.filter(p => scan(p).runtimeDataHints);
  const literalUrlCandidates = [...sourceMap.values()].filter(s => reachable.some(p => fileMap.get(p).text.includes(s.url))).map(s => s.id);
  const declaredSourceIds = [...new Set(binding?.data.flatMap(d=>d.sourceIds) ?? [])];
  return {...entry, intent:binding?.intent ?? 'unknown', rationale:binding?.rationale ?? 'No reviewed route intent declaration', template:entry.route.includes('['), dataFiles, declaredBindings:binding?.data ?? [], declaredSourceIds, literalUrlCandidates,
   reachableFiles:reachable, pageOnlyDataFiles:dataFiles.filter(p=>pageOnly.has(p)), sharedLayoutOnlyDataFiles:dataFiles.filter(p=>!pageOnly.has(p)), pageOnlyAdmittedDependencies:admittedDependencies.filter(p=>pageOnly.has(p)), sharedLayoutOnlyAdmittedDependencies:admittedDependencies.filter(p=>!pageOnly.has(p)), admittedDependencies, outsideAdmissionData:dataFiles.filter(p=>!admitted.has(p)), datedLiterals, unresolvedImports, runtimeDataHints,
   mechanism:admittedDependencies.length ? 'admitted-input-reachable-not-refresh-proof' : 'no-admitted-input-reachable',
   verifiedRefreshed:false, publishAllowed:false,
   gaps:[...(!binding?['route-intent-and-source-binding-review-required']:[]), ...(binding && !declaredSourceIds.length?['no-declared-source-bindings']:[]), ...(entry.route.includes('[')?['dynamic-route-instances-not-enumerated']:[]), ...(unresolvedImports.length?['unresolved-local-imports']:[]), ...(runtimeDataHints.length?['runtime-data-access-needs-review']:[]), ...(datedLiterals.length?['dated-literals-need-context-review']:[]), 'no-rendered-publication-evidence'],
   nextAction:binding?.intent === 'historical' ? 'preserve-historical-dates; review-new-issue-links-separately' : 'review-data-bindings-and-source-evidence-before-any-update'};
 });
 return freeze({schemaVersion:1,mode:'nonpublishing-route-freshness-plan',sourceCommit,observedAt,registryDigest:expectedRegistryDigest,snapshotDigest:digest(JSON.stringify(files.slice().sort((a,b)=>a.path.localeCompare(b.path)))),operational:false,publishAllowed:false,effects:[],
  limitations:['Lexical import and date candidates are not a TS parser or complete runtime dependency graph.','Templates are not generated route instances. Dates in shared layout or historical content are not automatically stale.','Admission reachability does not prove refreshed content, deployment, source verification or publication.','No source-current or rendered-refresh claims are made; a verified publication adapter is still required.'],
  routes,sources:[...sourceMap.values()].map(s=>({id:s.id,desk:s.desk,declaredRoutes:routes.filter(r=>r.declaredSourceIds.includes(s.id)).map(r=>r.route),candidateRoutes:routes.filter(r=>r.literalUrlCandidates.includes(s.id)).map(r=>r.route),freshness:'not-assessed'}))});
}
