#!/usr/bin/env node
/* Rejects files that are too big for their type, with a ratchet for known offenders.

   node scripts/check-file-sizes.mjs                 check every tracked and unignored file
   node scripts/check-file-sizes.mjs --pre-push R U  check what a push sends (git hook; ref lines on stdin)
   node scripts/check-file-sizes.mjs --update        tighten the baseline: shrink entries, drop fixed files
   node scripts/check-file-sizes.mjs --accept PATH…  deliberately add or raise baseline entries
   node scripts/check-file-sizes.mjs --install-hook  point core.hooksPath at .githooks (npm prepare)

   Baseline entries (scripts/file-size-baseline.json) pin each oversized file to its exact byte size.
   A pinned file may never grow, and a pinned file that shrinks, drops under its limit or disappears
   must be tightened with --update, so the list can only be worked down. */
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const KiB = 1024, MiB = 1024 * KiB;
export const BASELINE = 'scripts/file-size-baseline.json';
export const HOOKS = '.githooks';
/* GitHub warns above 50 MiB and rejects 100 MiB; nothing above this ceiling can be baselined. */
export const CEILING = 50 * MiB;

const ext = list => file => list.includes(path.posix.extname(file).slice(1).toLowerCase());
/* First matching rule wins. */
export const RULES = [
  {name: 'lockfile', limit: 1 * MiB, match: file => /(?:^|\/)(?:package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml)$/.test(file)},
  {name: 'vendored code', limit: 512 * KiB, match: file => (/^(?:vendor|ace)\//.test(file) || /\.min\.[cm]?js$|\.min\.css$/i.test(file)) && ext(['js', 'mjs', 'cjs', 'css'])(file)},
  {name: 'wasm', limit: 4 * MiB, match: ext(['wasm'])},
  {name: 'code', limit: 128 * KiB, match: ext(['js', 'mjs', 'cjs', 'ts', 'tsx', 'jsx', 'r', 'css', 'sh', 'py'])},
  {name: 'markup', limit: 128 * KiB, match: ext(['md', 'html', 'htm', 'txt'])},
  {name: 'data', limit: 128 * KiB, match: ext(['json', 'dcf', 'yml', 'yaml', 'csv', 'tsv', 'toml', 'xml', 'webmanifest'])},
  {name: 'svg', limit: 128 * KiB, match: ext(['svg'])},
  {name: 'image', limit: 256 * KiB, match: ext(['png', 'jpg', 'jpeg', 'gif', 'webp', 'avif', 'ico', 'bmp'])},
  {name: 'font', limit: 256 * KiB, match: ext(['woff', 'woff2', 'ttf', 'otf'])},
  {name: 'other', limit: 512 * KiB, match: () => true},
];

export const ruleFor = file => RULES.find(rule => rule.match(file));
export const human = bytes => bytes >= MiB ? (bytes / MiB).toFixed(1) + ' MiB' : bytes >= KiB ? (bytes / KiB).toFixed(1) + ' KiB' : bytes + ' B';

/* files: [{path, size}]. Returns problem strings. With stale, the whole tree is present, so baseline
   entries that no longer match an oversized file are reported as needing --update. */
export function evaluate(files, baseline, {stale = false} = {}) {
  const problems = [], seen = new Set(), pinned = baseline.files || {};
  for (const {path: file, size} of files) {
    seen.add(file);
    const rule = ruleFor(file), entry = pinned[file];
    if (size > CEILING) problems.push(`${file}: ${human(size)} exceeds the ${human(CEILING)} ceiling that no baseline can raise`);
    else if (entry) {
      if (size > entry.bytes) problems.push(`${file}: grew to ${human(size)} (${size} B); the baseline allows ${entry.bytes} B`);
      else if (stale && size <= rule.limit) problems.push(`${file}: now ${human(size)}, within the ${rule.name} limit; run --update to drop its baseline entry`);
      else if (stale && size < entry.bytes) problems.push(`${file}: shrank to ${size} B from ${entry.bytes} B; run --update to tighten the baseline`);
    } else if (size > rule.limit) problems.push(`${file}: ${human(size)} exceeds the ${human(rule.limit)} ${rule.name} limit`);
  }
  if (stale) for (const file of Object.keys(pinned)) if (!seen.has(file)) problems.push(`${file}: no longer exists; run --update to drop its baseline entry`);
  return problems;
}

/* Tightens only: shrinks entries, drops fixed or missing files. Never adds or raises. */
export function tighten(files, baseline) {
  const sizes = new Map(files.map(file => [file.path, file.size])), next = {}, changes = [];
  for (const [file, entry] of Object.entries(baseline.files || {})) {
    const size = sizes.get(file);
    if (size === undefined) changes.push(`dropped ${file} (missing)`);
    else if (size <= ruleFor(file).limit) changes.push(`dropped ${file} (within limit)`);
    else {
      next[file] = size < entry.bytes ? {...entry, bytes: size} : entry;
      if (size < entry.bytes) changes.push(`tightened ${file} ${entry.bytes} -> ${size} B`);
    }
  }
  return {baseline: {...baseline, files: next}, changes};
}

function git(args, {cwd, input} = {}) {
  const result = spawnSync('git', args, {cwd, input, encoding: 'utf8', maxBuffer: 256 * MiB});
  if (result.status !== 0) throw Error(`git ${args.join(' ')} failed: ${result.stderr.trim()}`);
  return result.stdout;
}
const lines = text => text.split('\n').filter(Boolean);
const ZERO = /^0+$/;

/* Tracked plus untracked-but-unignored files, sized from the working tree. */
export function workingTree(cwd) {
  const files = [];
  for (const file of lines(git(['ls-files', '-z', '--cached', '--others', '--exclude-standard'], {cwd}).replace(/\0/g, '\n'))) {
    let stat;
    try { stat = fs.lstatSync(path.join(cwd, file)); } catch { continue; }
    if (stat.isFile()) files.push({path: file, size: stat.size});
  }
  return [...new Map(files.map(file => [file.path, file])).values()];
}

/* Parses "<meta>\t<path>" records whose meta ends in "<type> … <size>"-style fields. */
const blobs = (records, typeAt, sizeAt) => records.flatMap(record => {
  const tab = record.indexOf('\t'), meta = record.slice(0, tab).trim().split(/\s+/);
  return tab > 0 && meta[typeAt] === 'blob' ? [{path: record.slice(tab + 1), size: Number(meta[sizeAt])}] : [];
});

/* Every file in a commit's tree. ls-tree -l records: "<mode> <type> <sha> <size>\t<path>". */
export const treeAt = (commit, cwd) => blobs(git(['ls-tree', '-r', '-l', '-z', commit], {cwd}).split('\0'), 1, 3);

/* Blobs reachable from revs (e.g. "<sha> --not --remotes"), i.e. everything a push would send. */
export function newBlobs(revs, cwd) {
  const objects = git(['rev-list', '--objects', ...revs], {cwd});
  return blobs(lines(git(['cat-file', '--batch-check=%(objecttype) %(objectsize)\t%(rest)'], {cwd, input: objects})), 0, 1);
}

export function readBaseline(text) {
  const baseline = JSON.parse(text);
  if (!baseline || typeof baseline.files !== 'object') throw Error(`${BASELINE} must have a "files" object`);
  return baseline;
}
const baselineAt = (commit, cwd) => {
  const result = spawnSync('git', ['show', `${commit}:${BASELINE}`], {cwd, encoding: 'utf8'});
  return result.status === 0 ? readBaseline(result.stdout) : {files: {}};
};

/* stdin lines: "<local ref> <local sha> <remote ref> <remote sha>" */
export function prePush(stdin, cwd) {
  const problems = [];
  for (const line of lines(stdin)) {
    const [, local, , remote] = line.trim().split(/\s+/);
    if (!local || ZERO.test(local)) continue; // deleting a remote ref sends nothing
    const known = remote && !ZERO.test(remote) && spawnSync('git', ['cat-file', '-e', remote + '^{commit}'], {cwd}).status === 0;
    const revs = [local, '--not', '--remotes', ...(known ? [remote] : [])];
    const baseline = baselineAt(local, cwd), label = git(['rev-parse', '--short', local], {cwd}).trim();
    const found = [...evaluate(newBlobs(revs, cwd), baseline), ...evaluate(treeAt(local, cwd), baseline, {stale: true})];
    for (const problem of new Set(found)) problems.push(`${label} ${problem}`);
  }
  return problems;
}

export function installHook(cwd) {
  const inside = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], {cwd, encoding: 'utf8'});
  if (inside.status !== 0 || !fs.existsSync(path.join(cwd, HOOKS))) return 'Not a git checkout; skipped hook install.';
  const current = spawnSync('git', ['config', '--get', 'core.hooksPath'], {cwd, encoding: 'utf8'}).stdout.trim();
  if (current && current !== HOOKS) return `core.hooksPath is already ${current}; leaving it. Run ${HOOKS}/pre-push from your own hook to check file sizes.`;
  if (!current) git(['config', 'core.hooksPath', HOOKS], {cwd});
  return `Git hooks: core.hooksPath = ${HOOKS}`;
}

