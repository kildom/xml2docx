

import * as child_process from 'node:child_process';
import * as fs from 'node:fs';

/*
Used commands:

List tags:
    git log --tags --no-walk --simplify-by-decoration --pretty=format:"%H %ad %d" --date-order --date=raw

Get current commit:
    git log --no-walk --simplify-by-decoration --pretty=format:"%H %ad %d" --date=raw HEAD

Check if there are any uncommitted changes:
    git diff --quiet HEAD

Output JSON:
    {
        "commit": "aaaaaaaaaaaaaaaaaaaaaaaa",
        "time": 1705786065,
        "tag": {
            "name": "v1.0.0",
            "commit": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
            "time": 1705786065,
        },
        "dirty": false
    }

*/

/* ==================================================================== *\
|    Get latest tag information                                          |
\* ==================================================================== */

let res1 = child_process.spawnSync(
    'git',
    [
        'log', '--tags', '--no-walk', '--simplify-by-decoration',
        '--pretty=format:%H %ad %d', '--date-order', '--date=raw'
    ],
    {
        stdio: 'pipe',
        encoding: 'utf-8',
        input: '',
    }
);

if (res1.error) throw res1.error;
if (res1.status !== 0) throw new Error(`Git error: ${res1.status}\n${res1.stdout}${res1.stderr}`);

let m = res1.stdout.match(/([0-9a-f]+)\s+(\d+).*?tag:\s*([a-z0-9._-]+)/);
if (!m) throw new Error('No tags found');

let tagCommit = m[1];
let tagTime = parseInt(m[2]);
let tagName = m[3];

/* ==================================================================== *\
|    Check local modifications                                           |
\* ==================================================================== */

let res2 = child_process.spawnSync('git', ['diff', '--quiet', 'HEAD'], { stdio: 'inherit' });

if (res2.error) throw res1.error;
if ((res2.status ?? 100) > 1) throw new Error(`Git error: ${res1.status}\n${res1.stdout}${res1.stderr}`);

let dirty = (res2.status === 1);

/* ==================================================================== *\
|    Get current HEAD commit                                             |
\* ==================================================================== */

let res3 = child_process.spawnSync(
    'git',
    [
        'log', '--no-walk', '--simplify-by-decoration',
        '--pretty=format:%H %ad %d', '--date=raw', 'HEAD',
    ],
    {
        stdio: 'pipe',
        encoding: 'utf-8',
        input: '',
    }
);
if (res3.error) throw res3.error;
if (res3.status !== 0) throw new Error(`Git error: ${res3.status}\n${res3.stdout}${res3.stderr}`);

m = res3.stdout.match(/([0-9a-f]+)\s+(\d+)/);
if (!m) throw new Error('No tags found');

let headCommit = m[1];
let headTime = parseInt(m[2]);

/* ==================================================================== *\
|    Write result                                                        |
\* ==================================================================== */

let result = {
    commit: headCommit,
    time: headTime,
    tag: {
        name: tagName,
        commit: tagCommit,
        time: tagTime,
    },
    dirty: dirty,
};

fs.writeFileSync('dist/version.json', JSON.stringify(result, null, 4));
