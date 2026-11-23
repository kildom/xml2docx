
import * as fs from 'node:fs';
import * as path from 'node:path';
import { template } from 'underscore';
import { TestCase } from './case-parser';
import { convertDocxFiles } from '../../../scripts/common/docx2pdf';
import { pdf2png } from './pdf2png';


const conversionBatch = 10;


export const conformanceRoot = 'artifacts/test/conformance';


export const runnersList = [
    'cli',
    'api',
];


export function getRunnerDirectory(runnerName: string)
{
    return path.join(conformanceRoot, `runner-${runnerName}`);
}


async function processErrors(testCases: TestCase[], coverage: Record<string, CoverageTagInformation>): Promise<void> {

    function addError(testCase: TestCase, message: string): void {
        testCase.errors.push({ message });
        console.log(`    ${message}`);
    }

    function processOutputStatus(testCase: TestCase): void {
        const status = testCase.runStatus;
        const success = typeof status === 'boolean' ? status : status === 0;
        const outputFile = testCase.getOutputFile('docx');

        if (success && testCase.expectedErrors.length > 0) {
            addError(testCase, typeof status === 'number'
                ? 'DocTML CLI exit code is zero, but error was expected in this test case'
                : 'Runner reported success, but error was expected in this test case');
        } else if (!success && testCase.expectedErrors.length === 0) {
            addError(testCase, typeof status === 'number'
                ? `DocTML CLI exit code is ${status}, but not errors were expected in this test case`
                : 'Runner reported failure, but no errors were expected in this test case');
        }

        if (success) {
            if (!fs.existsSync(outputFile)) {
                addError(testCase, `DocTML CLI did not create output DOCX file: ${outputFile}`);
            } else if (fs.statSync(outputFile).size === 0) {
                addError(testCase, `DocTML CLI created an empty output DOCX file: ${outputFile}`);
            }
        } else if (fs.existsSync(outputFile)) {
            addError(testCase, `DocTML CLI created output DOCX file despite exit code ${status}: ${outputFile}`);
        }
    }

    function checkCoverage(testCase: TestCase): void {
        for (const item of testCase.coverage) {
            let tagInfo = coverage[item.tag];
            if (!tagInfo) {
                addError(testCase, `Coverage tag "${item.tag}" is not defined in tags.json.`);
                tagInfo = coverage[item.tag] = {
                    name: item.tag,
                    brief: '',
                    attributes: {},
                };
            }

            if (item.attribute && !Object.prototype.hasOwnProperty.call(tagInfo.attributes, item.attribute)) {
                addError(testCase, `Coverage attribute "${item.tag}.${item.attribute}" is not defined in tags.json.`);
                tagInfo.attributes[item.attribute] = '';
            }
        }
    }

    async function convertFromDocx(): Promise<void> {
        if (process.argv.includes('--only-docx')) return;

        const convertibleCases = testCases.filter(testCase =>
            fs.existsSync(testCase.getOutputFile('docx'))
        );

        let i = 0;

        for (let offset = 0; offset < convertibleCases.length; offset += conversionBatch) {
            const batch = convertibleCases.slice(offset, offset + conversionBatch);
            const failedCases = new Set<TestCase>();
            const files = Object.fromEntries(batch.map(testCase => [
                testCase.getOutputFile('docx'),
                testCase.getOutputFile('pdf'),
            ]));

            try {
                console.log(`Converting batch of ${Object.keys(files).length} test cases from DOCX to PDF and HTML`);
                await convertDocxFiles(files);
            } catch {
                for (const testCase of batch) {
                    try {
                        await convertDocxFiles({
                            [testCase.getOutputFile('docx')]: testCase.getOutputFile('pdf'),
                        });
                    } catch {
                        addError(testCase, 'Conversion from DOCX to PDF or HTML failed.');
                        failedCases.add(testCase);
                    }
                }
            }

            for (const testCase of batch) {
                i++;
                console.log(`Validating conversion ${i} of ${convertibleCases.length}: ${testCase.getOutputFile('doctml')}`);
                if (failedCases.has(testCase)) continue;

                const pdfFile = testCase.getOutputFile('pdf');
                const htmlFile = testCase.getOutputFile('html');
                const pdfExists = fs.existsSync(pdfFile);
                const htmlExists = fs.existsSync(htmlFile);
                const pdfValid = pdfExists && fs.statSync(pdfFile).size > 0;
                const htmlValid = htmlExists && fs.statSync(htmlFile).size > 0;
                if (!pdfValid || !htmlValid) {
                    addError(testCase, 'Conversion from DOCX to PDF or HTML did not produced correct files.');
                }
                if (pdfExists && !pdfValid) fs.rmSync(pdfFile, { force: true });
                if (htmlExists && !htmlValid) fs.rmSync(htmlFile, { force: true });
                if (!pdfValid) {
                    continue;
                }

                const pngFile = testCase.getOutputFile('png');
                try {
                    await pdf2png(pdfFile, pngFile);
                } catch {
                    // Report through the same output validation below.
                }
                if (!fs.existsSync(pngFile) || fs.statSync(pngFile).size === 0) {
                    if (fs.existsSync(pngFile)) fs.rmSync(pngFile, { force: true });
                    addError(testCase, 'Conversion from PDF to PNG failed.');
                }
            }
        }
    }

    function normalizeErrors(testCase: TestCase): void {
        const rawText = testCase.errors.map(error => error.message).join('\n');
        const normalizedMessages: string[] = [];
        let currentMessage: string | undefined;

        for (const rawLine of rawText.split('\n')) {
            const line = rawLine.trimEnd();
            if (!line.trim()) continue;
            if (!/^\s/.test(line) || currentMessage === undefined) {
                if (currentMessage !== undefined) normalizedMessages.push(currentMessage);
                currentMessage = line.trimStart();
            } else {
                currentMessage += `\n${line}`;
            }
        }
        if (currentMessage !== undefined) normalizedMessages.push(currentMessage);

        testCase.errors = normalizedMessages.map(message => ({ message }));
        const unmatchedExpected = [...testCase.expectedErrors];
        for (const error of testCase.errors) {
            const matchIndex = unmatchedExpected.findIndex(expected => error.message.includes(expected));
            if (matchIndex >= 0) {
                error.expectedMessage = unmatchedExpected[matchIndex];
                unmatchedExpected.splice(matchIndex, 1);
            }
        }
        testCase.expectedErrors = unmatchedExpected;
        if (!testCase.isSuccessRun()) {
            console.log('    Unexpected errors detected');
        }
    }

    for (const [i, testCase] of Object.entries(testCases)) {
        console.log(`Validating output ${Number(i) + 1} of ${testCases.length}: ${testCase.getOutputFile('doctml')}`);
        checkCoverage(testCase);
        processOutputStatus(testCase);
    }
    await convertFromDocx();
    for (const [i, testCase] of Object.entries(testCases)) {
        console.log(`Interpreting errors ${Number(i) + 1} of ${testCases.length}: ${testCase.getOutputFile('doctml')}`);
        normalizeErrors(testCase);
        testCase.write();
    }
}

