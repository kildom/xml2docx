import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import * as mupdf from 'mupdf';

type OutputStyle = '--tests' | '--docs';

const pageSeparatorHeight = 16;
const cutSeparatorHeight = 16;

interface Page {
    number: number;
    width: number;
    height: number;
    cutBegin: number;
    cutEnd: number;
}


export async function pdf2png(input: string, output: string, scale: number, style: OutputStyle) {
    scale = scale * 96 / 72;
    let blankRemovalLimit = Math.round(80 * scale);
    let blankRemovalMargin = Math.round(10 * scale);
    let buffer = fs.readFileSync(input);
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
        let { biggestBlankBegin, biggestBlankEnd } = findBlankRows(pixels, width, height, stride);
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
    let outputStride = outputPixmap.getStride();
    let outputY = 0;
    for (let page of pages) {
        let ladedPage = doc.loadPage(page.number);
        let pixmap = ladedPage.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB);
        let stride = pixmap.getStride();
        let width = pixmap.getWidth();
        let margin = (outputWidth - width) >> 1;
        let pixels = pixmap.getPixels();
        let outputPixels = outputPixmap.getPixels();
        if (page.cutEnd === 0) {
            for (let y = 0; y < page.height; y++) {
                copyImageRow(outputPixels, outputY * outputStride, outputWidth, pixels, y * stride, width);
                outputY++;
            }
        } else {
            for (let y = 0; y < page.cutBegin + cutSeparatorHeight; y++) {
                copyImageRow(outputPixels, outputY * outputStride, outputWidth, pixels, y * stride, width);
                outputY++;
            }
            drawCutSeparator(outputPixels, (outputY - cutSeparatorHeight) * outputStride + 3 * margin, width, outputStride,
                page.cutEnd - page.cutBegin);
            for (let y = page.cutEnd; y < page.height; y++) {
                copyImageRow(outputPixels, outputY * outputStride, outputWidth, pixels, y * stride, width);
                outputY++;
            }
        }
        if (page.number < pages.length - 1) {
            drawPageSeparator(outputPixels, outputY * outputStride, outputStride, outputWidth, width,
                pages[page.number + 1].width);
            outputY += pageSeparatorHeight;
        }
    }
    let png = outputPixmap.asPNG();
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, png);
}



function findBlankRows(pixels: Uint8ClampedArray, width: number, height: number, stride: number) {

    let hashes: string[] = [];
    for (let y = 0; y < height; y++) {
        let offset = stride * y;
        let hash = createHash('MD5').update(pixels.slice(offset, offset + 3 * width)).digest('base64');
        hashes.push(hash);
    }
    hashes.push('end');

    let biggestBlankBegin = 0;
    let biggestBlankEnd = 0;
    let currentHash = 'begin';
    let currentHashBegin = 0;
    for (let y = 0; y <= height; y++) {
        if (currentHash != hashes[y]) {
            let size = y - currentHashBegin;
            if (size > biggestBlankEnd - biggestBlankBegin) {
                biggestBlankBegin = currentHashBegin;
                biggestBlankEnd = y;
            }
            currentHashBegin = y;
            currentHash = hashes[y];
        }
    }

    return { biggestBlankBegin, biggestBlankEnd };
}


function copyImageRow(
    outputPixels: Uint8ClampedArray,
    outputOffset: number,
    outputWidth: number,
    inputPixels: Uint8ClampedArray,
    inputOffset: number,
    inputWidth: number
) {
    let endOffset = outputOffset + 3 * outputWidth;
    let margin = (outputWidth - inputWidth) >> 1;
    if (margin > 0) {
        outputPixels.fill(0x70, outputOffset, outputOffset + 3 * (margin - 1));
        outputOffset += 3 * (margin - 1);
        outputPixels[outputOffset] = 0x00;
        outputPixels[outputOffset + 1] = 0x00;
        outputPixels[outputOffset + 2] = 0x00;
        outputOffset += 3;
    }
    outputPixels.set(inputPixels.slice(inputOffset, inputOffset + 3 * inputWidth), outputOffset);
    outputOffset += 3 * inputWidth;
    if (outputOffset < endOffset - 2) {
        outputPixels[outputOffset] = 0x00;
        outputPixels[outputOffset + 1] = 0x00;
        outputPixels[outputOffset + 2] = 0x00;
        outputOffset += 3;
        outputPixels.fill(0x70, outputOffset, endOffset);
    }
}


function drawCutSeparator(
    pixels: Uint8ClampedArray,
    offset: number,
    width: number,
    stride: number,
    label: number,
) {
    let half = cutSeparatorHeight >> 1;
    let pong = half - 1;
    let dir = -1;
    let x = 0;
    while (x < 3 * width - 2) {
        let y = pong;
        pixels[offset + y * stride + x] = 0x50;
        pixels[offset + y * stride + x + 1] = 0x50;
        pixels[offset + y * stride + x + 2] = 0x50;
        for (y = y + 1; y < pong + half; y++) {
            pixels[offset + y * stride + x] = 0xA0;
            pixels[offset + y * stride + x + 1] = 0xA0;
            pixels[offset + y * stride + x + 2] = 0xA0;
        }
        pixels[offset + y * stride + x] = 0x50;
        pixels[offset + y * stride + x + 1] = 0x50;
        pixels[offset + y * stride + x + 2] = 0x50;
        pong += dir;
        x += 3;
        if (pong === half - 1 || pong === 0) {
            dir = -dir;
        }
    }
    let digits = [...label.toString()].map(x => x.charCodeAt(0) - '0'.charCodeAt(0));
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
    outputWidth: number,
    firstPageWidth: number,
    secondPageWidth: number,
) {
    pixels.fill(0x70, offset, offset + pageSeparatorHeight * stride);
    let fistPageMargin = (outputWidth - firstPageWidth) >> 1;
    let secondPageMargin = (outputWidth - secondPageWidth) >> 1;
    pixels.fill(0x00, offset + 3 * fistPageMargin, offset + 3 * (fistPageMargin + firstPageWidth));
    pixels.fill(0x00,
        offset + (pageSeparatorHeight - 1) * stride + 3 * secondPageMargin,
        offset + (pageSeparatorHeight - 1) * stride + 3 * (secondPageMargin + secondPageWidth));
}


async function main() {
    let input = '';
    let output = '';
    let style: OutputStyle = '--docs';
    let scale = 1;
    let argv = process.argv.slice(2);
    for (let i = 0; i < argv.length; i++) {
        let arg = argv[i];
        if (arg === '--docs') {
            style = '--docs';
        } else if (arg === '--tests') {
            style = '--tests';
        } else if (arg === '--scale' && i + 1 < argv.length) {
            scale = parseFloat(argv[i + 1]);
            i++;
        } else if (input === '') {
            input = arg;
        } else if (output === '') {
            output = arg;
        } else {
            console.error('Too many arguments');
            process.exit(1);
        }
    }
    if (!input || !output) {
        console.log('USAGE: pdf2png.mts [options] <input.pdf> <output.png>\n');
        console.log('Options:');
        console.log('    --docs         Use documentation style output.');
        console.log('    --tests        Use tests style output.');
        console.log('    --scale N      Set scale factor. By default it is 1 which');
        console.log('                   means one image pixel = 1 px = 127/480 mm = 1/96 inch.');
        process.exit(1);
    }
    await pdf2png(input, output, scale, style);
}

main();
