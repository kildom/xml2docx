import * as fs from 'fs';
import { unZip } from "../../src/unzip";
import { isDirectExecution } from './common';
import { createHash } from 'node:crypto';

async function extractContent(fileName: string) {
    let entries = await unZip(fs.readFileSync(fileName), name => !name.endsWith('/'));
    let res: { [name: string]: string } = {};
    for (let entry of entries) {
        if (entry.fileName.endsWith('.xml') || entry.fileName.endsWith('.rels')) {
            let text = new TextDecoder().decode(entry.read());
            text = text.replace(/[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}.[0-9]{3}Z/g, '--DATE--');
            if (entry.fileName.endsWith('/fontTable.xml')) {
                text = text.replace(/\{[a-f0-9-]{36}\}/gi, '{00000000-0000-0000-0000-000000000000}');
            }
            res[entry.fileName] = text;
        } else {
            let content = entry.read();
            if (entry.fileName.includes('font') || entry.fileName.includes('ttf')) {
                content = content.subarray(32);
            }
            res[entry.fileName] = createHash('SHA256')
                .update(content)
                .digest('base64');
        }
    }
    let keys = Object.keys(res).sort();
    let sortedRes: { [name: string]: string } = {};
    for (let key of keys) {
        sortedRes[key] = res[key];
    }
    return sortedRes;
}

export async function compareDocxFiles(file1: string, file2: string): Promise<string | undefined> {

    let exists1 = fs.existsSync(file1);
    let exists2 = fs.existsSync(file2);
    if (!exists1 && exists2) return 'missing';
    if (exists1 && !exists2) return 'missing';
    if (!exists1 && !exists2) return undefined;
    let zip1 = await extractContent(file1);
    let zip2 = await extractContent(file2);
    for (let name in zip1) {
        if (zip1[name] !== zip2[name]) {
            return `docx:${name}`;
        }
    }
    let json1 = JSON.stringify(zip1);
    let json2 = JSON.stringify(zip2);
    return json1 === json2 ? undefined : 'docx';
}


(typeof __RUN_SELF_TEST__ === 'boolean' ? __RUN_SELF_TEST__ : isDirectExecution(import.meta.url)) && (async () => {
    const path = await import('node:path');
    const child_process = await import('node:child_process');
    let args = [];
    fs.mkdirSync('test/outputs/_tmp', { recursive: true });
    fs.writeFileSync('test/outputs/_tmp/a.doctml', 'a');
    fs.writeFileSync('test/outputs/_tmp/b.doctml', 'b');
    fs.writeFileSync('test/outputs/_tmp/a2.doctml', '<document> <p> a </p> </document>');
    child_process.spawnSync('dist/deno-compile/x64-linux/doctml', ['test/outputs/_tmp/a.doctml', 'test/outputs/_tmp/a.docx'], { stdio: 'inherit' });
    child_process.spawnSync('dist/deno-compile/x64-linux/doctml', ['test/outputs/_tmp/b.doctml', 'test/outputs/_tmp/b.docx'], { stdio: 'inherit' });
    child_process.spawnSync('dist/deno-compile/x64-linux/doctml', ['test/outputs/_tmp/a2.doctml', 'test/outputs/_tmp/a2.docx'], { stdio: 'inherit' });
    console.log(await compareDocxFiles('test/outputs/_tmp/a.docx', 'test/outputs/_tmp/b.docx'));
    console.log(await compareDocxFiles('test/outputs/_tmp/a.docx', 'test/outputs/_tmp/a2.docx'));
    console.log(await compareDocxFiles('test/outputs/_tmp/a2.docx', 'test/outputs/_tmp/b.docx'));
    console.log('Self test PASSED');
})();
