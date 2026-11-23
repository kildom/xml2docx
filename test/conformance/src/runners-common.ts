
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


export function finalizeRunner(runnerName: string, dir: string, testCases: TestCase[])
{
    /* TODO: Implement this function as described below

    if `--only-docx` command line argument is provided anywhere in the arguments list, set onlyDocx variable to true - it will be used later.

    if onlyDocx is false, convert docx files to pdf, html and png
    - if test case docx file does not exists, skip conversion
    - group test cases into batches of length `conversionBatch`
    - convert batch with `convertDocxFiles`. If batch conversion fails, convert one file at a time.
      Note: use `getOutputFile` to get source and target file name.
      Note: `convertDocxFiles` assumes that pdf and html output file names are the same only extension is different - this is always true here, so you don't need to do additional copying
    - if conversion of single file fails, add to test case errors: "Conversion from DOCX to PDF or HTML failed."
    - if conversion success, but html or pdf is missing or it is empty:
      - add to test case errors: "Conversion from DOCX to PDF or HTML did not produce correct files."
      - if file is empty, remove it
    - if pdf exist and it is not empty, use `pdf2png` to convert pdf do png file.
    - if conversion fails or output file does not exists or it is empty, add to test case errors: "Conversion from PDF to PNG failed."

    For each test case, normalize error messages, so each error is in single array item:
    - join all error message array into single string with "\n" as separator
    - split into lines
    - trim end of each line
    - error starts with line without indentation and spans over all following lines with indentation - combine them together with "\n" as separator
    - now, we have normalized errors

    Compare normalized errors with expected errors:
    - go over all normalized errors
    - if any of the expected errors is a substring of normalized, then:
      - assign this expected error to normalized error (expectedMessage property of TestCaseError)
      - remove expected error from expected errors list (from expectedErrors of TestCase)
    
    Save all test cases metadata with `TestCase.write` method.

    */
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
