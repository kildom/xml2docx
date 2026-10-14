
import child_process from 'node:child_process';
import fs from 'node:fs';
import { Runner } from './runner';
import { CliRunner } from './runner-cli';
import { pdf2png } from './pdf2png';
import { CUR, mkdirFor } from './common';
import { TagDocs, AttributeDocs, parse, getTags } from '../../scripts/gen-docs/parser';
import { compileTemplate } from '../../scripts/gen-docs/template';
import { markdownToHtml } from '../../scripts/gen-docs/markdown';
import { prepareInput, TestCase, TestCaseDoc } from './input';

const MAX_GROUPS_AT_ONCE = 50;


async function doctml2docx(testCases: TestCase[], runnerName: string) {
    let validCases = testCases.filter(x => x.type === 'doc' && x.error === '') as TestCaseDoc[];
    let runner: Runner;
    runner = new CliRunner();
    for (let testCase of validCases) {
        let from = `${CUR}/doctml/${testCase.outputFileStem}.doctml`;
        let to = `${CUR}/${runnerName}/${testCase.outputFileStem}.docx`;
        mkdirFor(to);
        console.log(`Converting ${from} -> .docx`);
        try {
            await runner.run(from, 'test/docs/include/data.json', to, []);
        } catch (err) {
            if (err && typeof err === 'object' && typeof err.message === 'string') {
                testCase.error = err.message;
            } else {
                testCase.error = `Error: ${err}`;
            }
        }
    }
    runner.stop();
}

async function docx2pdf(testCases: TestCase[], runnerName: string) {
    let validCases = testCases.filter(x => x.type === 'doc' && x.error === '') as TestCaseDoc[];
    let groupsPerCommand = MAX_GROUPS_AT_ONCE;
    for (let i = 0; i < validCases.length; i += groupsPerCommand) {
        let list = validCases.slice(i, i + groupsPerCommand);
        console.log(list.map(x => `Converting ${CUR}/${runnerName}/${x.outputFileStem}.docx -> .pdf and .html`).join('\n'));
        let res = child_process.spawnSync('powershell.exe',
            [
                '-ExecutionPolicy',
                'Bypass',
                '-File',
                'scripts\\docx-convert.ps1',
                ...list.map(x => `${CUR}/${runnerName}/${x.outputFileStem}.docx`)
            ], { stdio: 'inherit' });
        if (res.error || res.status) {
            if (groupsPerCommand > 1) {
                groupsPerCommand = 1;
                i -= groupsPerCommand;
            } else {
                validCases[i].error = 'Error converting docx to pdf and html: '
                    + (res.error?.message || `Process exit code ${res.status}`);
            }
            continue;
        }
        for (let group of list) {
            mkdirFor(`${CUR}/rendered/${group.outputFileStem}.pdf`);
            fs.renameSync(
                `${CUR}/${runnerName}/${group.outputFileStem}.pdf`,
                `${CUR}/rendered/${group.outputFileStem}.pdf`);
            fs.renameSync(
                `${CUR}/${runnerName}/${group.outputFileStem}.html`,
                `${CUR}/rendered/${group.outputFileStem}.html`);
        }
    }
}


async function genResults(groups: Group[]) {
    parse();
    let tags = getTags() as TagTests[];
    let groupsByName: { [key: string]: Group[] } = {};
    for (let group of groups) {
        for (let testCase of group.cases) {
            groupsByName[testCase.name] = groupsByName[testCase.name] ?? [];
            groupsByName[testCase.name].push(group);
        }
    }
    for (let tag of tags) {
        for (let [name, value] of Object.entries(tag.attributes)) {
            value.testGroups = [];
            for (let group of groupsByName[`${tag.name}.${name}`] ?? []) {
                value.testGroups.push(group);
            }
            delete groupsByName[`${tag.name}.${name}`];
            if (value.testGroups.length === 0) {
                value.testGroups.push({
                    inputFile: '[no file]',
                    stem: 'no-file',
                    expectedErrors: [],
                    error: 'No test found',
                    success: false,
                    cases:[{
                        name: `${tag.name}.${name}`,
                        desc: 'All attributes must be tested.',
                    }],
                });
            }
        }
        tag.testGroups = [];
        for (let group of groupsByName[tag.name] ?? []) {
            tag.testGroups.push(group);
        }
        delete groupsByName[tag.name];
        if (tag.testGroups.length === 0) {
            tag.testGroups.push({
                inputFile: '[no file]',
                stem: 'no-file',
                expectedErrors: [],
                error: 'No test found',
                success: false,
                cases:[{
                    name: tag.name,
                    desc: 'All tag must be tested.',
                }],
            });
        }
    }
    let templateText = fs.readFileSync('test/docs/results.template.html', 'utf-8');
    let template = compileTemplate(templateText);
    let html = template({ tags, markdownToHtml, fs });
    fs.writeFileSync(`${CUR}/results.html`, html);
}

function checkErrors(groups: Group[]) {
    for (let group of groups) {
        if (group.error) {
            if (group.expectedErrors.length > 0) {
                group.success = group.expectedErrors.every(x => group.error?.toLowerCase().includes(x.toLowerCase().trim()));
            } else {
                group.success = false;
            }
        } else {
            if (group.expectedErrors.length > 0) {
                group.success = false;
            } else {
                group.success = true;
            }
        }
    }
}


async function main() {

    // 1. Parse inputs.
    // 2. Generate DocTML files.
    let { tags, testCases } = prepareInput();

    // 3. For each enabled runner, convert DocTML to docx.
    await doctml2docx(testCases, 'cli');

    // 4. If more than one enabled runner, compare if all runners generated the same result.
    /* todo */

    // 5. Convert docx to pdf, html, png (use output from just one runner).
    await docx2pdf(testCases, 'cli');
    await pdf2png(testCases);
    //checkErrors(groups);

    // 6. Save results to "Results.html" report: List of test cases and expandable diff preview.
    //await genResults(groups);
    // 7. If reference results available, compare them and generate "Compare.html" report.
}

main()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });

