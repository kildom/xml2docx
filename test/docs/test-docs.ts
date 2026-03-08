
import fs from 'node:fs';
import { Runner } from './runner.ts';
import { CliRunner } from './runner-cli.ts';
import { readTests } from './test-reader';
import { appendError, cloneTest, cloneTestInput, dataFileName, debugFilesContent, doctmlFileName, docxFileName, errorFileContent, errorFileName, getArgs, htmlFileName, infoFileContent, infoFileName, listTests, listTestsGrouped, outputRootDir, pdfFileName, pngFileName, removeTest, setOutputPath } from './common.ts';
import { convertDocxFiles } from './docx2pdf.ts';
import { pdf2png } from './pdf2png.ts';
import { NodeRunner } from './runner-api.ts';
import { generateReport } from './report.ts';
import { compareDocxFiles } from './docx-compare.ts';
import path from 'node:path';

const MAX_TESTS_IN_GROUP = 20;

const runners = [
    CliRunner,
    NodeRunner,
];

async function prepareTests(outputPath: string, inputPath: string, filterFiles: string[]) {
    console.log('Preparing tests...');
    // Set output directory
    setOutputPath(outputPath);
    // Clear output directory
    fs.rmSync(outputRootDir(), { force: true, recursive: true });
    // Clear old reports
    let outputParent = path.dirname(outputRootDir());
    for (let file of fs.readdirSync(outputParent, { encoding: 'utf-8' })) {
        if (file.startsWith(path.basename(outputPath) + '-')) {
            fs.rmSync(path.join(outputParent, file), { force: true, recursive: true });
        }
    }
    // Copy source test files to output directory
    fs.mkdirSync(outputRootDir(), { recursive: true });
    fs.cpSync(inputPath, outputRootDir(), { recursive: true });
    // Read and prepare test cases
    readTests(filterFiles);
}

async function runRunnerForTest(runner: Runner, outputId: string, inputId: string, sendFiles: boolean) {
    // Prepare input information
    let error = '';
    let doctmlFile = doctmlFileName(inputId);
    let dataFile = dataFileName(inputId);
    let docxFile = docxFileName(outputId);
    let errorFile = errorFileName(outputId);
    console.log(`Processing file ${doctmlFile}...`);
    // Prepare input files to send if needed
    let inputFiles = Object.create(null);
    if (sendFiles) {
        inputFiles[doctmlFile] = fs.readFileSync(doctmlFile);
        inputFiles[dataFile] = fs.readFileSync(dataFile);
    }
    try {
        // Run the DocTML conversion
        let output = await runner.run(
            doctmlFile,
            dataFile,
            docxFile,
            inputFiles
        );
        // Save output files
        for (let [name, value] of Object.entries(output)) {
            if (name !== 'error') {
                name = name.replace(/\\/g, '/');
                let prefix = docxFile.replace('.docx', '').replace(/\\/g, '/');
                if (!name.startsWith(prefix)) {
                    error += `Unexpected output file ${name} for test ${outputId}, expected prefix ${prefix}\n`;
                }
                fs.writeFileSync(name, value);
            }
        }
        // Check output errors
        if (output.error) {
            error += output.error + '\n';
        } else if (!fs.existsSync(docxFile)) {
            error += 'No DOCX file generated.\n';
        } else if (fs.statSync(docxFile).size === 0) {
            error += 'Generated DOCX file is empty.\n';
        }
    } catch (err) {
        error += `Unexpected exception: ${err}`.replace(/\n/g, ' ') + '\n';
    }

    // Save error information
    fs.writeFileSync(errorFile, error, 'utf-8');
}

async function runRunner(runner: Runner, doneRunners: string[]) {
    console.log(`Starting runner ${runner.name}...`);
    let sendFiles = await runner.start();

    try {
        // Send include files to runner if needed
        if (sendFiles) {
            let includeFiles = Object.create(null);
            for (let file of fs.readdirSync('test/docs/include', { recursive: true, encoding: 'utf-8' })) {
                includeFiles[`test/docs/include/${file}`] = fs.readFileSync(`test/docs/include/${file}`);
            }
            console.log(`Sending ${Object.keys(includeFiles).length} include files...`);
            await runner.addFiles(includeFiles);
        }

        let groupedIds = listTestsGrouped();
        for (let [baseId, ids] of Object.entries(groupedIds)) {
            let first = (doneRunners.length === 0);
            let outputId = first ? baseId : `${baseId}-${runner.name}`;
            let inputId = ids[0];
            await runRunnerForTest(runner, outputId, inputId, sendFiles);
            if (!first && ids.length === 1) {
                // Compare with previous output only if there is something to compare with and there were no differences before.
                let matching = await compareResults(inputId, outputId);
                if (matching) {
                    // If the results match previous output, we can remove new output.
                    removeTest(outputId);
                } else {
                    // Differences detected, we need to clone all test files for all previous runners.
                    let errorText = `Difference detected between runner ${runner.name} and previous runners (${doneRunners.join(', ')}).`;
                    appendError(inputId, errorText);
                    appendError(outputId, errorText);
                    console.log(`Detected difference for ${baseId}`);
                    for (let runnerName of doneRunners) {
                        console.log(`    Cloning test for runner ${runnerName}...`);
                        cloneTest(inputId, `${baseId}-${runnerName}`);
                    }
                    // Clone just input files for current runner, because output files are already generated.
                    cloneTestInput(inputId, outputId);
                    // Mask all tests in this group as separateRunners.
                    for (let runnerName of [...doneRunners, runner.name]) {
                        let id = `${baseId}-${runnerName}`;
                        let info = infoFileContent(id);
                        info.separateRunners = true;
                        info.id = id;
                        fs.writeFileSync(infoFileName(id), JSON.stringify(info, null, 2), 'utf-8');
                    }
                    // Remove original test.
                    removeTest(inputId);
                }
            }
        }

    } finally {
        await runner.stop();
    }
}

async function compareResults(inputId: string, outputId: string): Promise<boolean> {
    let inputFiles = debugFilesContent(inputId);
    inputFiles['error'] = errorFileContent(inputId);
    let outputFiles = debugFilesContent(outputId);
    outputFiles['error'] = errorFileContent(outputId);
    for (let type in inputFiles) {
        if (inputFiles[type] !== (outputFiles[type] ?? '')) {
            return false;
        }
    }
    for (let type in outputFiles) {
        if (outputFiles[type] !== (inputFiles[type] ?? '')) {
            return false;
        }
    }
    return await compareDocxFiles(docxFileName(inputId), docxFileName(outputId));
}

async function runDocTML(filterRunners: string[]) {
    let doneRunners: string[] = [];
    for (let RunnerClass of runners) {
        let runner = new RunnerClass();
        if (filterRunners.length > 0 && !filterRunners.includes(runner.name)) {
            continue;
        }
        await runRunner(runner, doneRunners);
        doneRunners.push(runner.name);
    }
}

async function renderTests() {
    console.log('Rendering tests to PDF, HTML and PNG...');
    let tests = listTests();
    let filesToConvert: { docxFile: string, pdfFile: string, testId: string }[] = [];
    for (let testId of tests) {
        let docxFile = docxFileName(testId);
        if (fs.existsSync(docxFile)) {
            let pdfFile = pdfFileName(testId);
            filesToConvert.push({ docxFile, pdfFile, testId });
        }
    }
    let index = 0;
    let batchSize = MAX_TESTS_IN_GROUP;
    let resetBatchSizeAt = MAX_TESTS_IN_GROUP;
    while (index < filesToConvert.length) {
        if (index === resetBatchSizeAt) {
            batchSize = MAX_TESTS_IN_GROUP;
            resetBatchSizeAt += MAX_TESTS_IN_GROUP;
        }
        let batch = filesToConvert.slice(index, index + batchSize);
        console.log('Converting batch of files to PDF and HTML:');
        for (let { docxFile } of batch) {
            console.log(`    ${docxFile}`);
        }
        try {
            await convertDocxFiles(Object.fromEntries(batch.map(x => [x.docxFile, x.pdfFile])));
            // Entire batch processed successfully, move to the next batch
            index += batchSize;
        } catch (err) {
            if (batchSize === 1) {
                console.log('    FAILED');
                // Batch size is already 1, we cannot split it further, so this file is problematic.
                appendError(filesToConvert[index].testId, `Error during DOCX to PDF/HTML conversion: ${err}\n`);
                index++;
            } else {
                console.log('    FAILED, retrying file by file...');
                // Some file in the batch caused an error, we need to split the batch and try again.
                batchSize = 1;
            }
        }
    }

    for (let { docxFile, pdfFile, testId } of filesToConvert) {

        try {
            if (!fs.existsSync(htmlFileName(testId))) {
                appendError(testId, 'HTML file is missing\n');
            }
            if (fs.existsSync(pdfFile)) {
                console.log(`Converting ${pdfFile} to PNG...`);
                pdf2png(pdfFile, pngFileName(testId));
            } else {
                appendError(testId, 'PDF file is missing\n');
            }
        } catch (err) {
            appendError(testId, `Error during PDF to PNG conversion: ${err}\n`);
        }
    }
}

async function main() {

    let { args, files: filterFiles, runners: filterRunners } = getArgs();

    /* STAGE 1:
     * - Read input DocTML files
     * - Divide into test cases
     * - Parse and save test cases metadata, e.g. input file, index, coverage, expected errors, etc.
     * - Any error at this stage stops testing, because it means that test cases are not defined
     *   correctly and cannot be run at all.
     */

    await prepareTests(args[0] ?? 'test/outputs/cur', args[1] ?? 'test/docs/data', filterFiles);

    /* STAGE 2:
     * For each runner:
     * - Run test cases and save generated DOCX files, debug files and errors.
     * - If some test case produces different results than previous runner,
     *   clone this test for each runner and add error message in all of them.
     * - If DOCX file was not generated, add error message to test case.
     */

    await runDocTML(filterRunners);

    /* STAGE 3:
     * For each test case:
     * - Convert generated DOCX to PDF, HTML and PNG (if possible).
     * - Add appropriate error message to test case if conversion fails.
     */

    await renderTests();

    /* STAGE 4:
     * - Compare generated errors with expected errors and determine test success.
     * - Generate report in HTML format with test cases sorted by: input file, index, runner.
     * - Generate report in HTML, but only with failing test cases.
     * - Include coverage of documented tags and attributes.
     */

    await generateReport();

}


main()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
