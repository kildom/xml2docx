
import * as fs from 'node:fs';
import * as path from 'node:path';
import JSON5 from 'json5';
import { createHash } from 'node:crypto';
import { selfTest } from '../../../scripts/common/utils';


/** Describes the tag or attribute behavior verified by a test case. */
export interface TestCaseCoverageEntry {
    /** Name of the covered tag. */
    tag: string;
    /** Name of the covered attribute, when coverage is attribute-specific. */
    attribute?: string;
    /** Human-readable description of the covered behavior. */
    title: string;
}

/** Describes single error message from the test case and associated expected error message. */
export interface TestCaseError {
    /** Message produced by execution of the test case. */
    message: string;
    /** If set, matching expected message from test case description. If not set, indicates that this error was not expected. */
    expectedMessage?: string;
}

/** Metadata and source files for a single conformance test case. */
export class TestCase {
    /** Stable identifier used to name the case's files. */
    public id: string = '';
    /** Directory containing the case's metadata, data, and source files. */
    public dir: string = '';
    /** Project-relative path to the original input file. */
    public inputFile: string = '';
    /** One-based line number of the case description in the input file. */
    public inputLine: string = '';
    /** Tags and attributes exercised by this case. */
    public coverage: TestCaseCoverageEntry[] = [];
    /** Error messages expected when this case is processed. */
    public expectedErrors: string[] = [];
    /** Test case errors. */
    public errors: TestCaseError[] = [];
    /** Test case run status. If runner produces exit code, it is exit code. Otherwise, it is boolean indicating success. */
    public runStatus: number | boolean = false;

    /**
     * Creates an empty test case or loads its metadata from a saved JSON file.
     * @param file Optional path to a saved test-case metadata file.
     */
    constructor(file?: string) {
        if (file) {
            let testCaseData: Pick<TestCase, keyof TestCase> = JSON.parse(fs.readFileSync(file, 'utf-8'));
            this.id = testCaseData.id;
            this.dir = path.dirname(file);
            this.inputFile = testCaseData.inputFile;
            this.inputLine = testCaseData.inputLine;
            this.coverage = testCaseData.coverage;
            this.expectedErrors = testCaseData.expectedErrors;
            this.errors = testCaseData.errors ?? [];
            this.runStatus = testCaseData.runStatus ?? false;
        }
    }

    /** Writes this case's metadata to `<dir>/<id>.json`. */
    public write() {
        const file = path.join(this.dir, `${this.id}.json`);
        fs.mkdirSync(this.dir, { recursive: true });
        let toSave = { ...this } as any;
        fs.writeFileSync(file, JSON.stringify(toSave, null, 4), 'utf-8');
    }

    /**
     * Writes JSON-compatible template data to `<dir>/<id>-data.json`.
     * @param data Data to serialize for the case.
     */
    public writeData(data: any) {
        const file = path.join(this.dir, `${this.id}-data.json`);
        fs.mkdirSync(this.dir, { recursive: true });
        fs.writeFileSync(file, JSON.stringify(data, null, 4), 'utf-8');
    }

    /**
     * Reads template data from `<dir>/<id>-data.json`.
     * @returns The parsed data, or `undefined` when no data file exists.
     */
    public readData() {
        const file = path.join(this.dir, `${this.id}-data.json`);
        if (!fs.existsSync(file)) return undefined;
        return JSON.parse(fs.readFileSync(file, 'utf-8'));
    }

    /**
     * Writes the case's DocTML source to `<dir>/<id>.doctml`.
     * @param code Complete DocTML source for the case.
     */
    public writeCode(code: string) {
        const file = path.join(this.dir, `${this.id}.doctml`);
        fs.mkdirSync(this.dir, { recursive: true });
        fs.writeFileSync(file, code, 'utf-8');
    }

    /** Reads the case's DocTML source from `<dir>/<id>.doctml`. */
    public readCode(): string {
        const file = path.join(this.dir, `${this.id}.doctml`);
        return fs.readFileSync(file, 'utf-8');
    }

    /** Returns the output path `<dir>/<id>.docx`. */
    public getOutputFile(type: 'docx' | 'pdf' | 'html' | 'png' | 'doctml'): string {
        return path.join(this.dir, `${this.id}.${type}`);
    }

    /** Lists this case's debug outputs matching the `<id>.debug.*` filename pattern. */
    public getDebugFiles(): string[] {
        const prefix = `${this.id}.debug.`;
        return fs.readdirSync(this.dir, { withFileTypes: true })
            .filter(entry => entry.isFile() && entry.name.startsWith(prefix))
            .map(entry => path.join(this.dir, entry.name));
    }

    /** Returns true if test case run was successful. */
    public isSuccessRun(): boolean {
        for (let error of this.errors) {
            if (!error.expectedMessage) {
                return false;
            }
        }
        return true;
    }

};


