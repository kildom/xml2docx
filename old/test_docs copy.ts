import * as fs from "node:fs";
import * as path from "node:path";
import * as util from 'node:util';
import * as docx from "docx";
import * as yaml from 'yaml';

let fileDir = '.';

let sections: docx.ISectionOptions[] = [];
let currentSection: docx.ISectionOptions;

let paragraphStyles: docx.IParagraphStyleOptions[] = [];
let characterStyles: docx.ICharacterStyleOptions[] = [];
let macros: { [key: string]: string } = {};

function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const filters: { [key: string]: (value: any) => any } = {
    '[file]': (value: any) => {
        let filePath = path.resolve(fileDir, value as string);
        return fs.readFileSync(filePath);
    },
    '[pt]': (value: any) => convertSize(value as any, false, false),
    '[3/4pt]': (value: any) => convertSize(value as any, false, false, 4 / 3),
    '[1/8pt]': (value: any) => convertSize(value as any, false, false, 8),
    '[1/20pt]': (value: any) => convertSize(value as any, false, false, 20),
    '[dxa]': (value: any) => convertSize(value as any, false, false, 20),
    '[emu]': (value: any) => convertSize(value as any, false, false, 12700),
};

const filtersRegExp = new RegExp('(' + Object.keys(filters).map(escapeRegExp).join('|') + ')$');

function postProcessYaml(obj: any) {

    if (typeof (obj) !== 'object' || obj === null) {
        return obj;
    }

    if (obj instanceof Array) { // Array

        let newArray: any[] = [];
        for (let i = 0; i < obj.length; i++) {
            let value = postProcessYaml(obj[i]);
            if (value !== undefined) {
                newArray.push(value);
            }
        }
        return newArray;

    } else { // Object

        let entries = Object.entries(obj);
        let macroName: string | null = null;
        let macroParam: any = null;
        
        if (entries.length == 0) {
            return obj;
        } else if (entries[0][0].startsWith('$[')) {
            // skip special case
        } else if (entries[0][0].startsWith('$')) {
            macroName = entries[0][0].substring(1);
            macroParam = entries[0][1];
            entries.shift();
            if (macroName.startsWith('MACRO $')) {
                let newMacroName = macroName.substring(7);
                macros[newMacroName] = JSON.stringify(Object.fromEntries(entries));
                return undefined;
            } else if (macroName in macros) {
                let macroText = macros[macroName];
                let resultText = macroText.replace(/\$\$(str)\$\$|"\$\$(val)\$\$"|"\$\$(obj)\$\$"/g, (_, str, val, obj) => {
                    let res = '';
                    if (str) {
                        res = JSON.stringify('' + macroParam);
                        res = res.substring(1, res.length - 1);
                    } else if (val) {
                        res = JSON.stringify(macroParam);
                    } else if (obj) {
                        res = JSON.stringify(Object.fromEntries(entries));
                    }
                    //console.log(str, val, objExtend, objValue);
                    return res;
                });
                let result = JSON.parse(resultText);
                //console.log(result);
                return postProcessYaml(result);
            }
        }

        //console.log('obj', macroName, entries[0]);

        let newEntries: [string, unknown][] = [];

        for (let [key, value] of entries) {
            //console.log('---', key, value);

            let m: RegExpMatchArray | null;

            value = postProcessYaml(value as any);
            if (value === undefined) {
                continue;
            }

            if ((m = key.match(filtersRegExp)) && (m.index !== undefined) && m[1]) {
                let filter: any = filters[m[1].toLowerCase()];
                value = filter(value);
                key = key.substring(0, m.index);
            }

            if ((m = key.match(/\$\[([^\]]*\|[^\]]*)\]/)) && (m.index !== undefined)) {
                let offset = m.index;
                let len = m[0].length;
                let items = m[1].split('|');
                for (let item of items) {
                    let newKey = key.substring(0, offset) + item + key.substring(offset + len);
                    newEntries.push([newKey, value]);
                }
            } else if (key.match(/^\$\[extend.*\]$/i)) {
                newEntries.push(...Object.entries(value as any));
            } else {
                newEntries.push([key, value]);
            }
        }

        let newObj = Object.fromEntries(newEntries);

        if (macroName !== null) {
            return execMacro(macroName, macroParam, newObj);
        } else {
            return newObj;
        }
    }
}

function convertSize(value: string | number | string[] | number[], nonZero: boolean = false, fraction: boolean = false, targetUnitsPerPt: number = 1): any {
    if (typeof (value) == 'string') {
        value = value.trim();
        let scale: number;
        if (value.endsWith('mm')) {
            scale = targetUnitsPerPt * 360 / 127;
        } else if (value.endsWith('cm')) {
            scale = targetUnitsPerPt * 3600 / 127;
        } else if (value.endsWith('in')) {
            scale = targetUnitsPerPt * 72;
        } else if (value.endsWith('pt')) {
            scale = targetUnitsPerPt * 1;
        } else if (value.endsWith('pc')) {
            scale = targetUnitsPerPt * 12;
        } else {
            throw Error(`Unknown units at "${value}"`);
        }
        let result = parseFloat(value.substring(0, value.length - 2)) * scale;
        if (!fraction) {
            result = Math.round(result);
        }
        if (nonZero && result < 1) {
            result = 1;
        }
        return result;
    } else if (typeof (value) == 'object' && value instanceof Array) {
        return value.map((x: string | number) => convertSize(x, nonZero, fraction, targetUnitsPerPt));
    } else {
        return value;
    }
}

function newMacro(name: string, param: any) {
    macros[name] = JSON.stringify(param);
    //console.log(util.inspect([name, macros[name]], false, null, true));
}

class SetSection {
    constructor(public index: number) { }
};

function execMacro(macroName: string, macroParam: any, newObj: { [k: string]: any; }) {

    //console.log(`Macro ${macroName}`, util.inspect([macroParam, newObj], false, null, true));

    switch (macroName) {
        case 'Section': {
            let index = sections.length;
            let section = { ...newObj, children: [] } as docx.ISectionOptions;
            sections.push(section);
            return new SetSection(index);
        }
        case 'ParagraphStyle': {
            paragraphStyles.push(newObj as docx.IParagraphStyleOptions);
            return undefined;
        }
        case 'CharacterStyle': {
            characterStyles.push(newObj as docx.ICharacterStyleOptions);
            return undefined;
        }
        default:
            break;
    }

    let construct: any = (docx as any)[macroName];
    if (!construct) {
        throw Error(`Invalid macro "${macroName}".`);
    }

    let param: any;
    if (macroParam !== null && Object.keys(newObj).length == 0) {
        param = macroParam;
    } else if (macroParam === null) {
        param = newObj;
    } else {
        throw new Error(`Macro "${macroName}" uses just one type of parameter: direct parameter or object parameter.`);
    }

    //console.log(`Class ${macroName}`, util.inspect(param, false, null, true));

    return new construct(param);
}


let out = yaml.parse(fs.readFileSync('template.yml', 'utf-8'));
//console.log(out); process.exit();

out = postProcessYaml(out);
//console.log(out);

if (sections.length == 0) {
    throw new Error('Define at least one section');
}
currentSection = sections[0];

for (let item of out) {
    if (item instanceof SetSection) {
        currentSection = sections[item.index];
    } else {
        (currentSection!.children as any[]).push(item);
    }
}

//console.log(util.inspect(macros, false, null, true));

const doc = new docx.Document({ sections, styles: { paragraphStyles, characterStyles } });


docx.Packer.toBuffer(doc).then((buffer) => {
    fs.writeFileSync("My Document.docx", buffer);
});
