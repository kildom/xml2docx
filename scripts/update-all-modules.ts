import * as child_process from 'node:child_process';
import * as fs from 'node:fs';
import process from 'node:process';

type PackageManifest = {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    [key: string]: unknown;
};

function exec(...command: string[]): void {
    if (process.platform.startsWith('win')) {
        command.unshift('cmd', '/c');
    }

    const res = child_process.spawnSync(command[0], command.slice(1), { stdio: 'inherit' });
    if (res.error) throw res.error;
    if (res.status !== 0) throw new Error(`Program status: ${res.status}`);
}

// Remove node_modules and package-lock.json
console.log('Removing files...');
fs.rmSync('node_modules', { recursive: true, force: true });
fs.rmSync('package-lock.json', { force: true });

// Remove dependencies from package.json
console.log('Removing dependencies from package.json...');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')) as PackageManifest;
const dependencies = Object.keys(pkg.dependencies!);
const devDependencies = Object.keys(pkg.devDependencies!);
delete pkg.dependencies;
delete pkg.devDependencies;
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 4).replace(/\r?\n/g, '\n'));

// Install dependencies again
console.log('Installing dependencies:', ...dependencies, '...');
exec('npm', 'install', '--save', ...dependencies);
console.log('Installing development dependencies:', ...devDependencies, '...');
exec('npm', 'install', '--save-dev', ...devDependencies);

// Show audit results
console.log('Audit results');
exec('npm', 'audit');