/**
 * Resets `dir`, copies shared include assets into `dir/include`, and writes each test case's
 * metadata, source, and optional data there.
 *
 * Inputs are read from `test/conformance/inputs/` and the generated documentation
 * examples in `artifacts/test/conformance/docs/tests.doctml`, relative to the project root.
 *
 * @param dir Directory where the generated test-case files are written.
 * @returns Test cases keyed by their identifiers.
 * @throws If the generated documentation examples are missing or an input is invalid.
 */
export function createTestCases(dir: string): Record<string, TestCase> {
    const inputDir = 'test/conformance/inputs';
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    fs.cpSync(path.join(inputDir, 'include'), path.join(dir, 'include'), { recursive: true });

    const docsFile = 'artifacts/test/conformance/docs/tests.doctml';
    if (!fs.existsSync(docsFile)) {
        throw new Error(
            'Conformance docs tests are missing. Build docs first to generate expected coverage and examples.'
        );
    }

    function listDoctmlFiles(directory: string): string[] {
        return fs.readdirSync(directory, { withFileTypes: true })
            .flatMap(entry => {
                const file = path.join(directory, entry.name);
                if (entry.isDirectory()) return listDoctmlFiles(file);
                return entry.isFile() && entry.name.endsWith('.doctml') ? [file] : [];
            });
    }

    function parseTemplateData(file: string): Record<string, any> {
        const data = JSON5.parse(fs.readFileSync(file, 'utf-8'));
        if (data === null || typeof data !== 'object' || Array.isArray(data)) {
            throw new Error(`Template data in ${file} must be a JSON object.`);
        }
        return data;
    }

    const inputFiles = [...listDoctmlFiles(inputDir), docsFile].sort();
    const testCases: Record<string, TestCase> = {};

    for (const inputFile of inputFiles) {
        const text = fs.readFileSync(inputFile, 'utf-8');
        const comments = [...text.matchAll(/<!--[\s\S]*?-->/g)];
        const endIndex = comments.length - 1;
        if (endIndex < 0 || comments[endIndex][0].slice(4, -3).trim() !== 'END') {
            throw new Error(`Missing final END comment in conformance input ${inputFile}.`);
        }
        const prefix = text.slice(0, comments[0].index!);
        const endComment = comments[endIndex];
        const suffix = text.slice(endComment.index! + endComment[0].length);
        const dataFile = inputFile.replace(/\.doctml$/i, '.json');
        const baseData = fs.existsSync(dataFile) ? parseTemplateData(dataFile) : undefined;

        for (let i = 0; i < endIndex; i++) {
            const comment = comments[i];
            const commentStart = comment.index!;
            const description = comment[0].slice(4, -3);
            const coverage: TestCaseCoverageEntry[] = [];
            const expectedErrors: string[] = [];
            let inlineData: Record<string, any> | undefined;

            for (const rawLine of description.split(/\r?\n/)) {
                const line = rawLine.trim();
                if (!line) continue;

                const errorMatch = /^ERROR:\s*(.*)$/i.exec(line);
                if (errorMatch) {
                    expectedErrors.push(errorMatch[1].trim());
                    continue;
                }

                const dataMatch = /^DATA:\s*(.*)$/i.exec(line);
                if (dataMatch) {
                    const data = JSON5.parse(dataMatch[1]);
                    if (data === null || typeof data !== 'object' || Array.isArray(data)) {
                        throw new Error(`DATA in ${inputFile} must contain a JSON object.`);
                    }
                    inlineData = { ...inlineData, ...data };
                    continue;
                }

                const coverageMatch = /^([^.\s:]+)(?:\.([^.\s:]+))?:\s*(.*)$/.exec(line);
                if (coverageMatch) {
                    coverage.push({
                        tag: coverageMatch[1],
                        ...(coverageMatch[2] ? { attribute: coverageMatch[2] } : {}),
                        title: coverageMatch[3].trim(),
                    });
                }
            }

            const inputLine = String(text.slice(0, commentStart).split(/\r?\n/).length);
            let id = hashOfCoverage(inputFile, coverage);
            let collision = 0;
            while (testCases[id]) {
                collision++;
                id = hashOfCoverage(`${inputFile}:${inputLine}:${collision}`, coverage);
            }

            const testCode = prefix + text.slice(commentStart + comment[0].length, comments[i + 1].index!) + suffix;
            const testCase = new TestCase();
            testCase.id = id;
            testCase.dir = dir;
            testCase.inputFile = inputFile.split(path.sep).join('/');
            testCase.inputLine = inputLine;
            testCase.coverage = coverage;
            testCase.expectedErrors = expectedErrors;
            testCase.write();
            testCase.writeCode(testCode);

            if (baseData || inlineData) {
                testCase.writeData({ ...baseData, ...inlineData });
            }
            testCases[testCase.id] = testCase;
        }
    }

    return testCases;
}

/**
 * Loads saved test cases from `dir`, ignoring files that are not 16-character case metadata files.
 *
 * @param dir Directory containing saved test cases.
 * @returns Test cases keyed by their identifiers; returns an empty record if `dir` is missing.
 */
export function readTestCases(dir: string): Record<string, TestCase> {
    const testCases: Record<string, TestCase> = {};
    if (!fs.existsSync(dir)) return testCases;

    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isFile() || !/^[a-z0-9]{16}\.json$/i.test(entry.name)) continue;
        const file = path.join(dir, entry.name);
        const testCase = new TestCase(file);
        testCases[testCase.id] = testCase;
    }

    return testCases;
}

function hashOfCoverage(inputFile: string, coverage: TestCaseCoverageEntry[]): string {

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

    let normalizedText = coverage
        .map(({ tag, attribute, title }) => [
            tag.trim().toLowerCase(),
            attribute?.trim()?.toLocaleLowerCase() || '',
            title.replace(/[^a-z0-9\x7F-\uFFFF]+/gi, ' ').trim().toLowerCase(),
        ])
        .sort(strcmpArray)
        .map(x => x.join(':'))
        .join('\n');
    return createHash('SHA256')
        .update(normalizedText + ':::' + path.basename(inputFile))
        .digest('base64url')
        .replace(/[^a-z0-9]/gi, '')
        .toLowerCase()
        .substring(0, 16);
}


/* ===================================== SELF-TEST ====================================== */


void (selfTest(import.meta.url) && (async () => {
    const assert: Pick<typeof import('node:assert/strict'), 'deepEqual' | 'equal' | 'ok'> =
        (await import('node:assert/strict')).default;

    const parserCheckText = `<document>
            <section size="A4" margin="5mm"/>
            <!--
            p: Test DATA field
            DATA: { text: 'Hello' }
            -->
            <p><% text %></p>
            <!--
            p: Test global data
            -->
            <p><% global %></p>
            <!--
            p: Test global override
            DATA: { global: 'This is not global any more.' }
            -->
            <p><% global %></p>
            <!--
            p: First title
            p.align: Second Title
            -->
            <p>Check two coverage items</p>
            <!--
            p: First title
            p.align: Second Title
            ERROR: This is an error
            -->
            <p>Check error message</p>
            <!--
            p: First title
            p.align: Second Title
            ERROR: This is an error
            ERROR: And second error
            -->
            <p>Check two error messages</p>
            <!--
            p: First title
            p.align: Second Title
            ERROR: This is an error
            JSON: { text: 'Hello' }
            -->
            <p><% text %>! Check multiple</p>
            <!--
            END
            -->
        </document>
        `;
    const parserCheckFile = 'test/conformance/inputs/parser-check.doctml';
    const parserCheckData = {
        global: 'This is global text.'
    };
    const parserCheckDataFile = 'test/conformance/inputs/parser-check.json';

    try {
        fs.writeFileSync(parserCheckFile, parserCheckText, 'utf-8');
        fs.writeFileSync(parserCheckDataFile, JSON.stringify(parserCheckData, null, 4), 'utf-8');

        const outputDir = 'artifacts/temp/case-parser';
        fs.rmSync(outputDir, { recursive: true, force: true });
        const created = createTestCases(outputDir);
        const read = readTestCases(outputDir);

        assert.ok(fs.existsSync(path.join(outputDir, 'include/tools.js')));
        assert.deepEqual(Object.keys(read).sort(), Object.keys(created).sort());
        for (const [id, testCase] of Object.entries(created)) {
            assert.deepEqual(read[id], testCase);
            assert.equal(read[id].readCode(), testCase.readCode());
            const dataFile = path.join(outputDir, `${id}-data.json`);
            if (fs.existsSync(dataFile)) {
                assert.deepEqual(read[id].readData(), testCase.readData());
            }
        }

        const parserCases = Object.values(read).filter(testCase =>
            testCase.inputFile.endsWith('/parser-check.doctml')
        );
        assert.equal(parserCases.length, 7);
        assert.ok(parserCases.every(testCase => {
            const code = testCase.readCode();
            return code.includes('<document>') && code.includes('</document>') &&
                (code.match(/<p(?:\s|>)/g) ?? []).length === 1;
        }));
        assert.ok(parserCases.some(testCase =>
            testCase.readCode().includes('<p>Check two coverage items</p>')
        ));
        assert.ok(parserCases.some(testCase =>
            testCase.expectedErrors.length === 2 && testCase.expectedErrors[1] === 'And second error'
        ));
        assert.ok(parserCases.some(testCase => {
            const data = testCase.readData();
            return data?.global === 'This is not global any more.';
        }));

        console.log(`Self test PASSED (${Object.keys(created).length} test cases)`);
    } finally {
        fs.rmSync(parserCheckFile, { force: true });
        fs.rmSync(parserCheckDataFile, { force: true });
    }
})());
