
import fs from 'node:fs';
import { CUR, mkdirFor } from './common';

export interface Group {
    inputFile: string;
    stem: string;
    cases: { name: string; desc: string; }[];
    expectedErrors: string[];
    errors: string[];
};


export function createGroups(): Group[] {
    let groups: Group[] = [];

    for (let file of fs.readdirSync('test/docs/data', { recursive: true, encoding: 'utf-8' })) {
        let inputFile = `test/docs/data/${file}`;
        let stem = file.replace(/\.doctml$/, '');
        let content = fs.readFileSync(inputFile, 'utf-8');
        let parts = content.split(/<!--\s*\n(.*?)\n\s*-->/gs);
        if (parts.length === 1) {
            throw new Error(`Missing test cases in ${inputFile}`);
        }
        if (parts.at(-2)!.trim().toUpperCase() !== 'END') {
            parts.push('END', '');
        }
        let header = parts.shift()!;
        let footer = parts.pop()!;
        parts.pop();
        for (let i = 0; i < parts.length; i += 2) {
            let groupIndex = i >> 1;
            let casesText = parts[i];
            let body = parts[i + 1];
            let { cases, errors } = parseGroupCases(casesText);
            let outputStem = `${stem}.g${groupIndex}`;
            let doctmlFile = `${CUR}/doctml/${outputStem}.doctml`;
            mkdirFor(doctmlFile);
            fs.writeFileSync(doctmlFile, header + body + footer);
            groups.push({
                inputFile,
                stem: outputStem,
                cases,
                expectedErrors: errors,
                errors: [],
            });
        }
    }

    return groups;
}

function parseGroupCases(casesText: string) {
    let casesLines = casesText
        .split('\n')
        .map(x => x.trim())
        .filter(x => x);
    let cases: { name: string, desc: string }[] = [];
    let errors: string[] = [];
    for (let line of casesLines) {
        let m = line.match(/^(.*?):(.*)$/);
        if (!m) {
            throw new Error(`Invalid test case line: ${line}`);
        }
        let name = m[1].trim().toLowerCase();
        let desc = m[2].trim();
        if (name !== 'error') {
            cases.push({ name, desc });
        } else {
            errors.push(desc);
        }
    }
    return { cases, errors };
}
