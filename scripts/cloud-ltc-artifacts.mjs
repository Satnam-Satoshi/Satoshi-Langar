import { execFileSync } from 'node:child_process';
import { readFile, readdir, lstat } from 'node:fs/promises';
import path from 'node:path';
const check = (condition, code) => { if (!condition) throw Error(code); };
function relative(file) { return typeof file === 'string' && file.length <= 500 && !file.startsWith('/') && !file.includes('\\') && !file.split('/').some(part => !part || part === '.' || part === '..'); }
function noCredentials(file) {
  const names = file.split('/');
  check(!names.some(name => ['.aws', '.ssh', '.config', '.codex', '.agents', '.git', '.npmrc'].includes(name)), 'credential_file_in_artifacts');
  check(!names.some(name => /^(?:\.env(?:\..+)?|credentials\.json|service-account.*\.json|id_rsa|id_ed25519)$/i.test(name) && !['.env.example', '.env.template'].includes(name)) && !/\.(?:pem|p12|pfx|key)$/i.test(file), 'credential_file_in_artifacts');
}
// Full explicit roots; never crawl .git, dependencies, a home directory or an env.
export async function collectReleaseArtifacts({ root, changedFiles = [], staticDirectory, outputDirectory, evidenceDirectory }) {
  check([root, staticDirectory, outputDirectory, evidenceDirectory].every(directory => typeof directory === 'string' && path.isAbsolute(directory)), 'invalid_artifact_roots');
  const files = [];
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).split('\0').filter(Boolean);
  for (const file of [...new Set([...tracked, ...changedFiles])].sort()) {
    check(relative(file), 'invalid_artifact_path'); noCredentials(file);
    const full = path.join(root, file); const info = await lstat(full);
    check(info.isFile() && !info.isSymbolicLink(), 'non_regular_artifact_file');
    files.push({ path: `source/${file}`, bytes: await readFile(full), mode: info.mode & 0o111 ? 'executable' : 'regular' });
  }
  async function walk(directory, prefix, base = '') {
    for (const entry of await readdir(path.join(directory, base), { withFileTypes: true })) {
      const file = base ? `${base}/${entry.name}` : entry.name;
      check(relative(file), 'invalid_artifact_path'); noCredentials(file);
      check(!entry.isSymbolicLink(), 'non_regular_artifact_file');
      if (entry.isDirectory()) await walk(directory, prefix, file);
      else {
        check(entry.isFile(), 'non_regular_artifact_file'); const full = path.join(directory, file); const info = await lstat(full);
        files.push({ path: `${prefix}/${file}`, bytes: await readFile(full), mode: info.mode & 0o111 ? 'executable' : 'regular' });
      }
    }
  }
  await walk(staticDirectory, 'static'); await walk(outputDirectory, 'build-output'); await walk(evidenceDirectory, 'evidence');
  return files;
}
