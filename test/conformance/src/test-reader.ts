
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { doctmlFileName, isDirectExecution, isTestSuite, mkdirFor, outputRootDir } from './common';


export interface TestMetadata {
    id: string;
    inputFile: string;
    index: number;
    coverage: { name: string; desc: string; }[];
    expectedErrors: string[];
    separateRunners: boolean;
};


/** Parse DocTML test files from the input copied to output directory and write separate test files.
 * 
 * For each test case, the result contains a doctml file, an info.json file with TestMetadata, and a data.json file.
 * 
 * @param filterFiles An array of file names that should be included (empty for all files).
 */
export function parseDocTMLTests(filterFiles: string[]) {
    let tests: TestMetadata[] = [];

    for (let file of fs.readdirSync(outputRootDir(), { recursive: true, encoding: 'utf-8' })) {
        if (!isTestSuite(file)) {
            continue;
        }
        if (filterFiles.length > 0 && !filterFiles.includes(file)) {
            continue;
        }
        let inputFile = `${outputRootDir()}/${file}`;
        let nameStem = file.replace(/\.doctml$/, '');
        let dataFile = inputFile.replace(/\.doctml$/, '.json');
        let data: string = '{}';
        if (fs.existsSync(dataFile)) {
            data = fs.readFileSync(dataFile, 'utf-8');
        }
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
            tests.push(createTest(inputFile, nameStem, header, footer, parts[i], parts[i + 1], data, i >> 1));
        }
    }

    let ids = new Set<string>();
    for (let test of tests) {
        if (ids.has(test.id)) {
            console.error('Duplicate test id for:');
            console.error(test.coverage.map(x => `${x.name}: ${x.desc}`).join('\n'));
            throw new Error(`Duplicate test id: ${test.id}`);
        }
        ids.add(test.id);
    }
}

function createTest(inputFile: string, nameStem: string, header: string, footer: string, coverageText: string, body: string, data: string, index: number): TestMetadata {
    coverageText = coverageText.trim().replace(/(^[\t ]+|[\t ]+$)/gm, '').trim();
    let { coverage, expectedErrors } = parseTestCoverage(coverageText);
    let hash = hashOfCoverage(coverage);
    let id = `${nameStem}.${hash}`;
    let doctmlFile = doctmlFileName(id);
    mkdirFor(doctmlFile);
    fs.writeFileSync(doctmlFile, header + body + footer);
    let dataFile = doctmlFile.replace('.doctml', '.json');
    fs.writeFileSync(dataFile, data);
    let result: TestMetadata = {
        id,
        inputFile,
        index,
        coverage,
        expectedErrors,
        separateRunners: false,
    };
    let infoFile = doctmlFile.replace('.doctml', '.info.json');
    fs.writeFileSync(infoFile, JSON.stringify(result, null, 2));
    return result;
}

function strcmp(a: string, b: string): number {
    return a == b ? 0 : a > b ? 1 : -1;
}

function strcmpArray(a: string[], b: string[]): number {
    for (let i = 0; i < Math.min(a.length, b.length); i++) {
        let cmp = strcmp(a[i], b[i]);
        if (cmp !== 0) return cmp;
    }
    return a.length - b.length;
}

function hashOfCoverage(coverage: { name: string; desc: string; }[]): string {
    let normalizedText = coverage
        .map(({ name, desc }) => [
            name.trim().toLowerCase(),
            desc.replace(/[^a-z0-9\x7F-\uFFFF]+/gi, ' ').trim().toLowerCase(),
        ])
        .sort(strcmpArray)
        .map(x => x.join(':'))
        .join('\n');
    return createHash('SHA256')
        .update(normalizedText)
        .digest('base64url')
        .replace(/[^a-z0-9]/gi, '')
        .toLowerCase()
        .substring(0, 16);
}

function parseTestCoverage(coverageText: string) {
    let casesLines = coverageText
        .split('\n')
        .map(x => x.trim())
        .filter(x => x);
    let coverage: { name: string, desc: string }[] = [];
    let expectedErrors: string[] = [];
    for (let line of casesLines) {
        let m = line.match(/^(.*?):(.*)$/);
        if (!m) {
            throw new Error(`Invalid test coverage line: ${line}`);
        }
        let name = m[1].trim().toLowerCase();
        let desc = m[2].trim();
        if (name !== 'error') {
            coverage.push({ name, desc });
        } else {
            expectedErrors.push(desc);
        }
    }
    return { coverage, expectedErrors };
}
