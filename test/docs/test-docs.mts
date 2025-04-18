
import child_process from 'node:child_process';
import fs from 'node:fs';
import { Runner } from './runner.mts';
import { CliRunner } from './runner-cli.mts';
import { pdf2png } from './pdf2png.mts';
import { createGroups, Group } from './groups.mts';
import { CUR, mkdirFor } from './common.mts';


const MAX_GROUPS_AT_ONCE = 50;


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
        console.log(list.map(x => `Converting ${CUR}/${runnerName}/${x.stem}.docx -> .pdf and .html`).join('\n'));
        let res = child_process.spawnSync('powershell.exe',
            [
                '-ExecutionPolicy',
                'Bypass',
                '-File',
                'scripts\\docx-convert.ps1',
                ...list.map(x => `${CUR}/${runnerName}/${x.stem}.docx`)
            ], { stdio: 'inherit' });
        if (res.error) {
            throw res.error;
        } else if (res.status) {
            throw new Error(`Process exit code ${res.status}`);
        }
        for (let group of list) {
            mkdirFor(`${CUR}/rendered/${group.stem}.pdf`);
            fs.renameSync(
                `${CUR}/${runnerName}/${group.stem}.pdf`,
                `${CUR}/rendered/${group.stem}.pdf`);
            fs.renameSync(
                `${CUR}/${runnerName}/${group.stem}.html`,
                `${CUR}/rendered/${group.stem}.html`);
        }
    }
}

async function main() {
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
    let validGroups = groups.filter(g => g.errors.length === 0);
    await docx2pdf(validGroups, 'cli');
    await pdf2png(validGroups);

    // 6. Save results to "Results.html" report: List of test cases and expandable diff preview.
    // 7. If reference results available, compare them and generate "Compare.html" report.
}

main()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });



