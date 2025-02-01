import fs from 'fs';
import child_process from 'node:child_process';


const targets:{[key:string]:[string, string, string[]]} = {
    'x86_64-win': [ 'x86_64-pc-windows-msvc', '.exe', ['--icon', '../../scripts/icon.ico']],
    'x86_64-macos': [ 'x86_64-apple-darwin', '', []],
    'aarch64-macos': [ 'aarch64-apple-darwin', '', []],
    'x86_64-linux': [ 'x86_64-unknown-linux-gnu', '', []],
    'aarch64-linux': [ 'aarch64-unknown-linux-gnu', '', []],
};


fs.mkdirSync('dist/deno-compile', { recursive: true });
fs.copyFileSync('scripts/build-deno-package.json', 'dist/deno-compile/package.json');
fs.copyFileSync('dist/cli/doctml.cjs', 'dist/deno-compile/doctml.cjs');
fs.copyFileSync('dist/cli/license.txt', 'dist/deno-compile/license.txt');
fs.copyFileSync('dist/version.json', 'dist/deno-compile/version.json');


function compile(dir: string, target: string, suffix: string, args: string[]): void {

    let res = child_process.spawnSync(
        'deno',
        [
            'compile',
            '--allow-read', '--allow-write', '--allow-env',
            ...args,
            '--node-modules-dir=auto',
            '--include', 'license.txt',
            '--include', 'version.json',
            '-o', `${dir}/doctml${suffix}`,
            '--target', target, 'doctml.cjs',
        ],
        {
            cwd: 'dist/deno-compile',
            stdio: 'inherit',
        }
    );

    if (res.error) throw res.error;
    if (res.status !== 0) throw new Error(`Deno compile status: ${res.status}`);
}


for (let [dir, info] of Object.entries(targets)) {
    compile(dir, info[0], info[1], info[2]);
}
