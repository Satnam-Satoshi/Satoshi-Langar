import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
// Vercel's ignore convention is inverted: 0 skips; 1 permits a build.
// This is a bounded preview-only exception, never production admission.
export function previewExitCode(env, git, now = Date.now()) {
  try {
    if (env.VERCEL_ENV !== 'preview' || env.VERCEL_TARGET_ENV !== 'preview') return 0;
    if (env.VERCEL_GIT_REPO_OWNER !== 'Satnam-Satoshi' || env.VERCEL_GIT_REPO_SLUG !== 'Satoshi-Langar') return 0;
    if (!Number.isFinite(now) || now >= Date.parse('2026-11-16T00:00:00Z')) return 0;
    const head = git('HEAD');
    const parents = git('commit').split('\n\n')[0].split('\n').filter(line=>line.startsWith('parent '));
    if (!/^[a-f0-9]{40}$/.test(head) || env.VERCEL_GIT_COMMIT_SHA !== head) return 0;
    if (parents.length !== 1 || parents[0] !== 'parent 247df76011141fae768af3be3ee6a0aa141064a3') return 0;
    // A pinned full tracked-tree fingerprint avoids needing a parent object in shallow clones.
    const allowed = new Set(['scripts/pdf-preview-ignore.mjs','scripts/test-cloud-ltc-pdf-preview-ignore.mjs','vercel.json']);
    const stable = git('tree').split('\n').filter(Boolean).filter(line=>!allowed.has(line.split('\t')[1])).join('\n')+'\n';
    if (createHash('sha256').update(stable).digest('hex') !== 'a08fbdb3e6802e8c0ba80fe6df6f3bc4883cb4dc34105cef43a1525a80498305') return 0;
    return 1;
  } catch { return 0; }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = previewExitCode(process.env, ref => execFileSync('git', ref === 'commit' ? ['cat-file','-p','HEAD'] : ref === 'tree' ? ['ls-tree','-r','HEAD'] : ['rev-parse','HEAD'], {encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim());
  console.log(result === 1 ? 'ALLOW_PDF_PREVIEW' : 'SKIP_PDF_PREVIEW');
}
