
import child_process from 'node:child_process';
import * as mupdf from 'mupdf';
import fs from 'node:fs';
import { Runner } from './runner.mts';
import { CliRunner } from './runner-cli.mts';
import path from 'node:path';


const MAX_GROUPS_AT_ONCE = 50;


interface Group {
    inputFile: string;
    outputStem: string;
    doctmlFile: string;
    docxFile: string;
    pdfFile: string;
    htmlFile: string;
    pngFile: string;
    cases: { name: string; desc: string; }[];
    errors: string[];
};

function createGroups(): Group[] {
    let groups: Group[] = [];

    for (let file of fs.readdirSync('test/docs', { recursive: true, encoding: 'utf-8' })) {
        let inputFile = `test/docs/${file}`;
        let stem = `test/outputs/${file.replace(/\.doctml$/, '')}`;
        fs.mkdirSync(path.dirname(stem), { recursive: true });
        let content = fs.readFileSync(inputFile, 'utf-8');
        let parts = content.split(/<!--\s*\n(.*?)\n\s*-->/gs);
        if (parts.length === 1) {
            throw new Error(`Missing test cases in ${inputFile}`);
        }
        if (parts.at(-2)!.trim().toUpperCase() !== 'END') {
            parts.push('END', '');
        }
        let header = parts.shift()!;
        let footer = parts.pop()!;
        parts.pop();
        for (let i = 0; i < parts.length; i += 2) {
            let groupIndex = i >> 1;
            let casesText = parts[i];
            let body = parts[i + 1];
            let { cases, errors } = parseGroupCases(casesText);
            let outputStem = `${stem}.g${groupIndex}`;
            let doctmlFile = `${outputStem}.doctml`;
            let docxFile = `${outputStem}.docx`;
            let pdfFile = `${outputStem}.pdf`;
            let htmlFile = `${outputStem}.html`;
            let pngFile = `${outputStem}.png`;
            fs.writeFileSync(doctmlFile, header + body + footer);
            groups.push({
                inputFile,
                outputStem,
                doctmlFile,
                docxFile,
                pdfFile,
                htmlFile,
                pngFile,
                cases,
                errors,
            });
        }
    }

    return groups;
}

function parseGroupCases(casesText: string) {
    let casesLines = casesText
        .split('\n')
        .map(x => x.trim())
        .filter(x => x);
    let cases: { name: string, desc: string }[] = [];
    let errors: string[] = [];
    for (let line of casesLines) {
        let m = line.match(/^(.*?):(.*)$/);
        if (!m) {
            throw new Error(`Invalid test case line: ${line}`);
        }
        let name = m[1].trim().toLowerCase();
        let desc = m[2].trim();
        if (name !== 'error') {
            cases.push({ name, desc });
        } else {
            errors.push(desc);
        }
    }
    return { cases, errors };
}

async function doctml2docx(groups: Group[]) {
    let runner: Runner;
    runner = new CliRunner();
    for (let group of groups) {
        console.log(`Converting ${group.doctmlFile} -> .docx`);
        await runner.run(group.doctmlFile, 'test/include/data.json', group.docxFile, {});
    }
    runner.stop();
}

async function docx2pdf(groups: Group[]) {
    let groupsPerCommand = MAX_GROUPS_AT_ONCE;
    for (let i = 0; i < groups.length; i += groupsPerCommand) {
        let list = groups
            .slice(i, i + groupsPerCommand)
            .map(x => x.docxFile);
        console.log(list.map(x => `Converting ${x} -> .pdf and .html`).join('\n'));
        let res = child_process.spawnSync('powershell.exe',
            [
                '-ExecutionPolicy',
                'Bypass',
                '-File',
                'scripts\\docx-convert.ps1',
                ...list
            ], { stdio: 'inherit' });
        if (res.error) {
            throw res.error;
        } else if (res.status) {
            throw new Error(`Process exit code ${res.status}`);
        }
    }
}

const pageSeparatorHeight = 16;
const cutSeparatorHeight = 16;

interface Page {
    number: number;
    width: number;
    height: number;
    cutBegin: number;
    cutEnd: number;
}