function report(problems, context) {
  if (!problems.length) return 0;
  console.error(`File size check failed (${context}):\n` + problems.map(problem => '  ' + problem).join('\n'));
  console.error(`\nLimits are in scripts/check-file-sizes.mjs. Shrink or remove the file, or, if it must be this size,\n` +
    `run "npm run sizes -- --accept <path>" and add a "note" to its entry in ${BASELINE}.`);
  return 1;
}

function main(argv) {
  const cwd = git(['rev-parse', '--show-toplevel'], {cwd: path.dirname(fileURLToPath(import.meta.url))}).trim();
  const file = path.join(cwd, BASELINE), [mode, ...rest] = argv;
  if (mode === '--install-hook') { console.log(installHook(cwd)); return 0; }
  if (mode === '--pre-push') return report(prePush(fs.readFileSync(0, 'utf8'), cwd), 'pre-push');
  const baseline = fs.existsSync(file) ? readBaseline(fs.readFileSync(file, 'utf8')) : {files: {}}, files = workingTree(cwd);
  const save = next => fs.writeFileSync(file, JSON.stringify(next, null, 2) + '\n');
  if (mode === '--update') {
    const {baseline: next, changes} = tighten(files, baseline);
    save(next);
    console.log(changes.length ? changes.join('\n') : 'Baseline already tight.');
    return report(evaluate(files, next, {stale: true}), 'after --update');
  }
  if (mode === '--accept') {
    if (!rest.length) throw Error('--accept needs at least one path');
    const sizes = new Map(files.map(entry => [entry.path, entry.size])), next = {...baseline, files: {...baseline.files}};
    for (const target of rest) {
      const key = path.relative(cwd, path.resolve(target)).split(path.sep).join('/'), size = sizes.get(key);
      if (size === undefined) throw Error(`${key} is not a tracked or unignored file`);
      if (size > CEILING) throw Error(`${key} is ${human(size)}, above the ${human(CEILING)} ceiling`);
      if (size <= ruleFor(key).limit) { console.log(`${key} is within its limit; nothing to accept.`); continue; }
      next.files[key] = {...next.files[key], bytes: size};
      console.log(`accepted ${key} at ${size} B`);
    }
    next.files = Object.fromEntries(Object.entries(next.files).sort(([a], [b]) => a.localeCompare(b)));
    save(next);
    return 0;
  }
  if (mode) throw Error(`Unknown option ${mode}`);
  const status = report(evaluate(files, baseline, {stale: true}), 'working tree');
  if (!status) console.log(`File sizes are within limits (${files.length} files, ${Object.keys(baseline.files).length} baselined).`);
  return status;
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { process.exitCode = main(process.argv.slice(2)); } catch (error) { console.error(error.message); process.exitCode = 2; }
}
