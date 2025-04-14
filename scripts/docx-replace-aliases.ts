

import fs from 'node:fs';

for (let file of fs.readdirSync('node_modules/docx/src', {recursive: true}) as string[]) {
    if (!file.endsWith('.ts')) continue;
    if (file.endsWith('.spec.ts')) continue;
    let contentSource = fs.readFileSync('node_modules/docx/src/' + file, 'utf8');
    let content = contentSource;
    let levels = file.split('/').length - 1;
    let rootRelative = '../'.repeat(levels);
    content = content
        .replace(/from "@file\//g, `from "./${rootRelative}file/`)
        .replace(/from "@export\//g, `from "./${rootRelative}export/`)
        .replace(/from "@util\//g, `from "./${rootRelative}util/`);
    if (content != contentSource) {
        fs.writeFileSync('node_modules/docx/src/' + file, content);
    }
}
