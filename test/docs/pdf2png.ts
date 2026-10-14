import child_process from 'node:child_process';
import { CUR } from './common';
import { TestCase, TestCaseDoc } from './input';


function compileScript() {
    // Compile the script for faster execution
    let res = child_process.spawnSync('npx',
        [
            'esbuild',
            'scripts/pdf2png.mts',
            '--log-level=error',
            '--platform=node',
            '--format=esm',
            '--bundle',
            '--target=node18',
            '--outfile=dist/pdf2png.mjs'
        ], { stdio: 'inherit', shell: true });
    if (res.error) {
        throw res.error;
    } else if (res.status) {
        throw new Error(`Process exit code ${res.status}`);
    }
}

export async function pdf2png(testCases: TestCase[]) {
    let validCases = testCases.filter(x => x.type === 'doc' && x.error === '') as TestCaseDoc[];
    compileScript();
    let scale = '1.5';
    for (let testCase of validCases) {
        let pdfName = `${CUR}/rendered/${testCase.outputFileStem}.pdf`;
        let pngName = `${CUR}/rendered/${testCase.outputFileStem}.png`;
        console.log(`Converting ${pdfName} -> .png`);
        let res = child_process.spawnSync('node',
            [
                'dist/pdf2png.mjs',
                '--tests',
                '--scale',
                scale,
                pdfName,
                pngName,
            ], { stdio: 'inherit', shell: true });
        if (res.error) {
            throw res.error;
        } else if (res.status) {
            throw new Error(`Process exit code ${res.status}`);
        }
    }
}
