
import child_process from 'node:child_process';
import fs from 'node:fs';
import { Runner } from './runner.ts';
import { CliRunner } from './runner-cli.ts';
import { pdf2png } from './pdf2png.ts';
import { createGroups, Group } from './groups.ts';
import { CUR, mkdirFor } from './common.ts';
import { convertDocxFiles } from './docx2pdf.ts';
import * as parser from '../../scripts/gen-docs/parser.ts';
import * as template from '../../scripts/gen-docs/template.ts';


const MAX_GROUPS_AT_ONCE = 50;

let errors: string[] = [];

function addError(error: string) {
    errors.push(error);
}


async function doctml2docx(groups: Group[], runnerName: string) {
    let runner: Runner;
    runner = new CliRunner();
    for (let group of groups) {
        let from = `${CUR}/doctml/${group.stem}.doctml`;
        let to = `${CUR}/${runnerName}/${group.stem}.docx`;
        mkdirFor(to);
        console.log(`Converting ${from} -> .docx`);
        await runner.run(from, 'test/docs/include/data.json', to, {});
    }
    runner.stop();
}

async function docx2pdf(groups: Group[], runnerName: string) {
    let groupsPerCommand = MAX_GROUPS_AT_ONCE;
    for (let i = 0; i < groups.length; i += groupsPerCommand) {
        let list = groups.slice(i, i + groupsPerCommand);
        await convertDocxFiles(Object.fromEntries(
            list.map(x => [`${CUR}/${runnerName}/${x.stem}.docx`, `${CUR}/rendered/${x.stem}.pdf`])
        ));
    }
}

interface AttributeTest extends parser.AttributeDocs {
    groups: Group[];
}

interface TagTest extends parser.TagDocs {
    groups: Group[];
    attributes: Record<string, AttributeTest>;
}

async function main() {

    parser.parse();

    /*
    Outputs structure:
    - test/outputs
      - cur (current outputs)
        - doctml (groups inputs, just doctml files)
          - p-1.g0.doctml
          - p-1.g1.doctml
          - p-1.g2.doctml
          - ...
        - web ...
        - npm ...
        - api ...
        - cli (runner name, just generated docx files)
          - p-1.g0.docx
          - p-1.g1.docx
          - p-1.g2.docx
          - ...
        - rendered
          - p-1.g0.pdf
          - p-1.g0.html
          - p-1.g0.png
          - p-1.g1.pdf
          - p-1.g1.html
          - p-1.g1.png
          - p-1.g2.pdf
          - p-1.g2.html
          - p-1.g2.png
          - ...
        - Results.html
      - ref (reference outputs)
        ... structure the same as `cur`
      - Compare.html
    */

    // 1. Parse inputs.
    // 2. Generate DocTML files.
    let groups = createGroups();

    // 3. For each enabled runner, convert DocTML to docx.
    await doctml2docx(groups, 'cli');

    // 4. If more than one enabled runner, compare if all runners generated the same result.
    /* todo */

    // 5. Convert docx to pdf, html, png (use output from just one runner).
    let validGroups = groups.filter(g => g.expectedErrors.length === 0);
    await docx2pdf(validGroups, 'cli');
    await pdf2png(validGroups);


    let tags = parser.getTags() as TagTest[];
    let byName: Record<string, TagTest | AttributeTest> = {};
    let unassignedTag: TagTest = {
        attributes: {},
        brief: '',
        name: '__UNASSIGNED__',
        children: [],
        customPage: '',
        details: '',
        groupsAndChildren: [],
        indirectChildren: [],
        indirectParents: [],
        parents: [],
        groups: [],
    };

    tags.push(unassignedTag);

    for (let tag of tags) {
        byName[tag.name] = tag;
        tag.groups = [];
        for (let attribute of Object.values(tag.attributes)) {
            byName[`${tag.name}.${attribute.name}`] = attribute;
            attribute.groups = [];
        }
    }

    for (let group of groups) {
        for (let caseInfo of group.cases) {
            if (caseInfo.name in byName) {
                byName[caseInfo.name].groups.push(group);
            } else {
                unassignedTag.groups.push(group);
            }
        }
    }

    let reportTemplate = template.compileTemplate(fs.readFileSync('test/docs/report.template.html', 'utf8'));
    let html = reportTemplate({ tags: parser.getTags(), runner: 'cli' });
    fs.writeFileSync('test/outputs/cur/results.html', html);

    // 6. Save results to "Results.html" report: List of test cases and expandable diff preview.
    // 7. If reference results available, compare them and generate "Compare.html" report.
}

main()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });



