import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createGoogleStateRuntime } from './cloud-ltc-google-runtime.mjs';
import { DurableCloudState } from './cloud-ltc-state.mjs';
import { validateFlagshipRecord } from './lib/ltc-flagship-record.mjs';
const check = (value, code) => { if (!value) throw Error(code); };
const hash = value => createHash('sha256').update(value).digest('hex');
const plain = value => value && Object.getPrototypeOf(value) === Object.prototype;
const hex = value => /^[a-f0-9]{24}$/.test(value ?? '');
const digest = value => /^[a-f0-9]{64}$/.test(value ?? '');
export const BUFFER_TARGET = Object.freeze({ endpoint: 'https://mcp.buffer.com/mcp', organization: '6ac43ae95e79770297e9d2be', channels: Object.freeze({ x: '6ac43ee86a5c39ccb6286633', instagram: '6ac45c816a5c39ccb6296dc8' }), maximum: Object.freeze({ x: 4, instagram: 2, invitations: 1, updates: 2 }) });
const methods = new Set(['get_account', 'list_channels', 'list_posts', 'get_post', 'create_post', 'edit_post']);
const writes = new Set(['create_post', 'edit_post']);
export function assertCloudSocialAcceptance() { throw Error('cloud_social_acceptance_pending'); }
export const dateInNewYork = value => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(value));
function instant(value) { return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)); }
function safeURL(value, magazine = false) { try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password && (!magazine || url.hostname === 'ltcmagazine.org') && !url.search.includes('token='); } catch { return false; } }

// Conservative discovered JSON Schema subset. Unsupported validation constraints
// stop the call; tool names/descriptions are data, never instructions to execute.
export function validateBufferArguments(schema, value) {
  const root = schema;
  const allowed = new Set(['$schema', '$id', '$defs', 'definitions', '$ref', 'title', 'description', 'default', 'examples', 'deprecated', 'readOnly', 'writeOnly', 'type', 'properties', 'required', 'additionalProperties', 'items', 'minItems', 'maxItems', 'uniqueItems', 'minProperties', 'maxProperties', 'minLength', 'maxLength', 'pattern', 'format', 'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'enum', 'const', 'anyOf', 'oneOf', 'allOf']);
  function validate(rule, item, depth = 0) {
    check(depth <= 24 && (plain(rule) || typeof rule === 'boolean'), 'buffer_schema_unsupported');
    if (typeof rule === 'boolean') { check(rule, 'buffer_arguments_invalid'); return; }
    check(Object.keys(rule).every(key => allowed.has(key)), 'buffer_schema_unsupported');
    if (rule.$ref) { check(typeof rule.$ref === 'string' && rule.$ref.startsWith('#/'), 'buffer_schema_unsupported'); let target = root; for (const segment of rule.$ref.slice(2).split('/').map(part => part.replaceAll('~1', '/').replaceAll('~0', '~'))) { check(target && Object.hasOwn(target, segment), 'buffer_schema_unsupported'); target = target[segment]; } validate(target, item, depth + 1); }
    for (const kind of ['anyOf', 'oneOf']) if (rule[kind]) { check(Array.isArray(rule[kind]) && rule[kind].length <= 20, 'buffer_schema_unsupported'); let count = 0; for (const alternative of rule[kind]) { try { validate(alternative, item, depth + 1); count++; } catch (error) { if (error.message === 'buffer_schema_unsupported') throw error; } } check(kind === 'oneOf' ? count === 1 : count > 0, 'buffer_arguments_invalid'); }
    if (rule.allOf) for (const alternative of rule.allOf) validate(alternative, item, depth + 1);
    if (Object.hasOwn(rule, 'const')) check(JSON.stringify(item) === JSON.stringify(rule.const), 'buffer_arguments_invalid');
    if (rule.enum) check(rule.enum.some(entry => JSON.stringify(entry) === JSON.stringify(item)), 'buffer_arguments_invalid');
    if (rule.type) { const types = Array.isArray(rule.type) ? rule.type : [rule.type]; check(types.every(type => ['object', 'array', 'string', 'number', 'integer', 'boolean', 'null'].includes(type)), 'buffer_schema_unsupported'); check(types.some(type => type === 'null' ? item === null : type === 'object' ? plain(item) : type === 'array' ? Array.isArray(item) : type === 'integer' ? Number.isInteger(item) : type === 'number' ? typeof item === 'number' && Number.isFinite(item) : typeof item === type), 'buffer_arguments_invalid'); }
    if (plain(item)) { check(Object.keys(item).length <= 100, 'buffer_arguments_invalid'); for (const key of rule.required ?? []) check(Object.hasOwn(item, key), 'buffer_arguments_invalid'); for (const [key, child] of Object.entries(item)) { if (rule.properties?.[key]) validate(rule.properties[key], child, depth + 1); else if (rule.additionalProperties === false) throw Error('buffer_arguments_invalid'); else if (plain(rule.additionalProperties)) validate(rule.additionalProperties, child, depth + 1); } if (rule.minProperties !== undefined) check(Object.keys(item).length >= rule.minProperties, 'buffer_arguments_invalid'); if (rule.maxProperties !== undefined) check(Object.keys(item).length <= rule.maxProperties, 'buffer_arguments_invalid'); }
    if (Array.isArray(item)) { if (rule.minItems !== undefined) check(item.length >= rule.minItems, 'buffer_arguments_invalid'); check(item.length <= (rule.maxItems ?? 1000), 'buffer_arguments_invalid'); if (rule.uniqueItems) check(new Set(item.map(entry => JSON.stringify(entry))).size === item.length, 'buffer_arguments_invalid'); if (rule.items) for (const entry of item) validate(rule.items, entry, depth + 1); }
    if (typeof item === 'string') { check(item.length >= (rule.minLength ?? 0) && item.length <= (rule.maxLength ?? 16_000), 'buffer_arguments_invalid'); if (rule.pattern) { check(rule.pattern.length < 500, 'buffer_schema_unsupported'); check(new RegExp(rule.pattern, 'u').test(item), 'buffer_arguments_invalid'); } if (rule.format) { check(['date-time', 'uri', 'url'].includes(rule.format), 'buffer_schema_unsupported'); check(rule.format === 'date-time' ? instant(item) : safeURL(item), 'buffer_arguments_invalid'); } }
    if (typeof item === 'number') { if (rule.minimum !== undefined) check(item >= rule.minimum, 'buffer_arguments_invalid'); if (rule.maximum !== undefined) check(item <= rule.maximum, 'buffer_arguments_invalid'); if (rule.exclusiveMinimum !== undefined) check(item > rule.exclusiveMinimum, 'buffer_arguments_invalid'); if (rule.exclusiveMaximum !== undefined) check(item < rule.exclusiveMaximum, 'buffer_arguments_invalid'); }
  }
  check(Buffer.byteLength(JSON.stringify(value)) <= 64_000, 'buffer_arguments_invalid'); validate(schema, value); return true;
}

async function rpcBody(response, id, notification) {
  if (notification) { check(response.status === 202, 'buffer_protocol_invalid'); return null; }
  const reader = response.body?.getReader(); check(reader, 'buffer_protocol_invalid');
  const contentType = response.headers.get('content-type')?.split(';')[0].trim(); check(['application/json', 'text/event-stream'].includes(contentType), 'buffer_protocol_invalid');
  const decoder = new TextDecoder('utf-8', { fatal: true }); let text = ''; let length = 0;
  function result(message) { check(plain(message) && message.jsonrpc === '2.0', 'buffer_protocol_invalid'); if (message.method && message.id === undefined) { check(message.method !== 'notifications/tools/list_changed', 'buffer_schema_changed'); return null; } check(message.id === id && !message.method, 'buffer_protocol_invalid'); check(!message.error && Object.hasOwn(message, 'result'), 'buffer_rpc_failed'); return { matched: true, value: message.result }; }
  try {
    while (true) {
      const part = await reader.read(); if (part.done) break; length += part.value.byteLength; check(length <= 2_000_000, 'buffer_response_too_large'); text += decoder.decode(part.value, { stream: true });
      if (contentType === 'text/event-stream') { text = text.replaceAll('\r\n', '\n'); let end; while ((end = text.indexOf('\n\n')) !== -1) { const event = text.slice(0, end); text = text.slice(end + 2); const data = event.split('\n').filter(line => line.startsWith('data:')).map(line => line.slice(5).replace(/^ /, '')).join('\n'); if (!data) continue; const response = result(JSON.parse(data)); if (response) return response.value; } }
    }
    text += decoder.decode(); check(contentType === 'application/json', 'buffer_stream_incomplete'); return result(JSON.parse(text)).value;
  } finally { await reader.cancel().catch(() => {}); }
}
export function createBufferMcpClient({ env = process.env, fetchImpl = fetch, allowWrites = false, acceptedSchemaHashes = null, knownPostIds = [], now = () => new Date().toISOString() } = {}) {
  const key = env.LTC_BUFFER_API_KEY; check(typeof key === 'string' && key.length >= 16 && key.length <= 8192 && !/[\s\x00-\x1f\x7f]/.test(key), 'buffer_cloud_key_required');
  let session = null; let protocol = null; let initialized = false; let counter = 0; let busy = false; const schemas = new Map(); const known = new Set(knownPostIds);
  async function request(method, params, notification = false, write = false) {
    check(!busy, 'buffer_concurrent_transport_request'); busy = true; const id = notification ? undefined : ++counter;
    try {
      let response;
      try { response = await fetchImpl(BUFFER_TARGET.endpoint, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(30_000), headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...(session ? { 'Mcp-Session-Id': session } : {}), ...(protocol ? { 'MCP-Protocol-Version': protocol } : {}) }, body: JSON.stringify({ jsonrpc: '2.0', ...(id === undefined ? {} : { id }), method, ...(params === undefined ? {} : { params }) }) }); } catch { throw Error(write ? 'buffer_write_uncertain' : 'buffer_transport_unavailable'); }
      check(!response.redirected, write ? 'buffer_write_uncertain' : 'buffer_transport_unavailable');
      if (response.status === 429) { const error = Error('buffer_rate_limited'); const seconds = Number(response.headers.get('retry-after')); error.retryAfterSeconds = Number.isFinite(seconds) && seconds >= 0 && seconds <= 86400 ? seconds : null; throw error; }
      if (response.status === 404 && session) { initialized = false; session = null; schemas.clear(); throw Error(write ? 'buffer_write_uncertain' : 'buffer_session_lost'); }
      check(response.status === (notification ? 202 : 200), write ? 'buffer_write_uncertain' : 'buffer_transport_unavailable');
      const assigned = response.headers.get('mcp-session-id'); if (assigned) { check(/^[\x21-\x7e]{1,2048}$/.test(assigned) && (!session || session === assigned), 'buffer_protocol_invalid'); session = assigned; }
      try { const result = await rpcBody(response, id, notification); check(!JSON.stringify(result)?.includes(key), 'buffer_protocol_invalid'); return result; } catch (error) { throw Error(write ? 'buffer_write_uncertain' : ['buffer_response_too_large', 'buffer_stream_incomplete'].includes(error.message) ? error.message : 'buffer_protocol_invalid'); }
    } finally { busy = false; }
  }
  const api = {
    async discover() {
      check(!initialized, 'buffer_session_already_initialized');
      const result = await request('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'ltc-bounded-social', version: '1.0.0' } });
      check(['2025-06-18', '2025-03-26'].includes(result?.protocolVersion) && plain(result.capabilities?.tools), 'buffer_protocol_invalid'); protocol = result.protocolVersion;
      await request('notifications/initialized', undefined, true); initialized = true;
      let cursor; const cursors = new Set();
      for (let page = 0; page < 10; page++) { const listed = await request('tools/list', cursor ? { cursor } : {}); check(Array.isArray(listed?.tools) && listed.tools.length <= 200, 'buffer_discovery_invalid'); for (const tool of listed.tools) if (methods.has(tool.name)) { check(!schemas.has(tool.name) && plain(tool.inputSchema), 'buffer_discovery_invalid'); schemas.set(tool.name, structuredClone(tool)); } if (!listed.nextCursor) { cursor = null; break; } check(typeof listed.nextCursor === 'string' && !cursors.has(listed.nextCursor), 'buffer_discovery_invalid'); cursors.add(listed.nextCursor); cursor = listed.nextCursor; }
      check(!cursor && [...methods].every(method => schemas.has(method)), 'buffer_discovery_incomplete');
      return Object.fromEntries([...schemas].map(([name, tool]) => [name, hash(JSON.stringify(tool.inputSchema))]));
    },
    outputSchema(name) { check(methods.has(name) && schemas.has(name), 'buffer_tool_not_discovered'); return structuredClone(schemas.get(name).outputSchema ?? null); },
    schema(name) { check(methods.has(name) && schemas.has(name), 'buffer_tool_not_discovered'); return structuredClone(schemas.get(name).inputSchema); },
    rememberPostId(postId) { check(hex(postId), 'invalid_buffer_post_id'); known.add(postId); },
    async callTool(name, args) {
      check(initialized && methods.has(name) && schemas.has(name), 'buffer_tool_not_discovered');
      const tool = schemas.get(name); validateBufferArguments(tool.inputSchema, args);
      if (['list_channels', 'list_posts'].includes(name)) check(args.organizationId === BUFFER_TARGET.organization, 'wrong_buffer_organization');
      if (name === 'list_posts') check(Array.isArray(args.channelIds) && args.channelIds.length > 0 && args.channelIds.length <= 2 && new Set(args.channelIds).size === args.channelIds.length && args.channelIds.every(channel => Object.values(BUFFER_TARGET.channels).includes(channel)), 'wrong_buffer_channel');
      if (name === 'create_post') check(Object.values(BUFFER_TARGET.channels).includes(args.channelId), 'wrong_buffer_channel');
      if (['get_post', 'edit_post'].includes(name)) check(hex(args.postId) && known.has(args.postId), 'unknown_buffer_post_id');
      if (writes.has(name)) { check(allowWrites, 'buffer_cloud_writes_disabled'); const fields = name === 'create_post' ? ['channelId', 'schedulingType', 'text', 'assets', 'saveToDraft', 'metadata'] : ['postId', 'schedulingType', 'mode', 'dueAt', 'saveToDraft']; check(Object.keys(args).every(field => fields.includes(field)) && args.schedulingType === 'automatic' && (args.saveToDraft === true ? args.mode === undefined && args.dueAt === undefined : args.mode === 'customScheduled'), 'buffer_write_outside_bounded_scope'); check(acceptedSchemaHashes?.[name] === hash(JSON.stringify(tool.inputSchema)), 'buffer_schema_acceptance_required'); check(args.saveToDraft === true || (args.mode === 'customScheduled' && instant(args.dueAt) && Date.parse(args.dueAt) > Date.parse(now())), 'buffer_schedule_not_bounded'); check(!args.metadata || (Object.keys(args.metadata).every(key => key === 'instagram') && plain(args.metadata.instagram) && Object.keys(args.metadata.instagram).every(key => ['type', 'shouldShareToFeed', 'isAIGenerated', 'isAiGenerated'].includes(key))), 'buffer_metadata_outside_scope'); }
      const result = await request('tools/call', { name, arguments: args }, false, writes.has(name));
      check(result && result.isError !== true, writes.has(name) ? 'buffer_write_uncertain' : 'buffer_tool_failed');
      if (tool.outputSchema && result.structuredContent) validateBufferArguments(tool.outputSchema, result.structuredContent);
      return result;
    },
  };
  return Object.freeze(api);
}
export function bufferToolData(result) {
  if (plain(result?.structuredContent)) return result.structuredContent;
  check(Array.isArray(result?.content), 'buffer_response_shape_unverified'); const text = result.content.filter(block => block.type === 'text'); check(text.length === 1, 'buffer_response_shape_unverified'); let value; try { value = JSON.parse(text[0].text); } catch { throw Error('buffer_response_shape_unverified'); } check(plain(value), 'buffer_response_shape_unverified'); return value;
}
function recordsOf(value) { if (Array.isArray(value)) return value; if (Array.isArray(value?.nodes)) return value.nodes; if (Array.isArray(value?.edges)) return value.edges.map(edge => edge.node); throw Error('buffer_response_shape_unverified'); }
export function verifyBufferIdentity(accountResult, channelsResult) {
  const raw = bufferToolData(accountResult); const account = raw.account ?? raw; const organizations = recordsOf(account.organizations);
  check(typeof account.timezone === 'string' && organizations.some(organization => organization.id === BUFFER_TARGET.organization), 'wrong_buffer_account');
  const value = bufferToolData(channelsResult); const channels = recordsOf(value.channels ?? value.data?.channels);
  for (const [platform, expected] of Object.entries(BUFFER_TARGET.channels)) { const channel = channels.find(item => item.id === expected); check(channel && channel.service === (platform === 'x' ? 'twitter' : 'instagram') && (channel.isDisconnected === false || channel.connectionStatus === 'connected'), 'wrong_buffer_channel'); }
  return { organizationId: BUFFER_TARGET.organization, channels: structuredClone(BUFFER_TARGET.channels), timezone: account.timezone };
}
export function localSlot(date, clock) {
  check(/^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(clock), 'invalid_campaign_slot');
  const desired = Date.parse(`${date}T${clock}:00Z`); check(Number.isFinite(desired), 'invalid_campaign_slot'); let candidate = desired;
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  for (let i = 0; i < 4; i++) { const parts = Object.fromEntries(formatter.formatToParts(new Date(candidate)).map(part => [part.type, part.value])); const actual = Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00Z`); candidate += desired - actual; }
  check(dateInNewYork(candidate) === date, 'invalid_campaign_slot'); return new Date(candidate).toISOString();
}
function canonicalRecords(ledger) {
  check(ledger?.schemaVersion === 1 && ledger.enabled === true && ledger.paused === false && ledger.campaign?.enabled !== false && ledger.timezone === 'America/New_York' && Array.isArray(ledger.posts), 'social_publication_paused');
  return ledger.posts.filter(post => ['x', 'instagram'].includes(post.platform)).map(post => ({ key: post.key ?? `legacy-${hash(JSON.stringify(post))}`, platform: post.platform, date: post.date ?? (instant(post.dueAt) ? dateInNewYork(post.dueAt) : null), kind: /policy/.test(post.type ?? '') ? 'update' : /daily|routine|evergreen-invitation/.test(post.type ?? '') ? 'invitation' : 'owner-reserved', status: post.status, postId: post.bufferPostId ?? null, sourceEventKeys: [...new Set([...(post.sourceUrls ?? []), ...(post.sourceUrl ? [post.sourceUrl] : []), ...((post.text ?? post.copy ?? '').match(/https:\/\/[^\s]+/g) ?? [])])].map(url => hash(url.replace(/[).,]+$/, ''))), sourceIds: [...(post.sourceIds ?? []), ...(post.sourceId ? [post.sourceId] : [])], contentHash: post.copySha256 ?? hash(post.text ?? post.copy ?? ''), dueAt: post.dueAt ?? null }));
}
function captionTitle(value, words = 12) { return String(value).replace(/[\r\n\t]+/g, ' ').trim().split(/\s+/).slice(0, words).join(' ').slice(0, 95); }
export function planDailyCampaign({ edition, sourceDesk, releaseProof, graphic, canonicalLedger, cloudLedger, now = new Date().toISOString(), editionBytes = Buffer.from(JSON.stringify(edition)), sourceDeskBytes = Buffer.from(JSON.stringify(sourceDesk)) }) {
  validateFlagshipRecord(edition); const date = dateInNewYork(now);
  check(edition?.status === 'published' && edition.publicationPolicy === 'bounded-daily-v1' && edition.date === date && instant(edition.publishedAt) && Date.parse(edition.publishedAt) <= Date.parse(now) && edition.id === `${date}-r${edition.revision}` && sourceDesk?.schemaVersion === 1 && Array.isArray(sourceDesk.stories), 'current_published_edition_required');
  check(releaseProof?.status === 'verified-live' && releaseProof.edition === edition.id && /^[a-f0-9]{40}$/.test(releaseProof.source ?? '') && digest(releaseProof.editionSha256) && digest(releaseProof.sourceDeskSha256) && releaseProof.editionSha256 === hash(editionBytes) && releaseProof.sourceDeskSha256 === hash(sourceDeskBytes) && JSON.stringify(JSON.parse(editionBytes.toString())) === JSON.stringify(edition) && JSON.stringify(JSON.parse(sourceDeskBytes.toString())) === JSON.stringify(sourceDesk) && instant(releaseProof.verifiedAt) && dateInNewYork(releaseProof.verifiedAt) === date && Date.parse(releaseProof.verifiedAt) <= Date.parse(now), 'published_evidence_proof_required');
  check(graphic?.editionId === edition.id && digest(graphic.pngSha256) && releaseProof.dailyGraphicSha256 === graphic.pngSha256 && graphic.width === 1200 && graphic.height === 630, 'verified_daily_graphic_required');
  const imported = canonicalRecords(canonicalLedger);
  if (cloudLedger) check(cloudLedger.kind === 'ltc-cloud-social' && plain(cloudLedger.records), 'invalid_social_ledger');
  const records = [...new Map([...imported, ...Object.values(cloudLedger?.records ?? {})].map(record => [record.key, record])).values()]; const consumed = platform => records.filter(record => record.platform === platform && record.date === date); const planned = []; const gaps = [];
  const seenEvents = new Set(records.flatMap(record => record.sourceEventKeys)); const seenSourceIds = new Set(records.flatMap(record => record.sourceIds ?? [])); const lead = edition.features?.stories?.[0]; check(lead && typeof lead.title === 'string', 'daily_feature_required');
  const leadSource = edition.features.sources.find(source => source.id === lead.sourceIds[0]);
  const originalDate = leadSource?.publishedAt?.slice(0, 10) ?? 'not supplied';
  const assetURL = `https://ltcmagazine.org/magazine/daily/${edition.id}/social.png`; const editionURL = `https://ltcmagazine.org/conversations/editions/${edition.id}/`;
  const add = post => {
    const existing = consumed(post.platform); const same = [...existing, ...planned.filter(record => record.platform === post.platform)];
    if ((post.kind === 'invitation' && (canonicalLedger.campaign?.maximumRoutineInvitationsPerPlatformPerDay ?? 1) < 1) || same.length >= Math.min(BUFFER_TARGET.maximum[post.platform], post.platform === 'x' ? canonicalLedger.campaign?.maximumXPostsPerDay ?? 4 : canonicalLedger.campaign?.maximumInstagramPostsPerDay ?? 2) || (post.kind === 'invitation' && same.some(record => record.kind === 'invitation')) || (post.kind === 'update' && same.filter(record => record.kind === 'update').length >= BUFFER_TARGET.maximum.updates)) { gaps.push(`${post.platform}:${post.kind}:reserved-or-daily-cap`); return; }
    if (Date.parse(post.dueAt) <= Date.parse(now)) { gaps.push(`${post.platform}:${post.kind}:window-passed`); return; }
    check(post.text.length <= (post.platform === 'x' ? 280 : 2200) && !/@|\$|\b(?:guaranteed|buy now|sell now|APY)\b/i.test(post.text), 'social_copy_outside_scope');
    planned.push({ ...post, channelId: BUFFER_TARGET.channels[post.platform], date, editionId: edition.id, sourceRelease: releaseProof.source, mediaURL: assetURL, mediaSha256: graphic.pngSha256, altText: `Original AI-prepared LTC Magazine daily news map for ${date}: ${captionTitle(lead.title)}. Source publication dates are printed; no market forecast.`, contentHash: hash(post.text) });
  };
  for (const platform of ['x', 'instagram']) { if (canonicalLedger.platforms?.[platform] && (!canonicalLedger.platforms[platform].dailyEnabled || !canonicalLedger.platforms[platform].transportVerified)) { gaps.push(`${platform}:daily-disabled`); continue; } const dueAt = (platform === 'x' ? ['10:45', '14:45', '18:45'] : ['10:45', '18:15']).map(clock => localSlot(date, clock)).find(slot => Date.parse(slot) > Date.parse(now)); if (!dueAt) { gaps.push(`${platform}:invitation:window-passed`); continue; } add({ key: `daily-${date}-${platform}`, platform, kind: 'invitation', dueAt, text: `${date} edition · ${captionTitle(lead.title, 8)}\nSource: ${originalDate} · checked ${edition.features.checkedAt}\nAI-prepared reading. What would you check first?\n${platform === 'x' ? editionURL : `Read: ltcmagazine.org/conversations/editions/${edition.id}/`}\n#Litecoin #Bitcoin`, sourceEventKeys: [], sourceDates: lead.eventDates?.map(event => event.date) ?? [], checkedAt: edition.features.checkedAt }); }
  const updates = sourceDesk.stories.filter(story => /policy|regulat|SEC|CFTC|builder|software|protocol|technology/i.test(`${story.desk} ${story.sourceName}`)).sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)) || a.id.localeCompare(b.id));
  let updateIndex = 0;
  for (const story of updates) {
    if (canonicalLedger.policyWatch?.enabled === false || canonicalLedger.platforms?.x?.policyEnabled === false) { gaps.push('x:updates-disabled'); break; }
    if (updateIndex >= Math.min(2, canonicalLedger.policyWatch?.maximumPostsPerDay ?? 2)) break;
    if (instant(story.checkedAt) && Date.parse(story.checkedAt) > Date.parse(now)) continue;
    if (!safeURL(story.url) || !instant(story.checkedAt) && !/^\d{4}-\d{2}-\d{2}$/.test(story.checkedAt ?? '') || dateInNewYork(story.checkedAt.length === 10 ? story.checkedAt + 'T16:00:00Z' : story.checkedAt) !== date) continue;
    if (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(story.publishedAt ?? '') || Date.parse(story.publishedAt) > Date.parse(now) || Date.parse(now) - Date.parse(story.publishedAt) > 7 * 86400_000 || /\$|%|\b(?:price|yield|APY|last trade|transactions per)\b/i.test(story.title)) continue;
    const event = hash(story.url); if (seenEvents.has(event) || seenSourceIds.has(story.id)) continue; seenEvents.add(event);
    const label = story.dateKind === 'observed' ? 'Observed' : 'Source date';
    const text = `${captionTitle(story.sourceName, 4)} · ${captionTitle(story.classification ?? 'Headline record', 7)}: ${captionTitle(story.title, 10)}\n${label}: ${story.publishedAt.slice(0, 10)} · checked ${date}\nAI source desk; read the original and its limits.\n${story.url}\nhttps://ltcmagazine.org/conversations/updates/`;
    const clock = ['14:45', '18:45'][updateIndex++];
    if (text.length > 280) { gaps.push(`x:update:${story.id}:copy-too-long`); continue; }
    add({ key: `update-${date}-${event.slice(0, 24)}`, platform: 'x', kind: 'update', dueAt: localSlot(date, clock), text, sourceEventKeys: [event], sourceDates: [story.publishedAt], checkedAt: story.checkedAt });
  }
  return { schemaVersion: 1, mode: 'private-daily-campaign-plan', cloudPublishingActive: false, date, editionId: edition.id, canonicalLedgerSha256: cloudLedger?.migration?.canonicalSha256 ?? hash(JSON.stringify(canonicalLedger)), releaseProof, posts: planned, gaps };
}

// Separate provisioned private Docs document/key. Canonical imports stay paused;
// no website ledger is reused and no local ledger is mutated by this module.
function socialCapacity(value) { const bytes = Buffer.byteLength(JSON.stringify(value)); return { bytes, maximumBytes: 850_000, warningAtBytes: 500_000, archiveAttentionRequired: bytes >= 500_000 }; }
export class CloudSocialLedger {
  constructor(adapter, { clock = Date.now } = {}) { check(adapter && typeof adapter.read === 'function' && typeof adapter.conditionalWrite === 'function', 'social_durable_adapter_required'); this.adapter = adapter; this.clock = clock; }
  async inspect() { const { value } = await this.adapter.read('social'); if (!value) return { schemaVersion: 1, kind: 'ltc-cloud-social', paused: true, migration: null, fence: 0, lease: null, records: {} }; check(value.schemaVersion === 1 && value.kind === 'ltc-cloud-social' && typeof value.paused === 'boolean' && plain(value.records), 'invalid_social_ledger'); return { ...structuredClone(value), capacity: { ...socialCapacity(value), ...(value.capacity?.warningFirstObservedAt ? { warningFirstObservedAt: value.capacity.warningFirstObservedAt } : {}) } }; }
  async update(transform) { const { value, version } = await this.adapter.read('social'); check(value?.schemaVersion === 1 && value.kind === 'ltc-cloud-social' && plain(value.records), 'social_ledger_migration_required'); const result = transform(value); const previousWarningAt = value.capacity?.warningFirstObservedAt; value.capacity = { ...socialCapacity(value), ...(socialCapacity(value).archiveAttentionRequired ? { warningFirstObservedAt: previousWarningAt ?? new Date(this.clock()).toISOString() } : {}) }; check(Buffer.byteLength(JSON.stringify(value)) <= 850_000, 'social_ledger_capacity_exceeded'); await this.adapter.conditionalWrite('social', value, version); return structuredClone(result); }
  async setPaused(paused) { check(typeof paused === 'boolean', 'invalid_social_pause'); return this.update(value => { value.paused = paused; return { paused }; }); }
  async importCanonical(canonicalLedger, { expectedSha256, verifiedPostIds }) {
    check(digest(expectedSha256) && hash(JSON.stringify(canonicalLedger)) === expectedSha256 && Array.isArray(verifiedPostIds) && verifiedPostIds.every(hex), 'social_migration_proof_required');
    const records = canonicalRecords(canonicalLedger); const pending = records.filter(record => ['scheduled', 'draft', 'sending', 'uncertain', 'scheduled-verified'].includes(record.status));
    check(pending.every(record => /^\d{4}-\d{2}-\d{2}$/.test(record.date ?? '') && record.postId && verifiedPostIds.includes(record.postId)), 'social_migration_reconciliation_required');
    const value = { schemaVersion: 1, kind: 'ltc-cloud-social', paused: true, migration: { canonicalSha256: expectedSha256, importedAt: new Date(this.clock()).toISOString(), sourceUpdatedAt: canonicalLedger.updatedAt ?? null, existingPendingReadbackIds: verifiedPostIds }, fence: 0, lease: null, policy: { schemaVersion: 1, enabled: true, paused: false, timezone: 'America/New_York', platforms: structuredClone(canonicalLedger.platforms ?? {}), campaign: { enabled: canonicalLedger.campaign?.enabled !== false, maximumRoutineInvitationsPerPlatformPerDay: canonicalLedger.campaign?.maximumRoutineInvitationsPerPlatformPerDay ?? 1, maximumXPostsPerDay: canonicalLedger.campaign?.maximumXPostsPerDay ?? 4, maximumInstagramPostsPerDay: canonicalLedger.campaign?.maximumInstagramPostsPerDay ?? 2 }, policyWatch: structuredClone(canonicalLedger.policyWatch ?? { enabled: true, maximumPostsPerDay: 2 }), posts: [] }, records: Object.fromEntries(records.map(record => [record.key, record])) };
    await this.adapter.conditionalWrite('social', value, null); return { imported: records.length, paused: true };
  }
  async acquire(runId, canonicalSha256) { check(/^[a-z0-9][a-z0-9_-]{0,79}$/.test(runId ?? ''), 'invalid_social_run_id'); return this.update(value => { check(!value.paused && value.migration?.canonicalSha256 === canonicalSha256 && digest(value.migration?.cutoverReceiptSha256), 'social_cutover_required'); check(!value.lease, 'social_lease_held'); check(!Object.values(value.records).some(record => ['create-uncertain', 'schedule-uncertain'].includes(record.status)), 'social_reconciliation_required'); value.lease = { runId, fence: ++value.fence, expiresAt: this.clock() + 3_600_000 }; return value.lease; }); }
  live(value, lease) { check(!value.paused, 'social_publication_paused'); check(value.lease?.runId === lease?.runId && value.lease?.fence === lease?.fence && value.lease.expiresAt > this.clock(), 'social_lease_fenced'); }
  async reserve(lease, post) {
    check(/^(?:daily-\d{4}-\d{2}-\d{2}-(?:x|instagram)|update-\d{4}-\d{2}-\d{2}-[a-f0-9]{24})$/.test(post.key ?? '') && ['x', 'instagram'].includes(post.platform) && (post.kind !== 'update' || post.platform === 'x') && !/@|\$|\b(?:guaranteed|buy now|sell now|APY)\b/i.test(post.text) && dateInNewYork(this.clock()) === post.date && Date.parse(post.dueAt) > this.clock() && post.channelId === BUFFER_TARGET.channels[post.platform] && ['invitation', 'update'].includes(post.kind) && dateInNewYork(post.dueAt) === post.date && hash(post.text) === post.contentHash && digest(post.mediaSha256) && safeURL(post.mediaURL, true), 'invalid_social_reservation');
    const planHash = hash(JSON.stringify(post));
    return this.update(value => { this.live(value, lease); if (value.records[post.key]) { check(value.records[post.key].planHash === planHash, 'social_idempotency_conflict'); return value.records[post.key]; }
      const records = Object.values(value.records); const day = records.filter(record => record.platform === post.platform && record.date === post.date);
      check(day.length < BUFFER_TARGET.maximum[post.platform] && (post.kind !== 'invitation' || !day.some(record => record.kind === 'invitation')) && (post.kind !== 'update' || day.filter(record => record.kind === 'update').length < 2), 'social_daily_cap_reserved');
      check(post.kind !== 'update' || !records.some(record => record.sourceEventKeys?.some(event => post.sourceEventKeys.includes(event))), 'social_source_event_reserved');
      value.records[post.key] = { ...structuredClone(post), planHash, status: 'reserved', postId: null, fence: lease.fence }; return value.records[post.key]; });
  }
  async authorize(lease, key, action) { return this.update(value => { this.live(value, lease); const record = value.records[key]; check(record && (action === 'create' ? record.status === 'reserved' && !record.postId : record.status === 'draft' && hex(record.postId)), 'social_reconciliation_required'); record.status = action === 'create' ? 'create-uncertain' : 'schedule-uncertain'; record.attemptedAt = new Date(this.clock()).toISOString(); return record; }); }
  async capturePostId(lease, key, postId) { check(hex(postId), 'invalid_buffer_post_id'); return this.update(value => { check(value.lease?.fence === lease.fence, 'social_lease_fenced'); const record = value.records[key]; check(record?.status === 'create-uncertain' && (!record.postId || record.postId === postId), 'social_reconciliation_required'); record.postId = postId; return record; }); }
  async confirm(lease, key, postId, status, proof) { check(hex(postId) && ['draft', 'scheduled', 'sent'].includes(status) && digest(proof), 'invalid_social_readback'); return this.update(value => { check(value.lease?.fence === lease.fence, 'social_lease_fenced'); const record = value.records[key]; check(record && (!record.postId || record.postId === postId) && ['create-uncertain', 'schedule-uncertain', 'draft', 'scheduled', 'sent'].includes(record.status), 'social_reconciliation_required'); record.postId = postId; record.status = status; record.readbackSha256 = proof; return record; }); }
  async release(lease) { return this.update(value => { check(value.lease?.fence === lease.fence && !Object.values(value.records).some(record => ['create-uncertain', 'schedule-uncertain'].includes(record.status)), 'social_reconciliation_required'); value.lease = null; return { released: true }; }); }
}
function normalizedPost(result) { const value = bufferToolData(result); const post = value.post ?? value; check(hex(post.id) && Object.values(BUFFER_TARGET.channels).includes(post.channelId ?? post.channel?.id) && typeof post.text === 'string' && ['draft', 'scheduled', 'sent', 'sending', 'error', 'needs_approval'].includes(post.status), 'buffer_post_readback_unverified'); return { ...post, channelId: post.channelId ?? post.channel.id }; }
function verifySavedPost(saved, planned) { check(saved.channelId === planned.channelId && saved.text === planned.text && Array.isArray(saved.assets) && saved.assets.some(asset => (asset.source ?? asset.url) === planned.mediaURL && asset.altText === planned.altText), 'buffer_post_readback_mismatch'); }
export function createSocialPostProvider({ client, ledger, lease, post, instagramMetadata, editAction }) {
  check(client && typeof client.callTool === 'function' && ledger instanceof CloudSocialLedger, 'invalid_social_provider');
  return {
    async createDraft() {
      const reserved = await ledger.reserve(lease, post);
      if (reserved.postId) { client.rememberPostId(reserved.postId); return reserved; }
      check(reserved.status === 'reserved', 'social_reconciliation_required');
      const args = { channelId: post.channelId, schedulingType: 'automatic', text: post.text, assets: [{ type: 'image', url: post.mediaURL, altText: post.altText }], saveToDraft: true, ...(post.platform === 'instagram' ? { metadata: { instagram: instagramMetadata } } : {}) };
      if (post.platform === 'instagram') check(plain(instagramMetadata), 'instagram_schema_settings_required');
      validateBufferArguments(client.schema('create_post'), args); // No guessed arguments are sent.
      await ledger.authorize(lease, post.key, 'create');
      const result = await client.callTool('create_post', args); const raw = bufferToolData(result); const candidateId = (raw.post ?? raw).id; if (hex(candidateId)) await ledger.capturePostId(lease, post.key, candidateId);
      const saved = normalizedPost(result); verifySavedPost(saved, post); check(saved.status === 'draft', 'buffer_private_draft_unverified');
      client.rememberPostId(saved.id); return ledger.confirm(lease, post.key, saved.id, 'draft', hash(JSON.stringify(saved)));
    },
    async scheduleKnownDraft() {
      const record = (await ledger.inspect()).records[post.key]; check(record?.postId && record.status === 'draft', 'social_known_draft_required'); client.rememberPostId(record.postId);
      const current = normalizedPost(await client.callTool('get_post', { postId: record.postId })); verifySavedPost(current, post); check(current.status === 'draft' && typeof editAction === 'string' && current.allowedActions?.includes(editAction), 'buffer_edit_action_unverified');
      const args = { postId: record.postId, schedulingType: 'automatic', mode: 'customScheduled', dueAt: post.dueAt, saveToDraft: false }; validateBufferArguments(client.schema('edit_post'), args);
      await ledger.authorize(lease, post.key, 'schedule');
      const saved = normalizedPost(await client.callTool('edit_post', args)); verifySavedPost(saved, post); check(saved.id === record.postId && saved.status === 'scheduled' && Date.parse(saved.dueAt) === Date.parse(post.dueAt), 'buffer_schedule_readback_unverified');
      return ledger.confirm(lease, post.key, saved.id, 'scheduled', hash(JSON.stringify(saved)));
    },
    async reconcileKnownPost() {
      const record = (await ledger.inspect()).records[post.key]; check(record?.postId, 'social_unknown_create_requires_review'); client.rememberPostId(record.postId);
      const saved = normalizedPost(await client.callTool('get_post', { postId: record.postId })); verifySavedPost(saved, post);
      check(saved.status === 'draft' || (['scheduled', 'sent'].includes(saved.status) && Date.parse(saved.dueAt) === Date.parse(post.dueAt)), 'social_outcome_unknown');
      return ledger.confirm(lease, post.key, saved.id, saved.status, hash(JSON.stringify(saved)));
    },
  };
}
export async function loadAcceptedSocialInputs({ websiteState, socialDocument, fetchImpl = fetch, env = process.env, now = new Date().toISOString() }) {
  const website = await websiteState.inspect(); const accepted = website.latestRelease;
  check(!website.paused && /^\d{4}-\d{2}-\d{2}-r[1-9]\d?$/.test(accepted?.editionId ?? '') && accepted.editionId.slice(0, 10) === dateInNewYork(now) && /^[a-f0-9]{40}$/.test(accepted.source ?? '') && instant(accepted.verifiedAt) && plain(accepted.publicationProvenance), 'cloud_website_release_proof_required');
  check(socialDocument?.kind === 'ltc-cloud-social' && plain(socialDocument.policy), 'social_ledger_migration_required');
  async function bytes(url, github = false, limit = 2_000_000) {
    let response; try { response = await fetchImpl(url, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(30_000), headers: { Accept: 'application/json', ...(github && env.GITHUB_TOKEN ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` } : {}) } }); } catch { throw Error('published_source_readback_unavailable'); }
    check(response.status === 200 && !response.redirected && response.body, 'published_source_readback_unavailable'); const reader = response.body.getReader(); let length = 0; const chunks = [];
    try { while (true) { const part = await reader.read(); if (part.done) break; length += part.value.byteLength; check(length <= limit, 'published_source_readback_unavailable'); chunks.push(part.value); } } finally { await reader.cancel().catch(() => {}); }
    return Buffer.concat(chunks);
  }
  const editionBytes = await bytes(`https://ltcmagazine.org/data/ltc-editions/${accepted.editionId}.json`);
  const response = JSON.parse(await bytes(`https://api.github.com/repos/Satnam-Satoshi/Satoshi-Langar/contents/content/ltc-newsroom-selections/latest.json?ref=${accepted.source}`, true));
  check(response.encoding === 'base64' && typeof response.content === 'string', 'published_source_readback_unavailable'); const sourceDeskBytes = Buffer.from(response.content, 'base64');
  const graphic = JSON.parse(await bytes(`https://ltcmagazine.org/magazine/daily/${accepted.editionId}/graphic.json`));
  check(hash(editionBytes) === accepted.publicationProvenance.editionSha256 && hash(sourceDeskBytes) === accepted.publicationProvenance.sourceDeskSha256 && graphic.pngSha256 === accepted.publicationProvenance.dailyGraphicSha256, 'published_evidence_proof_required');
  return { edition: JSON.parse(editionBytes), sourceDesk: JSON.parse(sourceDeskBytes), editionBytes, sourceDeskBytes, graphic, canonicalLedger: socialDocument.policy, cloudLedger: socialDocument, now, releaseProof: { status: 'verified-live', edition: accepted.editionId, source: accepted.source, verifiedAt: accepted.verifiedAt, ...accepted.publicationProvenance } };
}
export async function verifyCampaignMedia(post, fetchImpl = fetch) {
  check(post.mediaURL === `https://ltcmagazine.org/magazine/daily/${post.editionId}/social.png` && digest(post.mediaSha256), 'unverified_campaign_media');
  const response = await fetchImpl(post.mediaURL, { method: 'GET', redirect: 'error', signal: AbortSignal.timeout(30_000) });
  check(response.status === 200 && !response.redirected && response.body, 'unverified_campaign_media'); const reader = response.body.getReader(); let length = 0; const chunks = [];
  try { while (true) { const part = await reader.read(); if (part.done) break; length += part.value.byteLength; check(length <= 12_000_000, 'unverified_campaign_media'); chunks.push(part.value); } } finally { await reader.cancel().catch(() => {}); }
  const png = Buffer.concat(chunks); check(png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) && hash(png) === post.mediaSha256, 'unverified_campaign_media');
  return { sha256: post.mediaSha256, publicReady: true };
}
export async function executePreparedCampaign({ client, ledger, plan, runId, instagramMetadata, editAction, verifyPublicMedia }) {
  check(ledger instanceof CloudSocialLedger && plan?.mode === 'private-daily-campaign-plan' && typeof verifyPublicMedia === 'function', 'invalid_social_campaign_configuration');
  const probe = await probeBufferCloud({ client }); check(probe.identityVerified === true && probe.queueReadComplete === true, 'buffer_identity_acceptance_required'); const document = await ledger.inspect();
  check(!document.paused && document.migration?.canonicalSha256 === plan.canonicalLedgerSha256, 'social_cutover_required');
  const known = new Set(Object.values(document.records).map(record => record.postId).filter(Boolean));
  for (const post of probe.queue) {
    const stamp = post.dueAt ?? post.sentAt;
    if ((['draft', 'needs_approval', 'sending'].includes(post.status) || (instant(stamp) && dateInNewYork(stamp) >= plan.date && ['scheduled', 'sent', 'error'].includes(post.status)))) check(known.has(post.id), 'social_external_queue_unreconciled');
  }
  const lease = await ledger.acquire(runId, plan.canonicalLedgerSha256); const receipts = [];
  try {
    for (const post of plan.posts) {
      const current = (await ledger.inspect()).records[post.key];
      const provider = createSocialPostProvider({ client, ledger, lease, post, instagramMetadata, editAction });
      if (current?.postId && ['scheduled', 'sent'].includes(current.status)) { receipts.push(await provider.reconcileKnownPost()); continue; }
      await verifyPublicMedia(post); await provider.createDraft(); receipts.push(await provider.scheduleKnownDraft());
    }
    await ledger.release(lease); return { capacity: (await ledger.inspect()).capacity, status: 'buffer-schedule-readback-verified', bufferWritesPerformed: receipts.length > 0, publiclyPublished: false, receipts };
  } catch (error) { try { await ledger.release(lease); } catch { /* Uncertain effects retain the lease. */ } throw error; }
}
export async function runCloudCampaign({ stateConfig, websiteStateConfig, acceptedSchemaHashes, instagramMetadata, editAction, runId, env = process.env, fetchImpl = fetch } = {}) {
  assertCloudSocialAcceptance();
  check(stateConfig?.ledgerKey === 'social' && (websiteStateConfig?.ledgerKey ?? 'website') === 'website' && stateConfig.documentId !== websiteStateConfig.documentId, 'separate_social_ledger_required');
  const social = await createGoogleStateRuntime({ config: stateConfig, env, fetchImpl });
  const website = await createGoogleStateRuntime({ config: websiteStateConfig, env, fetchImpl });
  const ledger = new CloudSocialLedger(social.stateAdapter); const document = await ledger.inspect();
  const input = await loadAcceptedSocialInputs({ websiteState: new DurableCloudState(website.stateAdapter, 'website'), socialDocument: document, env, fetchImpl });
  const plan = planDailyCampaign(input);
  const client = createBufferMcpClient({ env, fetchImpl, allowWrites: true, acceptedSchemaHashes, knownPostIds: Object.values(document.records).map(record => record.postId).filter(hex) });
  return executePreparedCampaign({ client, ledger, plan, runId, instagramMetadata, editAction, verifyPublicMedia: post => verifyCampaignMedia(post, fetchImpl) });
}

export async function probeBufferCloud({ client }) {
  const schemaHashes = await client.discover(); const toolSchemas = Object.fromEntries([...methods].map(method => [method, client.schema(method)]));
  const base = { schemaVersion: 1, mode: 'read-only-buffer-cloud-probe', cloudPublishingActive: false, writesPerformed: false, schemaHashes, toolSchemas, outputSchemas: Object.fromEntries([...methods].map(method => [method, client.outputSchema?.(method) ?? null])) };
  let account; let channels;
  try { account = await client.callTool('get_account', {}); channels = await client.callTool('list_channels', { organizationId: BUFFER_TARGET.organization }); }
  catch { return { ...base, identityVerified: false, queueReadComplete: false, queue: [], requiresSchemaReview: true, reason: 'discovered-tool-account-read-unavailable' }; }
  let identity; try { identity = verifyBufferIdentity(account, channels); }
  catch { return { ...base, identityVerified: false, queueReadComplete: false, accountEvidence: account, channelEvidence: channels, queue: [], requiresSchemaReview: true }; }
  const queue = []; let after; const cursors = new Set(); let complete = false; let lastEvidence;
  try {
    for (let page = 0; page < 10; page++) {
      const result = bufferToolData(await client.callTool('list_posts', { organizationId: BUFFER_TARGET.organization, channelIds: Object.values(BUFFER_TARGET.channels), status: ['draft', 'needs_approval', 'scheduled', 'sending', 'sent', 'error'], first: 100, ...(after ? { after } : {}) })); lastEvidence = result;
      const posts = recordsOf(result.posts);
      for (const post of posts) { check(hex(post.id) && Object.values(BUFFER_TARGET.channels).includes(post.channelId ?? post.channel?.id), 'buffer_response_shape_unverified'); client.rememberPostId(post.id); queue.push({ id: post.id, channelId: post.channelId ?? post.channel?.id, status: post.status, text: post.text, dueAt: post.dueAt ?? null, sentAt: post.sentAt ?? null, assets: post.assets ?? [], allowedActions: post.allowedActions ?? [] }); }
      const pageInfo = result.pageInfo ?? result.posts?.pageInfo;
      if (pageInfo?.hasNextPage === false) { complete = true; break; }
      check(pageInfo?.hasNextPage === true && typeof pageInfo.endCursor === 'string' && !cursors.has(pageInfo.endCursor), 'buffer_queue_pagination_unverified'); cursors.add(pageInfo.endCursor); after = pageInfo.endCursor;
    }
  } catch { return { ...base, identityVerified: true, identity, queueReadComplete: false, queue, queueEvidence: lastEvidence ?? null, requiresSchemaReview: true }; }
  return { ...base, identityVerified: true, identity, queueReadComplete: complete, queue, requiresSchemaReview: !complete };
}
// Safe public job-summary structure: no account values, post copy, IDs or keys.
export function publicBufferProbeStructure(receipt) {
  function shape(value, depth = 0) {
    if (depth > 7) return 'bounded';
    if (Array.isArray(value)) return { type: 'array', sample: value.length ? shape(value[0], depth + 1) : null };
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).slice(0, 80).filter(([key]) => /^[A-Za-z][A-Za-z0-9_]{0,59}$/.test(key)).map(([key, child]) => [key, shape(child, depth + 1)]));
    return value === null ? 'null' : typeof value;
  }
  function schema(rule, depth = 0) {
    if (!rule || typeof rule !== 'object' || depth > 12) return typeof rule === 'boolean' ? rule : null;
    const allowed = new Set(['type','properties','required','items','anyOf','oneOf','allOf','$defs','definitions','$ref','additionalProperties']);
    const result = {};
    for (const [key, value] of Object.entries(rule)) if (allowed.has(key)) {
      if (['properties','$defs','definitions'].includes(key)) result[key] = Object.fromEntries(Object.entries(value).filter(([name]) => /^[A-Za-z][A-Za-z0-9_]{0,59}$/.test(name)).map(([name, child]) => [name, schema(child, depth + 1)]));
      else if (['items','additionalProperties'].includes(key)) result[key] = typeof value === 'boolean' ? value : schema(value, depth + 1);
      else if (['anyOf','oneOf','allOf'].includes(key)) result[key] = value.map(child => schema(child, depth + 1));
      else if (key === '$ref') result[key] = typeof value === 'string' && /^#\/[A-Za-z0-9_/$-]+$/.test(value) ? value : 'unverified-reference';
      else if (key === 'type') result[key] = Array.isArray(value) ? value.filter(type => ['object','array','string','integer','number','boolean','null'].includes(type)) : ['object','array','string','integer','number','boolean','null'].includes(value) ? value : 'unverified-type';
      else if (key === 'required') result[key] = Array.isArray(value) ? value.filter(name => /^[A-Za-z][A-Za-z0-9_]{0,59}$/.test(name)) : [];
      else result[key] = value;
    }
    if (Array.isArray(rule.enum)) result.publicEnumValues = rule.enum.filter(value => ['automatic','notification','addToQueue','shareNow','shareNext','customScheduled','image','video','document','post','story','reel','draft','needs_approval','scheduled','sending','sent','error','editPost','updatePost','deletePost'].includes(value));
    return result;
  }
  const dataShape = value => { try { return shape(bufferToolData(value)); } catch { return null; } };
  return { mode: receipt.mode, writesPerformed: false, observedEditActions: [...new Set((receipt.queue ?? []).flatMap(post => post.allowedActions ?? []))].filter(action => ['editPost','updatePost','reschedulePost','edit','update'].includes(action)), identityVerified: receipt.identityVerified, queueReadComplete: receipt.queueReadComplete, schemaHashes: receipt.schemaHashes, toolSchemas: Object.fromEntries(Object.entries(receipt.toolSchemas ?? {}).map(([name, rule]) => [name, schema(rule)])), outputSchemas: Object.fromEntries(Object.entries(receipt.outputSchemas ?? {}).map(([name, rule]) => [name, schema(rule)])), accountShape: dataShape(receipt.accountEvidence), channelShape: dataShape(receipt.channelEvidence), queueShape: shape(receipt.queueEvidence ?? null) };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    if (args[0] === '--probe' && args.length === 3 && args[1] === '--receipt') {
      const receipt = await probeBufferCloud({ client: createBufferMcpClient() });
      await writeFile(path.resolve(args[2]), JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
      console.log(JSON.stringify({ mode: receipt.mode, writesPerformed: false, cloudPublishingActive: false, queueRecords: receipt.queue.length, identityVerified: receipt.identityVerified }));
    } else if (args[0] === '--plan' && args.length === 5 && args[1] === '--input' && args[3] === '--receipt') {
      const input = JSON.parse(await readFile(path.resolve(args[2]), 'utf8'));
      if (typeof input.editionRaw === 'string') input.editionBytes = Buffer.from(input.editionRaw);
      if (typeof input.sourceDeskRaw === 'string') input.sourceDeskBytes = Buffer.from(input.sourceDeskRaw);
      const plan = planDailyCampaign(input);
      await writeFile(path.resolve(args[4]), JSON.stringify(plan, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); console.log(JSON.stringify({ mode: plan.mode, posts: plan.posts.length, cloudPublishingActive: false }));
    } else if (args[0] === '--publish') {
      assertCloudSocialAcceptance();
      const options = {}; for (let i = 1; i < args.length; i += 2) { const key = { '--state-config': 'stateConfig', '--website-state-config': 'websiteStateConfig', '--settings': 'settings', '--receipt': 'receipt' }[args[i]]; check(key && !options[key] && args[i + 1], 'invalid_social_arguments'); options[key] = path.resolve(args[i + 1]); }
      check(options.stateConfig && options.websiteStateConfig && options.settings && options.receipt, 'invalid_social_arguments');
      const json = async file => JSON.parse(await readFile(file, 'utf8')); const settings = await json(options.settings); check(plain(settings) && Object.keys(settings).every(key => ['acceptedSchemaHashes', 'instagramMetadata', 'editAction'].includes(key)), 'invalid_social_arguments');
      const result = await runCloudCampaign({ stateConfig: await json(options.stateConfig), websiteStateConfig: await json(options.websiteStateConfig), ...settings, runId: `gha-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}` });
      await writeFile(options.receipt, JSON.stringify(result, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); console.log(JSON.stringify({ status: result.status, publiclyPublished: false, archiveAttentionRequired: result.capacity?.archiveAttentionRequired ?? false }));
    }
    else throw Error('invalid_social_arguments');
  } catch (error) { const known = new Set(['buffer_cloud_key_required', 'cloud_social_acceptance_pending', 'invalid_social_arguments', 'social_publication_paused', 'current_published_edition_required', 'published_evidence_proof_required', 'verified_daily_graphic_required', 'buffer_rate_limited', 'buffer_session_lost', 'buffer_protocol_invalid', 'buffer_discovery_incomplete', 'buffer_response_shape_unverified', 'wrong_buffer_account', 'wrong_buffer_channel', 'buffer_queue_pagination_unverified']); console.error(known.has(error.message) ? error.message : 'cloud_social_operation_withheld'); process.exitCode = 1; }
}
