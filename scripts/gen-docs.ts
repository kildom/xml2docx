
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as docx from 'docx';
import * as enums from '../src/enums';

const API_URL = 'https://docx.js.org/api/';
const API_EXTENSION = '.html';

/*

/*>>> Subject

//* item

/*> Subject continuation

*/

//                /             entry: $1 - text, $2 - code                       |     note: $3 - text         |                         item: $4 - text, $5 - code                                          /
const codeParse = /\/\*>>>(?<entryText>.+?)\*\/\s*?\r?\n(?<entryCode>.+?)(?=\r?\n)|\/\*>(?<noteText>[^>].*?)\*\/|(?<itemText>\/\/\*.+?\r?\n(?:[\t ]*\/\/\*.+?\r?\n)*)(?<itemCode>[\t ]*(?!\/\/\*).*?)(?=\r?\n)/gis;
interface CodeParse { entryText?: string; entryCode?: string; noteText?: string; itemText?: string; itemCode?: string; };

interface Item {
    type: 'item';
    name?: string;
    required: boolean;
    short?: string;
    text: string;
    code: string;
};

interface Note {
    type: 'note';
    text: string;
};

interface Entry {
    name: string;
    short: string;
    text: string;
    items: (Item | Note)[];
};

let entries: { [key: string]: Entry } = {};
let lastEntry: Entry | undefined = undefined;

function removeCommonIndent(text: string): string {
    let lines = text.split(/\r?\n/);
    let indent: string | null = null;
    for (let line of lines) {
        if (!line.trim()) continue;
        if (indent === null) {
            indent = line.substring(0, line.length - line.trimStart().length);
        }
        while (indent.length > 0 && !line.startsWith(indent)) {
            indent = indent.substring(0, indent.length - 1);
        }
    }
    return lines.map(line => line.substring(indent?.length || 0)).join('\n');
}

function parseEntry(text: string, code: string) {

    const entryHeaderParse = /^[\t ]*(?<name>[a-z0-9_]+[\t ]*)?(?::(?<short>[^\n]*))?/is;
    interface EntryHeaderParse { name?: string; short?: string; };

    const functionParse = /function\s+(?<name>[a-z0-9_]+)/is;
    interface FunctionParse { name?: string; };

    let m = text.match(entryHeaderParse);
    if (!m) throw new Error(`Invalid entry header: ${text}\n${code}`);
    let header = m.groups as EntryHeaderParse;
    let remainingText = text.substring(m[0].length);
    let name = header.name?.trim();
    let short = header.short?.trim() || '';

    if (!name) {
        let m = code.match(functionParse);
        if (!m) throw new Error(`Unknown entry name: ${text}\n${code}`);
        name = (m.groups as FunctionParse).name || '';
    }
    remainingText = removeCommonIndent(remainingText);
    if (entries[name]) throw new Error(`Entry ${name} already exists.`);
    lastEntry = {
        name,
        short,
        text: remainingText,
        items: [],
    };
    entries[name] = lastEntry;
}

function parseNote(text: string) {
    lastEntry?.items.push({
        type: 'note',
        text: removeCommonIndent(text),
    });
}

