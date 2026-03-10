import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Test } from './test-reader';

let CUR = 'test/outputs/cur';

declare global {
    const __RUN_SELF_TEST__: boolean | undefined;
}

export function isDirectExecution(metaUrl: string): boolean {
    const nodeArgvEntry = process.argv[1];
    if (!nodeArgvEntry) {
        return false;
    }
    const entryUrl = pathToFileURL(path.resolve(nodeArgvEntry)).href;
    return metaUrl === entryUrl;
}

export function mkdir(path: string) {
    fs.mkdirSync(path, { recursive: true });
}

export function mkdirFor(file: string) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
}

function idFromParam(testOrId: any): string {
    return (typeof testOrId === 'string') ? testOrId : testOrId.id;
}

function getRoot(root?: string): string {
    if (!root) {
        return CUR;
    } else if (root.indexOf('/') >= 0 || root.indexOf('\\') >= 0) {
        return root;
    } else {
        return path.join('test/outputs', root);
    }
}

export function setOutputPath(path: string) {
    CUR = path;
}

export function outputRootDir(root?: string): string {
    return getRoot(root);
}

export function doctmlFileName(testOrId: any, root?: string) {
    return `${getRoot(root)}/${idFromParam(testOrId)}.doctml`;
}

export function dataFileName(testOrId: any, root?: string) {
    return `${getRoot(root)}/${idFromParam(testOrId)}.json`;
}

export function infoFileName(testOrId: any, root?: string) {
    return `${getRoot(root)}/${idFromParam(testOrId)}.info.json`;
}

export function docxFileName(testOrId: any, root?: string) {
    return `${getRoot(root)}/${idFromParam(testOrId)}.docx`;
}

export function pdfFileName(testOrId: any, root?: string) {
    return `${getRoot(root)}/${idFromParam(testOrId)}.pdf`;
}

export function htmlFileName(testOrId: any, root?: string) {
    return `${getRoot(root)}/${idFromParam(testOrId)}.html`;
}

export function diffHtmlFileName(testOrId: any, root?: string) {
    return `${getRoot(root)}/${idFromParam(testOrId)}.html.diff`;
}

export function pngFileName(testOrId: any, root?: string) {
    return `${getRoot(root)}/${idFromParam(testOrId)}.png`;
}

export function diffPngFileName(testOrId: any, root?: string) {
    return `${getRoot(root)}/${idFromParam(testOrId)}.diff.png`;
}

export function errorFileName(testOrId: any, root?: string) {
    return `${getRoot(root)}/${idFromParam(testOrId)}.error.txt`;
}

export function debugFilesName(testOrId: any, root?: string): { [type: string]: string } {
    let id = idFromParam(testOrId);
    let result: { [type: string]: string } = {};
    for (let file of fs.readdirSync(getRoot(root), { encoding: 'utf-8' })) {
        if (file.startsWith(`${id}.debug.`)) {
            let type = file.substring(`${id}.debug.`.length);
            result[type] = path.join(getRoot(root), file);
        }
    }
    return result;
}

export function removeTest(testOrId: any, root?: string) {
    let id = idFromParam(testOrId);
    let filesToRemove: string[] = [];
    let prefix = `${id}.`;
    for (let file of fs.readdirSync(getRoot(root), { encoding: 'utf-8' })) {
        if (file.startsWith(prefix)) {
            filesToRemove.push(path.join(getRoot(root), file));
        }
    }
    for (let file of filesToRemove) {
        fs.rmSync(file);
    }
}

export function cloneTest(source: any, dest: string, root?: string) {
    let sourceId = idFromParam(source);
    let destId = idFromParam(dest);
    let filesToCopy: { [from: string]: string } = {};
    let sourcePrefix = `${sourceId}.`;
    let destPrefix = `${destId}.`;
    for (let file of fs.readdirSync(getRoot(root), { encoding: 'utf-8' })) {
        if (file.startsWith(sourcePrefix)) {
            filesToCopy[path.join(getRoot(root), file)] = path.join(getRoot(root), file.replace(sourcePrefix, destPrefix));
        }
    }
    for (let [from, to] of Object.entries(filesToCopy)) {
        fs.copyFileSync(from, to);
    }
    let test = infoFileContent(dest, root);
    test.id = destId;
    fs.writeFileSync(infoFileName(dest, root), JSON.stringify(test, null, 2), 'utf-8');
}

export function appendError(testOrId: any, errorText: string, root?: string) {
    let errorFile = errorFileName(testOrId, root);
    fs.appendFileSync(errorFile, errorText + '\n');
}

export function cloneTestInput(source: any, dest: string, root?: string) {
    let sourceId = idFromParam(source);
    let destId = idFromParam(dest);
    let filesToCopy = {
        [`${getRoot(root)}/${sourceId}.doctml`]: `${getRoot(root)}/${destId}.doctml`,
        [`${getRoot(root)}/${sourceId}.json`]: `${getRoot(root)}/${destId}.json`,
        [`${getRoot(root)}/${sourceId}.info.json`]: `${getRoot(root)}/${destId}.info.json`,
    };
    for (let [from, to] of Object.entries(filesToCopy)) {
        if (fs.existsSync(from)) {
            fs.copyFileSync(from, to);
        }
    }
}

