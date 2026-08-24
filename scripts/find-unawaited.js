/**
 * Finds database calls that are not awaited.
 *
 *   node scripts/find-unawaited.js server/src
 *
 * The database client is async. An un-awaited call does not merely return the
 * wrong value — the rejected promise is unhandled, and Node kills the process,
 * so the endpoint returns 502 and takes every other request down with it.
 *
 * Neither tsc nor grep finds these. A discarded .run() result type-checks; a
 * .get() result handed to res.json() type-checks because res.json takes any;
 * and `while (stmt.get(x))` type-checks while looping forever, because a
 * Promise is always truthy.
 */
const fs = require('fs');
const path = require('path');

const root = process.argv[2] || 'src';

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (entry.name.endsWith('.ts')) out.push(p);
  }
  return out;
}

const findings = [];

for (const file of walk(root)) {
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split(/\r?\n/);
  const callRe = /\.(get|all|run)\s*\(/g;
  let m;

  while ((m = callRe.exec(src)) !== null) {
    const before = src.slice(Math.max(0, m.index - 400), m.index);

    // Where does this expression chain begin — a db.prepare(...) or a
    // module-level statement handle?
    const stmtMatch = before.match(/stmt[A-Za-z0-9_]*(?![\s\S]*stmt[A-Za-z0-9_]*)/);
    const chainIdx = Math.max(
      before.lastIndexOf('db.prepare'),
      before.lastIndexOf('db\n'),
      stmtMatch ? before.lastIndexOf(stmtMatch[0]) : -1,
    );
    if (chainIdx < 0) continue;   // Map.get, array method, etc.

    // Awaited?
    if (/await\s*$/.test(before.slice(Math.max(0, chainIdx - 12), chainIdx))) continue;

    // Statement handles are DEFINED with db.prepare(...) at module level.
    // Those definitions execute nothing and need no await.
    const lineNo = src.slice(0, m.index).split(/\r?\n/).length;
    const lineText = lines[lineNo - 1] ?? '';
    if (/^\s*(const|let|var)\s+stmt/i.test(lineText)) continue;
    if (/^\s*router\.(get|post|put|patch|delete)\s*\(/.test(lineText)) continue;

    findings.push({
      file: path.relative(process.cwd(), file).replace(/\\/g, '/'),
      line: lineNo,
      text: lineText.trim().slice(0, 95),
    });
  }
}

if (findings.length === 0) {
  console.log('No un-awaited database calls found.');
  process.exit(0);
}

console.log(`${findings.length} un-awaited database call(s):\n`);
for (const f of findings) console.log(`  ${f.file}:${f.line}\n      ${f.text}`);
process.exit(1);
