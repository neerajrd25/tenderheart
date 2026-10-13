import { execSync } from 'node:child_process';
import { existsSync, rmSync, mkdirSync, cpSync, copyFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..');
const buildDir = path.join(backendRoot, '.build', 'lambda');

const EXCLUDED_PATH_SEGMENTS = ['src/tests', 'node_modules', '.env'];

function isExcluded(src) {
  const relative = path.relative(backendRoot, src).replace(/\\/g, '/');
  return EXCLUDED_PATH_SEGMENTS.some(
    (segment) => relative === segment || relative.startsWith(`${segment}/`)
  );
}

console.log('Cleaning build directory:', buildDir);
rmSync(buildDir, { recursive: true, force: true });
mkdirSync(buildDir, { recursive: true });

console.log('Copying src/ ...');
cpSync(path.join(backendRoot, 'src'), path.join(buildDir, 'src'), {
  recursive: true,
  filter: (src) => !isExcluded(src),
});

console.log('Copying package files ...');
copyFileSync(path.join(backendRoot, 'package.json'), path.join(buildDir, 'package.json'));

const lockFile = path.join(backendRoot, 'package-lock.json');
if (existsSync(lockFile)) {
  copyFileSync(lockFile, path.join(buildDir, 'package-lock.json'));
}

console.log('Installing production dependencies in staged package ...');
execSync('npm ci --omit=dev --no-audit --no-fund', {
  cwd: buildDir,
  stdio: 'inherit',
});

console.log(`Lambda package staged at ${buildDir}`);
