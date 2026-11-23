
import * as fs from 'node:fs';
import * as path from 'node:path';
import { TestCase } from './case-parser';
import { convertDocxFiles } from '../../../scripts/common/docx2pdf';
import { pdf2png } from './pdf2png';


const conversionBatch = 10;


export const conformanceRoot = 'artifacts/test/conformance';


export const runnersList = [
    'cli',
];


export function getRunnerDirectory(runnerName: string)
{
    return path.join(conformanceRoot, `runner-${runnerName}`);
}


async function processErrors(testCases: TestCase[]): Promise<void> {

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
        if (testCase.isSuccessRun()) {
            console.log('    Unexpected errors detected');
        }
    }

    for (const [i, testCase] of Object.entries(testCases)) {
        console.log(`Validating output ${Number(i) + 1} of ${testCases.length}: ${testCase.getOutputFile('doctml')}`);
        processOutputStatus(testCase);
    }
    await convertFromDocx();
    for (const [i, testCase] of Object.entries(testCases)) {
        console.log(`Interpreting errors ${Number(i) + 1} of ${testCases.length}: ${testCase.getOutputFile('doctml')}`);
        normalizeErrors(testCase);
        testCase.write();
    }
}

function generateRunnerReport(runnerName: string, dir: string, testCases: TestCase[])
{
    // Do not implement yet.
}

export async function finalizeRunner(runnerName: string, dir: string, testCases: TestCase[]): Promise<void>
{
    await processErrors(testCases);
    generateRunnerReport(runnerName, dir, testCases);
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
