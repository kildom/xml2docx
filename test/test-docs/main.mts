
import child_process from 'node:child_process';
import * as mupdf from 'mupdf';
import fs from 'node:fs';
import { Runner } from './runner';
import { CliRunner } from './runner-cli';
import path from 'node:path';

async function doctml2docx() {
    let outputs: string[] = [];
    let runner: Runner;
    runner = new CliRunner();
    let passFiles = await runner.start();
    for (let file of fs.readdirSync('test/docs', { recursive: true, encoding: 'utf-8' })) {
        console.log(`Processing ${file}`);
        let inputFile = `test/docs/${file}`;
        let outputFile = `test/outputs/${file.replace(/\.doctml$/, '.docx')}`;
        let outputDir = path.dirname(outputFile);
        fs.mkdirSync(outputDir, { recursive: true });
        runner.run(inputFile, 'test/include/data.json', outputFile, {});
        outputs.push(outputFile);
    }
    runner.stop();
    return outputs;
}


async function main() {
    let docxFiles = await doctml2docx();
    await docx2pdf(docxFiles);
    await pdf2png(docxFiles);
}

async function docx2pdf(docxFiles: string[]) {
    for (let docxFile of docxFiles) {
        console.log(`Converting ${docxFile} to PDF`);
        let pdfFile = docxFile.replace(/\.docx$/, '.pdf');
        let res = child_process.spawnSync('powershell.exe', [
            '-ExecutionPolicy',
            'Bypass',
            '-File',
            'scripts\\docx2pdf.ps1',
            docxFile,
            pdfFile], { stdio: 'inherit' });
        if (res.error) {
            throw res.error;
        } else if (res.status) {
            throw new Error(`Process exit code ${res.status}`);
        }
    }
}

async function pdf2png(docxFiles: string[]) {
    for (let docxFile of docxFiles) {
        console.log(`Converting ${docxFile} to PNG`);
        let pdfFile = docxFile.replace(/\.docx$/, '.pdf');
        let pngFilePatten = docxFile.replace(/\.docx$/, '.$.png');
        let buffer = fs.readFileSync(pdfFile);
        let doc = mupdf.Document.openDocument(buffer, 'application/pdf');
        let pages = doc.countPages();
        for (let i = 0; i < pages; i++) {
            process.stdout.write(`\r    page ${i + 1} / ${pages}.`);
            let page = doc.loadPage(i);
            let pixmap = page.toPixmap(mupdf.Matrix.scale(2, 2), mupdf.ColorSpace.DeviceRGB);
            fs.writeFileSync(pngFilePatten.replace('$', (i + 1).toString()), pixmap.asPNG());
        }
        console.log(`\r    ${pages} pages converted.`);
    }
}

main()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