async function pdf2png(groups: Group[]) {
    let scale = 1.5;
    let blankRemovalLimit = Math.round(80 * scale);
    let blankRemovalMargin = Math.round(10 * scale);
    for (let group of groups) {
        console.log(`Converting ${group.pdfFile} -> .png`);
        let buffer = fs.readFileSync(group.pdfFile);
        let doc = mupdf.Document.openDocument(buffer, 'application/pdf');
        let countPages = doc.countPages();
        let pages: Page[] = [];
        for (let i = 0; i < countPages; i++) {
            let ladedPage = doc.loadPage(i);
            let pixmap = ladedPage.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB);
            if (pixmap.getAlpha() || pixmap.getColorSpace()?.getType() !== mupdf.ColorSpace.DeviceRGB?.getType()) {
                throw new Error('Unexpected pixmap format');
            }
            let stride = pixmap.getStride();
            let width = pixmap.getWidth();
            let height = pixmap.getHeight();
            let pixels = pixmap.getPixels();
            let background = pixels[0] | (pixels[1] << 8) | (pixels[2] << 16);
            // Find blank rows of pixels
            let blankRows = new Uint8Array(height + 1);
            rowByRowLoop:
            for (let y = 0; y < height; y++) {
                let offset = y * stride;
                for (let x = 0; x < width; x++, offset += 3) {
                    let color = pixels[offset] | (pixels[offset + 1] << 8) | (pixels[offset + 2] << 16);
                    if (color !== background) {
                        blankRows[y] = 0;
                        continue rowByRowLoop;
                    }
                }
                blankRows[y] = 1;
            }
            blankRows[height] = 0;
            let biggestBlankBegin = 0;
            let biggestBlankEnd = 0;
            let currentBlackBegin = 0;
            for (let y = 1; y <= height; y++) {
                let prev = blankRows[y - 1];
                let now = blankRows[y];
                if (prev && !now) {
                    let size = y - currentBlackBegin;
                    if (size > biggestBlankEnd - biggestBlankBegin) {
                        biggestBlankBegin = currentBlackBegin;
                        biggestBlankEnd = y;
                    }
                } else if (!prev && now) {
                    currentBlackBegin = y;
                }
            }
            if (biggestBlankEnd - biggestBlankBegin >= blankRemovalLimit) {
                pages.push({
                    number: i,
                    width,
                    height,
                    cutBegin: biggestBlankBegin + blankRemovalMargin,
                    cutEnd: biggestBlankEnd - blankRemovalMargin,
                });
            } else {
                pages.push({
                    number: i,
                    width,
                    height,
                    cutBegin: 0,
                    cutEnd: 0,
                });
            }
        }

        let outputWidth = pages.reduce((a, x) => Math.max(a, x.width), 0);
        let outputHeight = pages.reduce((a, x) => (a
            + x.height - (x.cutEnd - x.cutBegin)
            + (x.cutEnd === 0 ? 0 : cutSeparatorHeight)), 0);
        outputHeight += (pages.length - 1) * pageSeparatorHeight;
        let outputPixmap = new mupdf.Pixmap(mupdf.ColorSpace.DeviceRGB, [0, 0, outputWidth, outputHeight], false);
        let outputPixels = outputPixmap.getPixels();
        let outputStride = outputPixmap.getStride();
        let outputY = 0;
        for (let page of pages) {
            console.log(page);
            let ladedPage = doc.loadPage(page.number);
            let pixmap = ladedPage.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB);
            let stride = pixmap.getStride();
            let width = pixmap.getWidth();
            let height = pixmap.getHeight();
            let pixels = pixmap.getPixels();
            outputPixels = outputPixmap.getPixels();
            if (page.cutEnd === 0) {
                for (let y = 0; y < page.height; y++) {
                    copyImageRow(outputPixels, outputY * outputStride, outputWidth, pixels, y * stride, width);
                    outputY++;
                }
            } else {
                for (let y = 0; y < page.cutBegin; y++) {
                    copyImageRow(outputPixels, outputY * outputStride, outputWidth, pixels, y * stride, width);
                    outputY++;
                }
                drawCutSeparator(outputPixels, outputY * outputStride, outputStride, page.cutEnd - page.cutBegin);
                outputY += cutSeparatorHeight;
                for (let y = page.cutEnd; y < page.height; y++) {
                    copyImageRow(outputPixels, outputY * outputStride, outputWidth, pixels, y * stride, width);
                    outputY++;
                }
            }
            if (page.number < pages.length - 1) {
                drawPageSeparator(outputPixels, outputY * outputStride, outputStride);
                outputY += pageSeparatorHeight;
            }
        }
        console.log(outputY, outputHeight);
        let png = outputPixmap.asPNG();
        fs.writeFileSync(group.pngFile, png);
    }
}


