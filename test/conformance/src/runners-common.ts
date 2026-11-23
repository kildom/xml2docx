
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

function processErrors(runnerName: string, dir: string, testCases: TestCase[])
{
    /* TODO: Implement this function as described below

    Do following steps in separate functions for cleaner code.

    Function 1: processOutputStatus

    Check status of running of the test case. Here is old implementation.
    New one should work the same, except result.status is in testCase.runStatus and it may be not only
    number, but also boolean if runner does not support exit code, just failure/success status.
    
    if (result.status === 0 && testCase.expectedErrors.length > 0) {
        errors.push({ message: 'DocTML CLI exit code is zero, but error was expected in this test case' });
    } else if (result.status !== 0 && testCase.expectedErrors.length === 0) {
        errors.push({
            message: `DocTML CLI exit code is ${result.status}, but not errors were expected in this test case`,
        });
    }

    if (result.status === 0) {
        if (!fs.existsSync(outputFile)) {
            errors.push({ message: `DocTML CLI did not create output DOCX file: ${outputFile}` });
        } else if (fs.statSync(outputFile).size === 0) {
            errors.push({ message: `DocTML CLI created an empty output DOCX file: ${outputFile}` });
        }
    } else if (fs.existsSync(outputFile)) {
        errors.push({
            message: `DocTML CLI created output DOCX file despite exit code ${result.status}: ${outputFile}`,
        });
    }

    Function 2: convertFromDocx

    if `--only-docx` command line argument is provided anywhere in the arguments list, return from this function immediately - do not convert docx file

    if conversion is expected, convert docx files to pdf, html and png
    - if test case docx file does not exists, skip conversion
    - group test cases into batches of length `conversionBatch`
    - convert batch with `convertDocxFiles`. If batch conversion fails, retry to convert one file at a time from batch.
      Note: use `getOutputFile` to get source and target file name.
      Note: `convertDocxFiles` assumes that pdf and html output file names are the same only extension is different - this is always true here, so you don't need to do additional copying
    - if conversion of single file fails, add to test case errors: "Conversion from DOCX to PDF or HTML failed."
    - if conversion success, but html or pdf is missing or it is empty:
      - add to test case errors: "Conversion from DOCX to PDF or HTML did not produced correct files."
      - if file is empty, remove it
    - if pdf exist and it is not empty, use `pdf2png` to convert pdf do png file.
    - if conversion fails or output file does not exists or it is empty, add to test case errors: "Conversion from PDF to PNG failed."

    Function 3: normalizeErrors

    For each test case, normalize error messages, so each error is in single array item:
    - join all error message array into single string with "\n" as separator
    - split into lines
    - trim end of each line
    - error starts with line without indentation and spans over all following lines with indentation - combine them together with "\n" as separator
    - now, we have normalized errors, put them back to TestCase.errors

    Compare normalized errors with expected errors:
    - go over all normalized errors
    - if any of the expected errors is a substring of normalized, then:
      - assign this expected error to normalized error (expectedMessage property of TestCaseError)
      - remove expected error from expected errors list (from expectedErrors of TestCase)

    Back in this function:
    
    Save all test cases metadata with `TestCase.write` method.

    */
}

function generateReport(runnerName: string, dir: string, testCases: TestCase[])
{
    // Do not implement yet.
}

export function finalizeRunner(runnerName: string, dir: string, testCases: TestCase[])
{
    processErrors(runnerName, dir, testCases);
    generateReport(runnerName, dir, testCases);
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
