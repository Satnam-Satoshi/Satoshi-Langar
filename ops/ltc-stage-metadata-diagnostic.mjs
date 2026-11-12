// Incident-specific GET-only observation. This never confirms or resumes an
// intent, extends a lease, uploads evidence, deploys, promotes or changes gates.
export const SCOPE = Object.freeze({
  project: 'prj_CtNT3hIs3Fn7QIoPWSHtASoBahrx',
  team: 'team_yc5ZBvCbWT2M7iGyj3vQDOzk',
  source: 'b413419180635b34a88b3015944cfaee7a08f742',
  implementation: 'e37016fd0bfebc482803ca9b71c91f99bba051bfffd3f0adb5b0c567dc48f9b1',
  candidate: 'dpl_4EsXwLjRaNFAZ4NFxufbtMob7BHo',
  previous: 'dpl_CtHzPPqDsHL9F9mwKnn64SuwijWB',
  expectedFence: 27,
});
export const EXPECTED_META = Object.freeze({
  ltcOperationId: 'stage-2026-11-11-r1-5c986c1983b7e3dfc25b90b1',
  ltcPayloadSha256: 'bc58fa7035385978ad83f66a5a860f73ea01c29ad7c891ba4f2cc8e16387473b',
  ltcSourceCommit: SCOPE.source,
  ltcBuildOutputSha256: '00f19190ebc0189bec233b463f44342fd5eb31739c7ae35877db1295572624f6',
});
const plain = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const check = (ok, code) => { if (!ok) throw Error(code); };
const domains = ['satnamsatoshi.com', 'ltcmagazine.org'];

export async function inspectStageMetadata({ token, fetcher = fetch }) {
  check(typeof token === 'string' && token.length > 10 && !/[\r\n]/.test(token), 'credential_unavailable');
  async function get(endpoint, phase) {
    // Callers below supply only fixed resource paths or a validated numeric
    // pagination timestamp. No caller-controlled URL, method or body exists.
    let response;
    try {
      response = await fetcher(`https://api.vercel.com${endpoint}${endpoint.includes('?') ? '&' : '?'}teamId=${SCOPE.team}`, {
        method: 'GET', redirect: 'error', signal: AbortSignal.timeout(10000),
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      });
    } catch { throw Error(`${phase}_transport_unavailable`); }
    check(response.status === 200 && !response.redirected && response.body, `${phase}_read_unavailable`);
    const reader = response.body.getReader(), chunks = []; let length = 0;
    try {
      while (true) {
        const part = await reader.read(); if (part.done) break;
        length += part.value.length; check(length <= 2_000_000, `${phase}_response_too_large`); chunks.push(part.value);
      }
    } finally { await reader.cancel().catch(() => {}); }
    let value; try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw Error(`${phase}_invalid_json`); }
    check(plain(value), `${phase}_invalid_shape`); return value;
  }
  function identity(d, expectedId) {
    return {
      idMatches: d.id === expectedId,
      projectMatches: d.projectId === SCOPE.project,
      ownerMatches: d.ownerId === SCOPE.team,
      teamMatches: d.team?.id === SCOPE.team,
      optionalTeamMatches: d.teamId === undefined || d.teamId === SCOPE.team,
      optionalSlugMatches: d.team?.slug === undefined || d.team.slug === 'baba-g-s-projects',
      ready: d.readyState === 'READY', productionTarget: d.target === 'production',
      validHostname: typeof d.url === 'string' && d.url.length <= 253 && /^[a-z0-9-]+\.vercel\.app$/.test(d.url),
    };
  }
  const candidate = await get(`/v13/deployments/${SCOPE.candidate}`, 'candidate');
  const previous = await get(`/v13/deployments/${SCOPE.previous}`, 'previous');
  const candidateIdentity = identity(candidate, SCOPE.candidate);
  const metadata = Object.fromEntries(Object.entries(EXPECTED_META).map(([key, expected]) => [key, {
    present: Object.hasOwn(candidate.meta ?? {}, key), matches: candidate.meta?.[key] === expected,
  }]));
  const aliasChecks = {};
  for (const domain of domains) aliasChecks[domain] = identity(await get(`/v13/deployments/${domain}`, 'alias'), SCOPE.previous);
  let until = '', pages = 0, listed = 0, complete = false, matches = 0, candidateMatches = 0;
  const seen = new Set();
  for (let page = 0; page < 10; page++) {
    const data = await get(`/v6/deployments?projectId=${SCOPE.project}&target=production&limit=100${until ? `&until=${until}` : ''}`, 'listing');
    check(Array.isArray(data.deployments) && data.deployments.length <= 100, 'listing_invalid_shape');
    pages++; listed += data.deployments.length;
    for (const item of data.deployments) if (item.meta?.ltcOperationId === EXPECTED_META.ltcOperationId) {
      matches++; if ((item.uid ?? item.id) === SCOPE.candidate) candidateMatches++;
    }
    const next = data.pagination?.next;
    if (next === null || next === undefined) { complete = true; break; }
    check((typeof next === 'number' && Number.isSafeInteger(next) || typeof next === 'string') && /^[1-9][0-9]{0,15}$/.test(String(next)) && !seen.has(String(next)), 'listing_invalid_pagination');
    seen.add(String(next)); until = String(next);
  }
  // Only fixed identifiers, booleans and bounded counts leave this process.
  // No response bodies, other metadata, headers, tokens or private config do.
  const result = {
    schemaVersion: 1, kind: 'fixed-stage-get-only-diagnostic', checkedAt: new Date().toISOString(),
    candidate: SCOPE.candidate, previous: SCOPE.previous, source: SCOPE.source,
    expectedFence: SCOPE.expectedFence, journalRead: false, stateChanged: false, effectsReissued: false,
    protectedBytesVerified: false, apiHandlersVerified: false, recoveryAuthorized: false,
    candidateIdentity, metadata, previousIdentity: identity(previous, SCOPE.previous),
    previousOperationMetaPresent: typeof previous.meta?.ltcOperationId === 'string', aliasChecks,
    discovery: { pages, listed, complete, operationMatches: matches, expectedCandidateMatches: candidateMatches },
  };
  result.metadataAndPointersMatch = Object.values(candidateIdentity).every(Boolean) &&
    Object.values(metadata).every(x => x.matches) && Object.values(result.previousIdentity).every(Boolean) &&
    Object.values(aliasChecks).every(x => Object.values(x).every(Boolean)) && complete && matches === 1 && candidateMatches === 1;
  return result;
}
