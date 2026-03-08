import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Test } from './test-reader';

const CUR = 'test/outputs/cur';
const REF = 'test/outputs/ref';

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

export function outputRootDir(): string {
    return CUR;
}

export function doctmlFileName(testOrId: any) {
    return `${CUR}/${idFromParam(testOrId)}.doctml`;
}

export function dataFileName(testOrId: any) {
    return `${CUR}/${idFromParam(testOrId)}.json`;
}

export function infoFileName(testOrId: any) {
    return `${CUR}/${idFromParam(testOrId)}.info.json`;
}

export function docxFileName(testOrId: any) {
    return `${CUR}/${idFromParam(testOrId)}.docx`;
}

export function pdfFileName(testOrId: any) {
    return `${CUR}/${idFromParam(testOrId)}.pdf`;
}

export function htmlFileName(testOrId: any) {
    return `${CUR}/${idFromParam(testOrId)}.html`;
}

export function pngFileName(testOrId: any) {
    return `${CUR}/${idFromParam(testOrId)}.png`;
}

export function errorFileName(testOrId: any) {
    return `${CUR}/${idFromParam(testOrId)}.error.txt`;
}

export function debugFilesName(testOrId: any): { [type: string]: string } {
    let id = idFromParam(testOrId);
    let result: { [type: string]: string } = {};
    for (let file of fs.readdirSync(CUR, { encoding: 'utf-8' })) {
        if (file.startsWith(`${id}.debug.`)) {
            let type = file.substring(`${id}.debug.`.length);
            result[type] = path.join(CUR, file);
        }
    }
    return result;
}

export function removeTest(testOrId: any) {
    let id = idFromParam(testOrId);
    let filesToRemove: string[] = [];
    let prefix = `${id}.`;
    for (let file of fs.readdirSync(CUR, { encoding: 'utf-8' })) {
        if (file.startsWith(prefix)) {
            filesToRemove.push(path.join(CUR, file));
        }
    }
    for (let file of filesToRemove) {
        fs.rmSync(file);
    }
}

export function cloneTest(source: any, dest: string) {
    let sourceId = idFromParam(source);
    let destId = idFromParam(dest);
    let filesToCopy: { [from: string]: string } = {};
    let sourcePrefix = `${sourceId}.`;
    let destPrefix = `${destId}.`;
    for (let file of fs.readdirSync(CUR, { encoding: 'utf-8' })) {
        if (file.startsWith(sourcePrefix)) {
            filesToCopy[path.join(CUR, file)] = path.join(CUR, file.replace(sourcePrefix, destPrefix));
        }
    }
    for (let [from, to] of Object.entries(filesToCopy)) {
        fs.copyFileSync(from, to);
    }
}

export function appendError(testOrId: any, errorText: string) {
    let errorFile = errorFileName(testOrId);
    fs.appendFileSync(errorFile, errorText + '\n');
}

export function cloneTestInput(source: any, dest: string) {
    let sourceId = idFromParam(source);
    let destId = idFromParam(dest);
    let filesToCopy = {
        [`${CUR}/${sourceId}.doctml`]: `${CUR}/${destId}.doctml`,
        [`${CUR}/${sourceId}.json`]: `${CUR}/${destId}.json`,
        [`${CUR}/${sourceId}.info.json`]: `${CUR}/${destId}.info.json`,
    };
    for (let [from, to] of Object.entries(filesToCopy)) {
        if (fs.existsSync(from)) {
            fs.copyFileSync(from, to);
        }
    }
}

export function doctmlFileContent(testOrId: any) {
    return fs.readFileSync(doctmlFileName(testOrId), 'utf-8');
}

export function dataFileContent(testOrId: any) {
    return fs.readFileSync(dataFileName(testOrId), 'utf-8');
}

export function infoFileContent(testOrId: any): Test {
    return JSON.parse(fs.readFileSync(infoFileName(testOrId), 'utf-8'));
}

export function errorFileContent(testOrId: any): string {
    return fs.readFileSync(errorFileName(testOrId), 'utf-8');
}

export function htmlFileContent(testOrId: any): string {
    return fs.readFileSync(htmlFileName(testOrId), 'utf-8');
}

export function debugFilesContent(testOrId: any): { [type: string]: string } {
    let result = debugFilesName(testOrId);
    for (let type in result) {
        result[type] = fs.readFileSync(result[type], 'utf-8');
    }
    return result;
}

export function listTests(): string[] {
    let result: string[] = [];
    for (let file of fs.readdirSync(CUR, { encoding: 'utf-8' })) {
        if (!file.endsWith('.doctml') || file.indexOf('.debug.') !== -1) {
            continue;
        }
        result.push(file.replace('.doctml', ''));
    }
    return result;
}

export function listTestsGrouped(): { [key: string]: string[] } {
    let result: { [key: string]: string[] } = {};
    for (let file of fs.readdirSync(CUR, { encoding: 'utf-8' })) {
        if (!file.endsWith('.doctml') || file.indexOf('.debug.') !== -1) {
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

export function reportFileNameNoExt() {
    return `${CUR}/../cur`;
}