function copyImageRow(
    outputPixels: Uint8ClampedArray,
    outputOffset: number,
    outputWidth: number,
    inputPixels: Uint8ClampedArray,
    inputOffset: number,
    inputWidth: number
) {
    let margin = (outputWidth - inputWidth) >> 1;
    outputPixels.fill(0x70, outputOffset, outputOffset + 3 * margin);
    outputOffset += 3 * margin;
    outputPixels.set(inputPixels.slice(inputOffset, inputOffset + 3 * inputWidth), outputOffset);
    outputOffset += 3 * inputWidth;
    outputPixels.fill(0x70, outputOffset, 3 * outputWidth);
}


function drawCutSeparator(
    pixels: Uint8ClampedArray,
    offset: number,
    stride: number,
    label: number,
) {
    let half = cutSeparatorHeight >> 1;
    //pixels.fill(0x70, offset, offset + half * stride);
    let pong = half - 1;
    let dir = -1;
    let x = 0;
    while (x < stride - 2) {
        let y: number;
        for (y = 0; y < pong; y++) {
            pixels[offset + y * stride + x] = 0xFF;
            pixels[offset + y * stride + x + 1] = 0xFF;
            pixels[offset + y * stride + x + 2] = 0xFF;
        }
        pixels[offset + y * stride + x] = 0x00;
        pixels[offset + y * stride + x + 1] = 0x00;
        pixels[offset + y * stride + x + 2] = 0x00;
        for (y = y + 1; y < pong + half; y++) {
            pixels[offset + y * stride + x] = 0x70;
            pixels[offset + y * stride + x + 1] = 0x70;
            pixels[offset + y * stride + x + 2] = 0x70;
        }
        pixels[offset + y * stride + x] = 0x00;
        pixels[offset + y * stride + x + 1] = 0x00;
        pixels[offset + y * stride + x + 2] = 0x00;
        for (y = y + 1; y < cutSeparatorHeight; y++) {
            pixels[offset + y * stride + x] = 0xFF;
            pixels[offset + y * stride + x + 1] = 0xFF;
            pixels[offset + y * stride + x + 2] = 0xFF;
        }
        pong += dir;
        x += 3;
        if (pong === half - 1 || pong === 0) {
            dir = -dir;
        }
    }
    let digits = [... label.toString()].map(x => x.charCodeAt(0) - '0'.charCodeAt(0));
    for (let i = 0; i < digits.length; i++) {
        pixels[offset + 3 * i] = 28 * digits[i];
        pixels[offset + 3 * i + 1] = 28 * digits[i];
        pixels[offset + 3 * i + 2] = 28 * digits[i];
    }
}

function drawPageSeparator(
    pixels: Uint8ClampedArray,
    offset: number,
    stride: number,
) {
    pixels.fill(0x00, offset, offset + stride);
    pixels.fill(0x70, offset + stride, offset + (pageSeparatorHeight - 1) * stride);
    pixels.fill(0x00, offset + (pageSeparatorHeight - 1) * stride, offset + pageSeparatorHeight * stride);
}

async function main() {
    let groups = createGroups();
    //await doctml2docx(groups);
    let validGroups = groups.filter(g => g.errors.length === 0);
    //await docx2pdf(validGroups);
    await pdf2png(validGroups);
}


function testGroup(testText: string, cases: { name: string; desc: string; }[], errors: string[], outputStem: string, groupIndex: number) {
    let doctmlFile = `${outputStem}.g${groupIndex}.doctml`;
    let docxFile = `${outputStem}.g${groupIndex}.docx`;
    let pdfFile = `${outputStem}.g${groupIndex}.pdf`;
    let htmlFile = `${outputStem}.g${groupIndex}.html`;
    fs.writeFileSync(doctmlFile, testText);
    runner.run(doctmlFile, 'test/include/data.json', docxFile, {});
    let res = child_process.spawnSync('powershell.exe', [
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        'scripts\\docx-convert.ps1',
        docxFile,
        pdfFile], { stdio: 'inherit' });
    if (res.error) {
        throw res.error;
    } else if (res.status) {
        throw new Error(`Process exit code ${res.status}`);
    }
}


async function docx2pdf_old(docxFiles: string[]) {
    for (let docxFile of docxFiles) {
        console.log(`Converting ${docxFile} to PDF`);
        let pdfFile = docxFile.replace(/\.docx$/, '.pdf');
        let res = child_process.spawnSync('powershell.exe', [
            '-ExecutionPolicy',
            'Bypass',
            '-File',
            'scripts\\docx2test.ps1',
            docxFile,
            pdfFile], { stdio: 'inherit' });
        if (res.error) {
            throw res.error;
        } else if (res.status) {
            throw new Error(`Process exit code ${res.status}`);
        }
    }
}

async function pdf2png_old(docxFiles: string[]) {
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