function generateRunnerReport(
    runnerName: string,
    dir: string,
    testCases: TestCase[],
    coverage: Record<string, CoverageTagInformation>,
)
{
    type Counts = { failed: number; success: number; total: number };
    type ErrorView = { message: string; expected: boolean; before: string; match: string; after: string };
    type Tab = {
        key: string;
        title: string;
        kind: 'errors' | 'source' | 'pdf' | 'png' | 'link';
        href?: string;
        errors?: ErrorView[];
        missingExpected?: string[];
        active?: boolean;
    };
    type CaseView = {
        id: string;
        inputFile: string;
        inputBaseName: string;
        inputLine: string;
        inputHref: string;
        inputAnchor: string;
        success: boolean;
        coverage: TestCase['coverage'];
        errors: ErrorView[];
        expectedErrors: string[];
        tabs: Tab[];
    };
    type CoverageView = {
        tag: string;
        attribute?: string;
        brief: string;
        counts: Counts;
        cases: Array<{ id: string; title: string; success: boolean }>;
    };

    const reportFile = path.join(conformanceRoot, `runner-${runnerName}.html`);

    function relativeUrl(target: string): string {
        return path.relative(path.dirname(reportFile), target)
            .split(path.sep)
            .map(encodeURIComponent)
            .join('/');
    }

    function isSuccessful(testCase: TestCase): boolean {
        return testCase.isSuccessRun() && testCase.expectedErrors.length === 0;
    }

    function newCounts(): Counts {
        return { failed: 0, success: 0, total: 0 };
    }

    function countCase(counts: Counts, success: boolean): void {
        counts.total++;
        if (success) counts.success++;
        else counts.failed++;
    }

    const inputAnchors = new Map<string, string>();
    const lazyContent: Record<string, string> = {};
    const reportCases: CaseView[] = [];
    const sortedCases = [...testCases].sort((a, b) =>
        a.inputFile.localeCompare(b.inputFile) || Number(a.inputLine) - Number(b.inputLine) || a.id.localeCompare(b.id)
    );

    for (const testCase of sortedCases) {
        const success = isSuccessful(testCase);
        if (!inputAnchors.has(testCase.inputFile)) {
            inputAnchors.set(testCase.inputFile, `input-${inputAnchors.size}`);
        }

        const tabs: Tab[] = [];
        const linkTabs: Tab[] = [];
        const errors: ErrorView[] = testCase.errors.map(error => {
            const expected = error.expectedMessage;
            const matchAt = expected ? error.message.indexOf(expected) : -1;
            return {
                message: error.message,
                expected: Boolean(expected),
                before: matchAt >= 0 ? error.message.slice(0, matchAt) : error.message,
                match: matchAt >= 0 ? expected! : '',
                after: matchAt >= 0 ? error.message.slice(matchAt + expected!.length) : '',
            };
        });

        if (errors.length > 0 || testCase.expectedErrors.length > 0) {
            tabs.push({
                key: `panel-${tabs.length}`,
                title: 'Errors',
                kind: 'errors',
                errors,
                missingExpected: [...testCase.expectedErrors],
                active: !success,
            });
        }

        const addSourceTab = (title: string, content: string): void => {
            const key = `panel-${tabs.length}`;
            lazyContent[`${testCase.id}-${key}`] = content;
            tabs.push({ key, title, kind: 'source' });
        };

        addSourceTab('DocTML', testCase.readCode());
        const dataFile = path.join(dir, `${testCase.id}-data.json`);
        if (fs.existsSync(dataFile)) {
            addSourceTab('JSON', JSON.stringify(testCase.readData(), null, 4));
        }

        const docxFile = testCase.getOutputFile('docx');
        if (fs.existsSync(docxFile)) {
            linkTabs.push({ key: `link-${linkTabs.length}`, title: 'DOCX', kind: 'link', href: relativeUrl(docxFile) });
        }
        const pdfFile = testCase.getOutputFile('pdf');
        if (fs.existsSync(pdfFile)) {
            tabs.push({ key: `panel-${tabs.length}`, title: 'PDF', kind: 'pdf', href: relativeUrl(pdfFile) });
            linkTabs.push({ key: `link-${linkTabs.length}`, title: 'PDF', kind: 'link', href: relativeUrl(pdfFile) });
        }
        const htmlFile = testCase.getOutputFile('html');
        if (fs.existsSync(htmlFile)) {
            addSourceTab('HTML', fs.readFileSync(htmlFile, 'utf8'));
        }
        const pngFile = testCase.getOutputFile('png');
        if (fs.existsSync(pngFile)) {
            tabs.push({ key: `panel-${tabs.length}`, title: 'PNG', kind: 'png', href: relativeUrl(pngFile) });
        }
        for (const debugFile of testCase.getDebugFiles()) {
            const title = path.basename(debugFile).replace(`${testCase.id}.debug.`, '');
            addSourceTab(title, fs.readFileSync(debugFile, 'utf8'));
        }
        tabs.push(...linkTabs);

        reportCases.push({
            id: testCase.id,
            inputFile: testCase.inputFile,
            inputBaseName: path.basename(testCase.inputFile),
            inputLine: testCase.inputLine,
            inputHref: relativeUrl(testCase.inputFile),
            inputAnchor: inputAnchors.get(testCase.inputFile)!,
            success,
            coverage: testCase.coverage,
            errors,
            expectedErrors: [...testCase.expectedErrors],
            tabs,
        });
    }

    const casesByInput = new Map<string, CaseView[]>();
    for (const item of reportCases) {
        const group = casesByInput.get(item.inputFile) ?? [];
        group.push(item);
        casesByInput.set(item.inputFile, group);
    }
    const inputGroups = [...casesByInput.entries()].map(([inputFile, cases]) => {
        const counts = newCounts();
        for (const item of cases) countCase(counts, item.success);
        return {
            inputFile,
            baseName: path.basename(inputFile),
            anchor: cases[0].inputAnchor,
            counts,
            cases,
        };
    });

    const coverageRows = new Map<string, CoverageView>();
    const coveredCaseIds = new Map<string, Set<string>>();
    function ensureCoverageRow(tag: string, attribute?: string): CoverageView {
        const key = `${tag}\0${attribute ?? ''}`;
        let row = coverageRows.get(key);
        if (!row) {
            const tagInfo = coverage[tag];
            row = {
                tag,
                ...(attribute ? { attribute } : {}),
                brief: attribute ? tagInfo?.attributes[attribute] ?? '' : tagInfo?.brief ?? '',
                counts: newCounts(),
                cases: [],
            };
            coverageRows.set(key, row);
            coveredCaseIds.set(key, new Set());
        }
        return row;
    }

    for (const [tag, info] of Object.entries(coverage)) {
        ensureCoverageRow(tag);
        for (const attribute of Object.keys(info.attributes)) {
            ensureCoverageRow(tag, attribute);
        }
    }
    for (const testCase of sortedCases) {
        const success = isSuccessful(testCase);
        for (const item of testCase.coverage) {
            const rowSpecs: Array<[string, string | undefined]> = [
                [item.tag, item.attribute || undefined],
            ];
            for (const [tag, attribute] of rowSpecs) {
                const row = ensureCoverageRow(tag, attribute);
                const key = `${tag}\0${attribute ?? ''}`;
                const caseIds = coveredCaseIds.get(key)!;
                if (caseIds.has(testCase.id)) continue;
                caseIds.add(testCase.id);
                countCase(row.counts, success);
                row.cases.push({ id: testCase.id, title: item.title, success });
            }
        }
    }

    const sortedCoverageRows = [...coverageRows.values()].sort((a, b) =>
        a.tag.localeCompare(b.tag) || (a.attribute ?? '').localeCompare(b.attribute ?? '')
    );
    const counts = newCounts();
    for (const item of reportCases) countCase(counts, item.success);

    const reportTemplate = template(fs.readFileSync(
        'test/conformance/src/templates/runner-report.html',
        'utf8'
    ));
    const lazyContentJson = JSON.stringify(lazyContent)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029');
    fs.mkdirSync(path.dirname(reportFile), { recursive: true });
    fs.writeFileSync(reportFile, reportTemplate({
        runnerName,
        reportCases,
        inputGroups,
        coverageRows: sortedCoverageRows,
        counts,
        lazyContentJson,
    }), 'utf8');

    function escapeMarkdown(text: string): string {
        return text
            .replace(/\\/g, '\\\\')
            .replace(/`/g, '\\`')
            .replace(/\*/g, '\\*')
            .replace(/_/g, '\\_')
            .replace(/\|/g, '\\|')
            .replace(/\[/g, '\\[')
            .replace(/\]/g, '\\]')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\r?\n/g, ' ');
    }

    function markdownCode(text: string): string {
        return `\`${text.replace(/`/g, '\\`')}\``;
    }

    function errorFence(messages: string[]): string {
        const longestRun = Math.max(0, ...messages.flatMap(message =>
            [...message.matchAll(/`+/g)].map(match => match[0].length)
        ));
        return '`'.repeat(Math.max(3, longestRun + 1));
    }

    const markdownCases = reportCases.map(testCase => {
        const matchedExpectedErrors = testCase.errors.filter(error => error.expected).map(error => error.message);
        const unexpectedErrors = testCase.errors.filter(error => !error.expected).map(error => error.message);
        const missingExpectedErrors = [...testCase.expectedErrors];
        const fence = errorFence([...matchedExpectedErrors, ...unexpectedErrors, ...missingExpectedErrors]);
        return {
            ...testCase,
            inputBaseNameMd: escapeMarkdown(testCase.inputBaseName),
            coverage: testCase.coverage.map(item => ({
                label: markdownCode(item.attribute ? `${item.tag}.${item.attribute}` : item.tag),
                title: escapeMarkdown(item.title),
            })),
            matchedExpectedErrors,
            missingExpectedErrors,
            unexpectedErrors,
            errorFence: fence,
        };
    });
    const markdownInputGroups = inputGroups.map(group => {
        const baseNameMd = escapeMarkdown(group.baseName);
        return {
            tableRow: `| ${baseNameMd} | ${group.counts.failed} | ${group.counts.success} | ${group.counts.total} |`,
        };
    });
    const markdownCoverageRows = sortedCoverageRows.map(row => {
        const label = markdownCode(row.attribute ? `${row.tag}.${row.attribute}` : row.tag);
        const brief = escapeMarkdown(row.brief);
        const cells = [label, brief, row.counts.failed, row.counts.success, row.counts.total];
        return { tableRow: `| ${cells.join(' | ')} |` };
    });
    const markdownTemplate = template(fs.readFileSync(
        'test/conformance/src/templates/runner-report.md',
        'utf8'
    ));
    const markdownFile = path.join(conformanceRoot, `runner-${runnerName}.md`);
    const markdown = markdownTemplate({
        runnerName: escapeMarkdown(runnerName),
        outputDirectory: `runner-${runnerName}`,
        counts,
        inputGroups: markdownInputGroups,
        reportCases: markdownCases,
        coverageRows: markdownCoverageRows,
    }).replace(/\r\n?/g, '\n')
        .replace(/[ \t]+$/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .trimEnd() + '\n';
    fs.writeFileSync(markdownFile, markdown, 'utf8');

}

export interface CoverageTagInformation {
    /** Tag name */
    name: string;
    /** Brief description of tag. */
    brief: string;
    /** Tag attributes as record of attribute name and attribute brief description. */
    attributes: Record<string, string>;
};

export function readCoverage(): Record<string, CoverageTagInformation> {
    return JSON.parse(fs.readFileSync('artifacts/test/conformance/docs/tags.json', 'utf-8'));
}

export async function finalizeRunner(runnerName: string, dir: string, testCases: TestCase[]): Promise<void>
{
    let coverage = readCoverage();
    await processErrors(testCases, coverage);
    generateRunnerReport(runnerName, dir, testCases, coverage);
    if (testCases.some(testCase => !testCase.isSuccessRun() || testCase.expectedErrors.length > 0)) {
        if (process.exitCode === undefined || process.exitCode === null || Number(process.exitCode) < 4) {
            process.exitCode = 4;
        }
    }
}

/*

General instructions for all runners

1. Read test case with:
  - coverage
  - expected errors
  - data (.json, exists if provided)
  - test file (.doctml)
  - test case file (.json)

  All written in `artifacts/test/conformance/runner-{runner-name}/`

2. Execute DocTML with selected runner, generates:
  - docx file (if no errors)
  - debug files (if available)
  - errors file (empty if no errors)

  All written in `artifacts/test/conformance/runner-{runner-name}/`

3. Convert docx, generates:
  - pdf
  - png
  - html

  All written in `artifacts/test/conformance/runner-{runner-name}/`
  This step is optional and crosscheck will run it for first runner.

4. Report will contain:
  - tests ordered by inputFile and inputLine. Test will contain:
    - id
    - input file and line
    - coverage and title
    - result: success or failure (with explanation)
    - error information: expected vs. actual (if error happen or were expected)
    - test code
    - test data
    - link to docx (if exists)
    - debug files (if exists)
    - pdf, png, html (source code) (if exists)
  - All tags and attributes
    - coverage information
    - titles and links to test cases for specific tag or attribute

*/
