import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { template } from 'underscore';
import formatXml from 'xml-formatter';
import { readTestCases, TestCase } from './case-parser';
import { conformanceRoot, getRunnerDirectory, runnersList } from './runners-common';
import { unZip } from '../../../src/utils/unzip';


const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const reportFile = path.resolve(projectRoot, conformanceRoot, 'crosscheck-report.html');
const markdownFile = path.resolve(projectRoot, conformanceRoot, 'crosscheck-report.md');
const divider = '-'.repeat(64);
const fontTableNames = [
    'OS/2', 'VDMX', 'cmap', 'cvt ', 'fpgm', 'glyf', 'hdmx', 'head',
    'hhea', 'hmtx', 'kern', 'loca', 'maxp', 'name', 'post', 'prep',
];

interface RunnerResult {
    name: string;
    exitCode: number;
    cases: Record<string, TestCase>;
}

interface RunnerCaseView {
    name: string;
    status: 'FAILED' | 'SUCCESS';
    matching: 'MATCH' | 'MISMATCH';
    reportHref: string;
    diff?: string;
}

interface CrosscheckCaseView {
    id: string;
    coverage: TestCase['coverage'];
    inputFile: string;
    inputBaseName: string;
    inputLine: string;
    inputHref: string;
    issue: boolean;
    successAndMatch: boolean;
    runners: RunnerCaseView[];
}

function selectRunners(args: string[]): { names: string[]; onlyDocx: boolean } {
    const onlyDocx = args.includes('--only-docx');
    const requested = args.filter(arg => arg !== '--only-docx');
    const names = requested.length > 0 ? requested : [...runnersList];
    for (const name of names) {
        if (!runnersList.includes(name)) {
            throw new Error(`Unknown runner "${name}". Available runners: ${runnersList.join(', ')}`);
        }
    }
    if (new Set(names).size !== names.length) {
        throw new Error('Runner names must not be repeated.');
    }
    return { names, onlyDocx };
}

function runRunner(name: string, onlyDocx: boolean): RunnerResult {
    const script = path.resolve(projectRoot, `test/conformance/src/test-runner-${name}.ts`);
    const args = ['--import', 'tsx', script];
    if (onlyDocx) args.push('--only-docx');

    console.log(`\n=== Running ${name} runner${onlyDocx ? ' (--only-docx)' : ''} ===`);
    const result = spawnSync(process.execPath, args, {
        cwd: projectRoot,
        stdio: 'inherit',
    });
    if (result.error) {
        console.error(`Unable to start ${name} runner: ${result.error.message}`);
    }
    const exitCode = result.status ?? 1;
    const dir = path.resolve(projectRoot, getRunnerDirectory(name));
    return { name, exitCode, cases: readTestCases(dir) };
}

function detectFileType(fileName: string, bytes: Uint8Array): 'xml' | 'binary' | 'font' {
    const lowerName = path.posix.basename(fileName).toLowerCase();
    const extension = path.posix.extname(lowerName).slice(1);
    if (extension === 'xml' || extension === 'rels' || lowerName.startsWith('.rels')) return 'xml';
    if (['jpeg', 'jpg', 'png', 'gif', 'bmp', 'svg'].includes(extension)) return 'binary';
    if (extension === 'odttf' || extension === 'ttf') return 'font';

    try {
        if (new TextDecoder('utf-8', { fatal: true }).decode(bytes).trimStart().startsWith('<?xml ')) {
            return 'xml';
        }
    } catch {
        // Non-UTF-8 entries are tested for font signatures below.
    }

    const prefix = new TextDecoder('utf-8', { fatal: false }).decode(bytes.subarray(0, 512));
    const matchingTables = fontTableNames.filter(name => prefix.includes(name)).length;
    return matchingTables >= 6 ? 'font' : 'binary';
}

async function docxToText(docxFile: string): Promise<string> {
    const entries = unZip(fs.readFileSync(docxFile));
    const files = entries
        .filter(entry => !entry.fileName.endsWith('/'))
        .map(entry => {
            const bytes = entry.read();
            const type = detectFileType(entry.fileName, bytes);
            const content = type === 'xml'
                ? formatXml(new TextDecoder('utf-8').decode(bytes), { lineSeparator: '\n' })
                : createHash('sha256')
                    .update(type === 'font' ? bytes.subarray(32) : bytes)
                    .digest('hex');
            return { fileName: entry.fileName, content };
        })
        .sort((a, b) => a.fileName < b.fileName ? -1 : a.fileName > b.fileName ? 1 : 0);

    return files.map(file => `${divider}\n${file.fileName}\n${divider}\n${file.content}`)
        .join('\n')
        .replace(/[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[.0-9Zz:+-]+/g, '--TIMESTAMP--')
        .replace(/[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}/gi,
            '00000000-0000-0000-0000-000000000000');
}

function isSuccessful(testCase: TestCase): boolean {
    return testCase.isSuccessRun() && testCase.expectedErrors.length === 0;
}

async function writeTextRepresentations(runners: RunnerResult[]): Promise<void> {
    for (const runner of runners) {
        for (const testCase of Object.values(runner.cases)) {
            const textFile = testCase.getOutputFile('docx.txt');
            const docxFile = testCase.getOutputFile('docx');
            const content = fs.existsSync(docxFile)
                ? await docxToText(docxFile)
                : isSuccessful(testCase) ? 'SUCCESS' : 'FAILED';
            fs.writeFileSync(textFile, content, 'utf8');
        }
    }
}

function compareFiles(leftFile: string, rightFile: string, outputFile: string): boolean {
    const result = spawnSync('git', [
        'diff', '--no-index', '--no-ext-diff', '--no-color', '--', leftFile, rightFile,
    ], { cwd: projectRoot, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
    if (result.error) throw result.error;

    const exitCode = result.status ?? 1;
    if (exitCode === 0) {
        fs.rmSync(outputFile, { force: true });
        return false;
    }
    const diff = result.stdout || `Exit code ${exitCode}`;
    fs.writeFileSync(outputFile, diff, 'utf8');
    return true;
}

function compareRunnerCases(runners: RunnerResult[]): Map<string, Map<string, { mismatch: boolean; diffFile?: string }>> {
    const caseIds = new Set(runners.flatMap(runner => Object.keys(runner.cases)));
    const results = new Map<string, Map<string, { mismatch: boolean; diffFile?: string }>>();
    const emptyFile = path.resolve(projectRoot, 'artifacts/temp/crosscheck-empty.txt');
    fs.mkdirSync(path.dirname(emptyFile), { recursive: true });
    fs.writeFileSync(emptyFile, '', 'utf8');

    try {
        for (const id of caseIds) {
            const baseline = runners[0];
            const baselineCase = baseline.cases[id];
            const baselineText = baselineCase?.getOutputFile('docx.txt') ?? emptyFile;
            const runnerResults = new Map<string, { mismatch: boolean; diffFile?: string }>();

            for (const runner of runners.slice(1)) {
                const testCase = runner.cases[id];
                const missingRunnerCase = !testCase;
                const otherText = testCase?.getOutputFile('docx.txt') ?? emptyFile;
                const diffFile = missingRunnerCase
                    ? baselineCase?.getOutputFile('diff') ?? path.join(getRunnerDirectory(baseline.name), `${id}.diff`)
                    : testCase.getOutputFile('diff');
                const mismatch = compareFiles(baselineText, otherText, diffFile);
                runnerResults.set(runner.name, { mismatch, ...(mismatch ? { diffFile } : {}) });
            }
            results.set(id, runnerResults);
        }
    } finally {
        fs.rmSync(emptyFile, { force: true });
    }
    return results;
}

function relativeUrl(target: string): string {
    return path.relative(path.dirname(reportFile), target)
        .split(path.sep)
        .map(encodeURIComponent)
        .join('/');
}

function buildReportViews(
    runners: RunnerResult[],
    comparisons: Map<string, Map<string, { mismatch: boolean; diffFile?: string }>>,
): CrosscheckCaseView[] {
    const cases = new Map<string, TestCase>();
    for (const runner of runners) {
        for (const testCase of Object.values(runner.cases)) {
            if (!cases.has(testCase.id)) cases.set(testCase.id, testCase);
        }
    }

    return [...cases.values()].sort((a, b) =>
        a.inputFile.localeCompare(b.inputFile) || Number(a.inputLine) - Number(b.inputLine) || a.id.localeCompare(b.id)
    ).map(testCase => {
        const runnerCases = runners.map((runner, index): RunnerCaseView => {
            const runnerCase = runner.cases[testCase.id];
            const comparison = comparisons.get(testCase.id)?.get(runner.name);
            const mismatch = index > 0 && Boolean(comparison?.mismatch);
            const diffFile = comparison?.diffFile;
            return {
                name: runner.name,
                status: runnerCase && isSuccessful(runnerCase) ? 'SUCCESS' : 'FAILED',
                matching: mismatch ? 'MISMATCH' : 'MATCH',
                reportHref: `${relativeUrl(path.resolve(
                    projectRoot, conformanceRoot, `runner-${runner.name}.html`
                ))}#${testCase.id}`,
                ...(mismatch && diffFile && fs.existsSync(diffFile)
                    ? { diff: fs.readFileSync(diffFile, 'utf8') }
                    : {}),
            };
        });
        const issue = runnerCases.some(item => item.status === 'FAILED' || item.matching === 'MISMATCH');
        return {
            id: testCase.id,
            coverage: testCase.coverage,
            inputFile: testCase.inputFile,
            inputBaseName: path.basename(testCase.inputFile),
            inputLine: testCase.inputLine,
            inputHref: relativeUrl(path.resolve(projectRoot, testCase.inputFile)),
            issue,
            successAndMatch: !issue,
            runners: runnerCases,
        };
    });
}

function writeReports(runners: RunnerResult[], cases: CrosscheckCaseView[]): void {
    const counts = {
        success: cases.filter(testCase => testCase.successAndMatch).length,
        failed: cases.filter(testCase => !testCase.successAndMatch).length,
        total: cases.length,
    };
    const runnerRows = runners.map(runner => ({
        name: runner.name,
        exitCode: runner.exitCode,
        failed: runner.exitCode !== 0,
        href: relativeUrl(path.resolve(projectRoot, conformanceRoot, `runner-${runner.name}.html`)),
    }));
    const reportTemplate = template(fs.readFileSync(
        path.resolve(projectRoot, 'test/conformance/src/templates/crosscheck-report.html'), 'utf8'
    ));
    fs.mkdirSync(path.dirname(reportFile), { recursive: true });
    fs.writeFileSync(reportFile, reportTemplate({ runnerRows, cases, counts }), 'utf8');

    const markdownTemplate = template(fs.readFileSync(
        path.resolve(projectRoot, 'test/conformance/src/templates/crosscheck-report.md'), 'utf8'
    ));
    const markdown = markdownTemplate({ runnerRows, cases, counts })
        .replace(/\r\n?/g, '\n')
        .replace(/[ \t]+$/gm, '')
        .replace(/\n{3,}/g, '\n\n')
        .trimEnd() + '\n';
    fs.writeFileSync(markdownFile, markdown, 'utf8');
}

async function main(): Promise<void> {
    const { names, onlyDocx } = selectRunners(process.argv.slice(2));
    const runners = names.map((name, index) => runRunner(name, onlyDocx || index > 0));
    await writeTextRepresentations(runners);
    const comparisons = compareRunnerCases(runners);
    const cases = buildReportViews(runners, comparisons);
    writeReports(runners, cases);

    if (runners.some(runner => runner.exitCode !== 0)) {
        process.exitCode = Math.max(4, ...runners.map(runner => runner.exitCode));
    } else if (cases.some(testCase => testCase.issue)) {
        process.exitCode = 3;
    }
}

main().catch(error => {
    console.error(`Crosscheck failed: ${error instanceof Error ? error.stack ?? error.message : error}`);
    process.exitCode = 10;
});