function parseItem(text: string, code: string) {
    text = text.replace(/(?:^|(?<=\n))[\t ]*\/\/\*/gis, '');
    text = removeCommonIndent(text);

    const attributeParse = /attributes(?<forceRequired>!)?\.(?<optionalName>[a-z0-9_]+)|requiredAttribute\(attributes,\s*'(?<requiredName>[a-z0-9_]+)/is;
    interface AttributeParse { forceRequired?: string; optionalName?: string; requiredName?: string; };

    let item: Item = { type: 'item', required: false, text, code };

    if (text.trimStart().startsWith('"')) {
        let text2 = text.trimStart();
        let m = text2.match(/^".*?"/is);
        if (m) {
            item.short = m[0].substring(1, m[0].length - 1);
            item.text = text2.substring(m[0].length).trimStart();
        }
    }

    let m = code.match(attributeParse);
    if (m) {
        let attr = m.groups as AttributeParse;
        item.required = !!(attr.forceRequired || attr.requiredName);
        item.name = attr.optionalName || attr.requiredName;
    }

    lastEntry?.items.push(item);
}

function parseFile(code: string) {
    for (let m of code.matchAll(codeParse)) {
        let g = m.groups as CodeParse;
        if (g?.entryText) {
            parseEntry(g?.entryText, g.entryCode || '');
        } else if (g?.noteText) {
            parseNote(g?.noteText);
        } else if (g?.itemText) {
            parseItem(g?.itemText, g.itemCode || '');
        }
    }
}

function normalizeName(name?: string): string {
    if (name === undefined) throw new Error('Name must be specified.');
    return name
        .replace(/(?<=[a-z])(?=[A-Z])|(?<=[a-zA-Z])(?=[0-9])|(?<=[0-9])(?=[a-zA-Z])|(?<=[A-Z])(?=[A-Z][a-z])|(?<=[a-z][A-Z])(?=[A-Z])/gs, '-')
        .toLowerCase()
        .replace(/[^a-z0-9]+/gs, '-');
}

class Commands {
    static api(cmd: string, param: string, entry: Entry, item?: Item): string {
        if (!param) {
            return `[docx.js API](${API_URL})`;
        } else {
            let p = param.split('/');
            return `[${p.at(-1)}](${API_URL}${param}.html)`;
        }
    }

    static enum(cmd: string, param: string, entry: Entry, item?: Item): string {
        let enumValues: { [key: string]: string[] } = {};
        let [enumNames, indentParam] = param.split('|');
        let indent = indentParam ? ' '.repeat(parseInt(indentParam)) : '';
        for (let enumName of enumNames.split('+')) {
            let enumObj: { [key: string]: string } = (docx as any)[enumName];
            if (!enumObj) {
                enumObj = (enums as any)[enumName];
            }
            if (!enumObj) {
                throw new Error(`Unknown enum ${enumName} in @enum:${enumNames}`);
            }
            for (let [key, value] of Object.entries(enumObj)) {
                if (key.match(/^[0-9]+$/)) continue;
                let set = enumValues[value.toString()] || [];
                set.unshift(normalizeName(key));
                if (typeof (value) === 'string' && !value.match(/^[0-9]+$/)) {
                    set.push(normalizeName(value));
                }
                enumValues[value.toString()] = set;
            }
        }
        let sorted = Object.entries(enumValues);
        sorted.sort((a, b) => a[1][0] < b[1][0] ? -1 : a[1][0] > b[1][0] ? 1 : 0);
        let docList: string[] = [];
        for (let [_, names] of sorted) {
            names = [...new Set(names)];
            if (names.length === 1) {
                docList.push(`\`${names[0]}\``);
            } else if (names.length === 2) {
                docList.push(`\`${names[0]}\` (alias \`${names[1]}\`)`);
            } else {
                docList.push(`\`${names[0]}\` (aliases: \`${names.slice(1).join('`, `')}\`)`);
            }
        }
        return `Enumeration values:\n${indent}* ${docList.join(`\n${indent}* `)}`;
    }

    static short(cmd: string, param: string, entry: Entry, item?: Item): string {
        let src = entries[param];
        //console.log(param);
        if (!src) throw new Error(`Cannot find entry "${param}".`);
        return src.short.trim();
    }

    static atSymbol(cmd: string, param: string, entry: Entry, item?: Item): string {
        let words = item?.code.split(/[^a-z0-9_$]/si).filter(word => word in entries);
        if (!words?.length) throw new Error(`No commands detected: ${item?.code}`);
        if (words.length > 1) throw new Error(`Unambiguous command detection: ${words.join(', ')}`);
        return processCmd(words[0], param, entry, item);
    }

    static merge(cmd: string, param: string, entry: Entry, item?: Item): string {
        let subParams = param.split('|');
        let subEntryName = subParams.shift() as string;
        if (entries[subEntryName] === undefined) {
            throw new Error(`Unknown entry: ${subEntryName}`);
        }
        let subEntry = entries[subEntryName];
        subEntry = processEntry(subEntry, subParams);
        // console.log('----- cmd -----', cmd);
        // console.log('----- param -----', param);
        // console.log('----- entry -----', entry);
        // console.log('----- item -----', item);
        // console.log('----- subEntry -----', subEntry);
        for (let item of subEntry.items) {
            entry.items.push(item);
        }
        if (!entry.short && subEntry.short) {
            entry.short = subEntry.short;
        }
        return subEntry.text;
    }

    static commandFromEntry(cmdEntry: Entry, param: string, entry: Entry, item?: Item): string {
        cmdEntry = processEntry(cmdEntry, param.split('|'));
        if (item && !item.short) {
            item.short = cmdEntry.short;
        }
        let res = cmdEntry.text.trim() + '\n';
        for (let cmdItem of cmdEntry.items) {
            if (cmdItem.type === 'item') {
                res += '* ' + addIndent(cmdItem.text.trim(), '    ').trimStart();
            } else {
                res += '\n' + cmdItem.text;
            }
            res += '\n';
        }
        return res;
    }

    static fallback(cmd: string, param: string, entry: Entry, item?: Item): string {
        if (entries[cmd] !== undefined) {
            let cmdEntry = entries[cmd];
            return Commands.commandFromEntry(cmdEntry, param, entry, item);
        }
        //console.log(`???@${cmd}:${param}???`);
        //return `???@${cmd}:${param}???`; //
        throw new Error(`Invalid command @${cmd}`);
    }
};

function processCmd(cmd: string, param: string, entry: Entry, item?: Item): string {
    let func = (Commands as any)[cmd.replace('@', 'atSymbol')];
    if (!func) {
        return Commands.fallback(cmd, param, entry, item);
    }
    return func(cmd, param, entry, item);
}

const commandRegex = /@([a-z0-9_@]+)(?::([a-z0-9_+\/|-]+))?/gsi;

function processText(text: string, entry: Entry, item: Item | undefined, params: string[]) {
    text = text.replace(/@([0-9])@/gis, (_?: string, index?: string) => params[parseInt(index || '')] || '');
    return text.replace(commandRegex, (_?: string, cmd?: string, param?: string) => {
        return processCmd(cmd || '', param || '', entry, item);
    });
}

function processEntry(entry: Entry, params: string[]): Entry {
    let result: Entry = { ...entry, items: entry.items.map(item => ({ ...item })) };
    result.text = processText(result.text, result, undefined, params);
    for (let item of result.items) {
        if (item.type === 'note') {
            item.text = processText(item.text, result, undefined, params);
        }
    }
    for (let item of result.items) {
        if (item.type === 'item') {
            item.text = processText(item.text, result, item, params);
        }
    }
    return result;
}

function addIndent(text: string, indent: string) {
    return text.replace(/(?:^|(?<=\n))/gs, indent);
}

function generateAttrDoc(entry: Entry, item: Item) {
    let res = '';
    res += `\`${normalizeName(item.name)}`;
    if (item.short) {
        res += `="${item.short}"`;
    }
    res += `\` *[${item.required ? 'required' : 'optional'}]*`;
    res += `\n\n${item.text}`;
    return '* ' + addIndent(res, '    ').trimStart();
}

function generateTagDoc(entry: Entry) {
    let tagName = normalizeName(entry.name.replace(/Tag$/, ''));
    let res = entry.text.trim() + '\n\n';
    for (let item of entry.items) {
        if (item.type === 'note') {
            res += item.text.trim();
        } else {
            res += generateAttrDoc(entry, item).trimEnd();
        }
        res += '\n\n';
    }
    return res;
}

let srcDir = path.normalize(path.join(__dirname, '../src'));
let docsDir = path.normalize(path.join(__dirname, '../docs'));

for (let file of fs.readdirSync(srcDir, { recursive: true, encoding: 'utf8' })) {
    let fullPath = path.join(srcDir, file);
    if (fs.statSync(fullPath).isFile() && fullPath.endsWith('.ts')) {
        let code = fs.readFileSync(fullPath, 'utf8');
        parseFile(code);
    }
}

function replaceMarkdown(_: any, prefix: string, name: string, postfix: string) {
    let entry = processEntry(entries[name], []);
    let doc = generateTagDoc(entry);
    return prefix + '\n\n' + doc.trim() + '\n\n' + postfix;
}

for (let file of fs.readdirSync(docsDir, { recursive: true, encoding: 'utf8' })) {
    let fullPath = path.join(docsDir, file);
    if (fs.statSync(fullPath).isFile() && fullPath.endsWith('.md')) {
        let markdown = fs.readFileSync(fullPath, 'utf8');
        let converted = markdown.replace(/(<!--\s*>>>\s*(.+?)\s*-->).*?(<!--\s*<<<\s*-->)/sg, replaceMarkdown);
        fs.writeFileSync(fullPath, converted);
    }
}