export function doctmlFileContent(testOrId: any, root?: string) {
    return fs.readFileSync(doctmlFileName(testOrId, root), 'utf-8');
}

export function dataFileContent(testOrId: any, root?: string): string {
    return fs.readFileSync(dataFileName(testOrId, root), 'utf-8');
}

export function infoFileContent(testOrId: any, root?: string): Test {
    return JSON.parse(fs.readFileSync(infoFileName(testOrId, root), 'utf-8'));
}

export function errorFileContent(testOrId: any, root?: string): string {
    return fs.readFileSync(errorFileName(testOrId, root), 'utf-8');
}

export function htmlFileContent(testOrId: any, root?: string): string {
    return fs.readFileSync(htmlFileName(testOrId, root), 'utf-8');
}

export function diffHtmlFileContent(testOrId: any, root?: string) {
    return fs.readFileSync(diffHtmlFileName(testOrId, root), 'utf-8');
}

export function debugFilesContent(testOrId: any, root?: string): { [type: string]: string } {
    let result = debugFilesName(testOrId, root);
    for (let type in result) {
        result[type] = fs.readFileSync(result[type], 'utf-8');
    }
    return result;
}

export function isTestCase(name: string): boolean {
    return /\.[a-z0-9]{16}(?:-[a-z0-9]+)?\.doctml$/.test(name);
}

export function isTestSuite(name: string): boolean {
    return name.endsWith('.doctml') && !/\.[a-z0-9]{16}(?:-[a-z0-9]+)?\./.test(name);
}

export function listTests(root?: string): string[] {
    let result: string[] = [];
    for (let file of fs.readdirSync(getRoot(root), { encoding: 'utf-8' })) {
        if (!isTestCase(file)) {
            continue;
        }
        result.push(file.replace('.doctml', ''));
    }
    return result;
}

export function listTestsGrouped(root?: string): { [key: string]: string[] } {
    let result: { [key: string]: string[] } = {};
    for (let file of fs.readdirSync(getRoot(root), { encoding: 'utf-8' })) {
        if (!isTestCase(file)) {
            continue;
        }
        let id = file.replace('.doctml', '');
        let parts = id.split('-');
        if (parts.at(-1)!.length > 10) {
            result[id] = [id];
        } else {
            let baseId = parts.slice(0, -1).join('-');
            result[baseId] = result[baseId] ?? [];
            result[baseId].push(id);
        }
    }
    return result;
}

export function reportFileNameNoExt(root?: string) {
    return getRoot(root);
}

export function getArgs(): { args: string[]; files: string[]; runners: string[] } {
    let args: string[] = [];
    let files: string[] = [];
    let runners: string[] = [];
    for (let i = 2; i < process.argv.length; i++) {
        if (process.argv[i] === '-f' || process.argv[i] === '--file') {
            files.push(process.argv[i + 1]);
            i++;
        } else if (process.argv[i].startsWith('-f')) {
            files.push(process.argv[i].substring(2));
        } else if (process.argv[i].startsWith('-f=')) {
            files.push(process.argv[i].substring(3));
        } else if (process.argv[i].startsWith('--file=')) {
            files.push(process.argv[i].substring(7));
        } else if (process.argv[i] === '-r' || process.argv[i] === '--runner') {
            runners.push(process.argv[i + 1]);
            i++;
        } else if (process.argv[i].startsWith('-r')) {
            runners.push(process.argv[i].substring(2));
        } else if (process.argv[i].startsWith('-r=')) {
            runners.push(process.argv[i].substring(3));
        } else if (process.argv[i].startsWith('--runner=')) {
            runners.push(process.argv[i].substring(9));
        } else {
            args.push(process.argv[i]);
        }
    }
    return { args, files, runners };
}

export function processErrors(id: string, root?: string): { success: boolean, errorHtml: string } {

    function escapeRegExp(string: string): string {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function escapeHtml(string: string): string {
        return string.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    let test = infoFileContent(id, root);
    let expectedErrors = test.expectedErrors;
    let remainingErrors = new Set(expectedErrors);
    let currentErrors = errorFileContent(id, root).trim().split('\n').filter(line => line.trim());
    let unexpectedErrors = [...currentErrors];
    for (let expectedError of expectedErrors) {
        let pattern = new RegExp('(' + escapeRegExp(expectedError) + ')');
        for (let i = 0; i < currentErrors.length; i++) {
            if (pattern.test(currentErrors[i])) {
                remainingErrors.delete(expectedError);
                unexpectedErrors[i] = '';
                currentErrors[i] = currentErrors[i].replace(pattern, '#####mark_begin#####$1#####mark_end#####');
            }
        }
    }
    let success = (unexpectedErrors.join('').trim().length === 0 && remainingErrors.size === 0);
    for (let remaining of remainingErrors) {
        currentErrors.push(`Expected error not found: ${remaining}`);
    }
    let errorHtml = escapeHtml(currentErrors.join('\n'))
        .replace(/#####mark_begin#####/g, '<span class="expected-error">')
        .replace(/#####mark_end#####/g, '</span>');
    return { success, errorHtml };
}
