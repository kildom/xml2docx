
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
        // TODO: Add above and call here function checkCoverage that checks if all tags and attributes defined in coverage of this test case are actually available in `coverage` parameter. If not, add error to test case.
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
    /* TODO: Implement as described below

    Create interactive test report for the runner.
    Use templating to produce it. You can use `template` function from `underscore` module as in other
    parts of this project. Template file is empty for now - need to be implemented. It is in 
    `test/conformance/src/templates/runner-report.html`. It will contain CSS, JS and templated HTML.
    The output HTML must be self-contained except references to test results.
    The output location is `artifacts/test/conformance/runner-${runnerName}.html`.

    The report will have following sections. Each section is collapsible (can be hidden) and it is visible by default:
    - Test cases results section. In the title, also contains total number of test cases failed (on red), success (on green), and both (gray)
      - At the beginning, there is a button that allows to filter test cases: "Only failures", if clicked, success test cases are hidden and the button label is now "All tests"
      - Test cases are ordered by inputFile first, inputLine next.
      - Each input file section start with file name as a header with id, so it can be linked
      - Test case is a card (that is red-ish if test is failure, white or almost-white gray on success).
        - The test case id is in HTML id to allow navigate to specific test case with `#<id>` URL.
        - The identification information is located at top right corner of the card as smaller, gray text that contains:
            - Source file name (inputFile) only base name, as a link to that file (relative path) with target "_blank"
            - Source file line (inputLine)
            - Test case id
        - Next, there is a coverage information, each item in single line, that looks like card title, but font should not be bigger than other text. The tag and attribute should be bold and title should be gray.
        - Next, there is tab view that allows to switch between different information of the test case. If test is a failure, the "Errors" tab is active by default. If success, no tab is active by default.
        - The following tabs should be implemented:
          - `Errors` - show errors from test case run (TestCase.errors).
             - If some error is expected show it with default background and highlight the expected substring of error message with light green text background.
             - If some error is not expected show it with light red background.
             - If some expected errors did not happen (TestCase.expectedErrors is not empty), show label "Expected errors that did not happen" and show them below with light red background.
             - If nothing to show (both errors and expectedErrors are empty), do now show `Errors` tab.
          - `DocTML` - show doctml source code of the test case (TestCase.readCode() result)
            Content should be lazy-created when user clicks the tab to avoid overwhelming page with too much elements.
          - `JSON` - show template data JSON (TestCase.readData() result). This tab only exists if data exists.
            Content should be lazy-created when user clicks the tab to avoid overwhelming page with too much elements.
          - `DOCX` - this is actually not a tab, but relative link to test case docx file that opens in new window (exists only if docx file actually exists)
          - `PDF` - show PDF in iframe (full width and 40% of vertical view), above iframe is a button that is a relative link to pdf that opens in new window (exists only if pdf file actually exists).
            The iframe should be lazy-created when user clicks the tab to avoid overwhelming page with iframes.
          - `HTML` - show HTML source code (not preview) (full width and 40% of vertical view)
            Content should be lazy-created when user clicks the tab to avoid overwhelming page with too much elements.
            This tab should not exists if HTML file does not exists
          - `PNG` - show PNG image (full width and 40% of vertical view)
            Content should be lazy-created when user clicks the tab to avoid overwhelming page with too much elements.
            This tab should not exists if PNG file does not exists
          - Create one tab per one debug file that was produced when DocTML tool worked.
            Use `TestCase.getDebugFiles` method. It is not implemented yet - you need to implement.
            Remove test id and "debug" string from file name and use it as tab name.
            Show the debug file as a source code.
            Content should be lazy-created when user clicks the tab to avoid overwhelming page with too much elements.
    - Input files section.
      - Contains input (source file) summary table
      - one row for each input source test file, just base name, no dir, not the file name with id, but the original file that contains multiple test cases (the inputFile property of TestCase)
      - each row contains total number of test cases failed (on red), success (on green), and both (gray) in that source file
      - file name is a link to input file header in cases results section.
        The link must have special onmousedown event that expands cases results section if collapsed.
    - Coverage section
      - It contains table with all tags and attributes
      - The list of all tags and attributes must be read from `artifacts/test/conformance/docs/tags.json`
      - If some tag or attribute from test case does not exists in `tags.json`, add it (error reporting was be done before).
      - Sort table by tag name first, attribute name next
      - Each row contains number of test cases failed (on red), success (on green), and both (gray) for this tag or attribute
      - The row is expandable:
        - after expansion, it shows list of test cases that cover that tag or attribute.
        - shows only titles (no need to repeat tag or attribute name)
        - each item in list shows if it is failure or success
        - failures has light red background
        - title is a link to actual test case in cases results section
          The link must have special onmousedown event that expands cases results section if collapsed.

    Use modern and readable style, layout and graphics.

    */
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
    generateRunnerReport(runnerName, dir, testCases);
    // TODO: go over all test cases, if any of them failed, set process exit code to 4 if it is not set or below 4
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
