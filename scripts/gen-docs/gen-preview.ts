
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

import * as mupdf from 'mupdf';

import { convertDocxFiles } from '../../test/docs/docx2pdf.ts';


const tempPath = 'temp/preview';
const outPath = 'dist/html/preview';
const imgPath = 'docs/img';
const cliPath = 'dist/deno-compile/x64-linux/doctml'; // TODO: Depends on the platform, should be configurable

interface PreviewArgs {
    noPreview?: boolean;
    prefix?: string;
    suffix?: string;
    data?: any;
    // TODO: Full page preview (disable cropping) to show examples where entire page is important.
};


function runCli(cmd: string, args: string[]): void {
    const result = spawnSync(cmd, args, {
        cwd: ".",
        stdio: "inherit",
        shell: false,
    });

    if (result.error) {
        throw result.error;
    }

    if (result.status !== 0) {
        throw new Error(
            `Process exited with status ${result.status ?? "unknown"}`
        );
    }
}

export async function generatePreview(code: string, name: string, args: PreviewArgs): Promise<DocumentMetrics> {

    fs.mkdirSync(tempPath, { recursive: true });
    fs.mkdirSync(outPath, { recursive: true });

    // Copy entire directory from `docs/img` to tempPath
    fs.cpSync(imgPath, tempPath, { recursive: true });

    if (args.prefix) {
        code = args.prefix + code;
    }
    if (args.suffix) {
        code = code + args.suffix;
    }

    fs.writeFileSync(`${tempPath}/${name}.doctml`, code, 'utf-8');

    let cliArgs = ['--docx.js'];

    if (args.data) {
        let dataJson = JSON.stringify(args.data);
        fs.writeFileSync(`${tempPath}/${name}.json`, dataJson, 'utf-8');
        cliArgs.push('-d', `${tempPath}/${name}.json`);
    }
    cliArgs.push(`${tempPath}/${name}.doctml`);
    cliArgs.push(`${outPath}/${name}.docx`);

    runCli(cliPath, cliArgs);

    await convertDocxFiles({
        [`${outPath}/${name}.docx`]: `${outPath}/${name}.pdf`,
    });

    fs.rmSync(`${outPath}/${name}.html`, { force: true });

    let metrics = await pdf2png(`${outPath}/${name}.pdf`, `${outPath}/${name}.png`);

    runCli('mutool', ['convert', '-o', `${outPath}/${name}.svg`, `${outPath}/${name}.pdf`]);

    for (let i = 0; i < metrics.pages.length; i++) {
        let page = metrics.pages[i];
        let svg = fs.readFileSync(`${outPath}/${name}${i + 1}.svg`, 'utf-8');
        svg = cropSvg(svg, page.pngBegin / page.pixelHeight, (page.pixelHeight - page.pngBegin - page.pngHeight) / page.pixelHeight);
        fs.writeFileSync(`${outPath}/${name}${i + 1}-cropped.svg`, svg, 'utf-8');
        page.svgName = `${name}${i + 1}.svg`;
        page.svgCroppedName = `${name}${i + 1}-cropped.svg`;
    }

    console.log(metrics);

    return metrics;
}

export interface PageMetrics {
    pixelWidth: number;
    pixelHeight: number;
    mmWidth: number;
    mmHeight: number;
    pngHeight: number;
    pngBegin: number;
    svgName: string;
    svgCroppedName: string;
};

export interface DocumentMetrics {
    pages: PageMetrics[];
    pngWidth: number;
    pngHeight: number;
    pngName: string;
};

export async function pdf2png(pdfPath: string, pngPath: string): Promise<DocumentMetrics> {
    const scale = 1.8;
    const paddingRelative = 1 / 80; // relative to page width
    const grayBackground = 0xC9;
    const pageSeparatorRelative = 1 / 160; // pixels between pages, relative to page width

    function hashesFromLines(pixels: Uint8ClampedArray, width: number, height: number, stride: number): string[] {
        let hashes: string[] = [];
        for (let y = 0; y < height; y++) {
            let offset = stride * y;
            let hash = createHash('MD5').update(pixels.slice(offset, offset + 3 * width)).digest('base64');
            hashes.push(hash);
        }
        return hashes;
    }

    let pages: PageMetrics[] = [];

    let buffer = fs.readFileSync(pdfPath);
    let doc = mupdf.Document.openDocument(buffer, 'application/pdf');
    let countPages = doc.countPages();
    let outputPixmaps: mupdf.Pixmap[] = [];
    let totalCutHeight = 0;
    for (let i = 0; i < countPages; i++) {
        // Load page and its pixmap
        let ladedPage = doc.loadPage(i);
        let pixmap = ladedPage.toPixmap(mupdf.Matrix.scale(scale, scale), mupdf.ColorSpace.DeviceRGB);
        if (pixmap.getAlpha() || pixmap.getColorSpace()?.getType() !== mupdf.ColorSpace.DeviceRGB?.getType()) {
            throw new Error('Unexpected pixmap format');
        }
        // Get raw access to the pixel data
        let stride = pixmap.getStride();
        let width = pixmap.getWidth();
        let height = pixmap.getHeight();
        let pixels = pixmap.getPixels();
        // Find most common row in a page (which can be mostly reduced)
        let hashes = hashesFromLines(pixels, width, height, stride);
        let hashesHistogram: { [hash: string]: number } = {};
        for (let hash of hashes) {
            hashesHistogram[hash] = (hashesHistogram[hash] || 0) + 1;
        }
        let mostCommonHash = Object.entries(hashesHistogram).reduce((a, b) => a[1] > b[1] ? a : b)[0];
        // Find first and last non-blank rows
        let cutFirst = hashes.slice(1).findIndex(h => h !== mostCommonHash) + 1;
        let cutLast = hashes.slice(0, -1).findLastIndex(h => h !== mostCommonHash);
        // Add padding to it
        cutFirst = Math.max(0, cutFirst - 1 - Math.ceil(width * paddingRelative));
        cutLast = Math.min(height - 1, cutLast + 1 + Math.ceil(width * paddingRelative));
        // Create a new pixmap with the cutted rows
        let outputHeight = cutLast - cutFirst + 1;
        totalCutHeight += outputHeight;
        let output = new mupdf.Pixmap(mupdf.ColorSpace.DeviceRGB, [0, 0, width, outputHeight], false);
        let outputStride = output.getStride();
        let outputPixels = output.getPixels();
        outputPixmaps.push(output);
        // Copy line by line
        for (let y = 0; y < outputHeight; y++) {
            let srcOffset = stride * (cutFirst + y);
            let dstOffset = outputStride * y;
            outputPixels.set(pixels.slice(srcOffset, srcOffset + 3 * width), dstOffset);
        }
        // Save page metrics
        let bounds = ladedPage.getBounds();
        let mmWidth = (bounds[2] - bounds[0]) * 127 / 360;
        let mmHeight = (bounds[3] - bounds[1]) * 127 / 360;
        pages.push({
            pixelWidth: width,
            pixelHeight: height,
            mmWidth,
            mmHeight,
            pngHeight: outputHeight,
            pngBegin: cutFirst,
            svgName: '', // Will be filled later
            svgCroppedName: '', // Will be filled later
        });
        pixmap.destroy();
        ladedPage.destroy();
    }


    // Prepare final output
    let finalWidth = Math.max(...outputPixmaps.map(p => p.getWidth()));
    let pageSeparatorHeight = Math.ceil(pageSeparatorRelative * finalWidth);
    let finalHeight = totalCutHeight + (outputPixmaps.length - 1) * pageSeparatorHeight;
    let finalPixmap = new mupdf.Pixmap(mupdf.ColorSpace.DeviceRGB, [0, 0, finalWidth, finalHeight], false);
    let finalPixels = finalPixmap.getPixels();
    let finalStride = finalPixmap.getStride();

    // Fill with gray background
    finalPixels.fill(grayBackground);

    let offsetY = 0;

    for (let i = 0; i < outputPixmaps.length; i++) {
        // Prepare input pixmap and its data
        let inputPixmap = outputPixmaps[i];
        let inputStride = inputPixmap.getStride();
        let inputPixels = inputPixmap.getPixels();
        let inputWidth = inputPixmap.getWidth();
        let inputHeight = inputPixmap.getHeight();
        // Calculate offset to center the page horizontally
        let offsetX = Math.floor((finalWidth - inputWidth) / 2);
        // Copy line by line
        for (let y = 0; y < inputHeight; y++) {
            let srcOffset = inputStride * y;
            let dstOffset = finalStride * (offsetY + y) + 3 * offsetX;
            finalPixels.set(inputPixels.slice(srcOffset, srcOffset + 3 * inputWidth), dstOffset);
        }
        // Advance the offset for the next page
        offsetY += inputHeight + pageSeparatorHeight;
        // Destroy the input pixmap to free memory
        inputPixmap.destroy();
    }

    // Save the final pixmap as PNG
    let png = finalPixmap.asPNG();
    finalPixmap.destroy();
    fs.writeFileSync(pngPath, png);

    let result: DocumentMetrics = {
        pages,
        pngWidth: finalWidth,
        pngHeight: finalHeight,
        pngName: path.basename(pngPath),
    };

    return result;
}

function cropSvg(svg: string, cropTop: number, cropBottom: number): string {
    if (cropTop < 0 || cropBottom < 0 || cropTop + cropBottom >= 1) {
        throw new RangeError('cropTop and cropBottom must be >= 0 and their sum must be < 1');
    }

    return svg.replace(/<svg\b([^>]*)>/i, (fullTag: string, attributes: string) => {
        // Read the existing viewBox.
        const viewBoxMatch = attributes.match(
            /\bviewBox\s*=\s*(['"])([^'"]+)\1/i,
        );

        if (!viewBoxMatch) {
            throw new Error('SVG must have a viewBox');
        }

        const viewBox = viewBoxMatch[2]
            .trim()
            .split(/[\s,]+/)
            .map(Number);

        if (viewBox.length !== 4 || viewBox.some((value: number) => !Number.isFinite(value))) {
            throw new Error(`Invalid viewBox: ${viewBoxMatch[2]}`);
        }

        const [x, y, width, height] = viewBox;

        const cropFraction = 1 - cropTop - cropBottom;
        const newY = y + height * cropTop;
        const newHeight = height * cropFraction;

        const newViewBox = `${x} ${newY} ${width} ${newHeight}`;

        // Update viewBox.
        let newAttributes = attributes.replace(
            /\bviewBox\s*=\s*(['"])([^'"]+)\1/i,
            (_match: string, quote: string) =>
                `viewBox=${quote}${newViewBox}${quote}`,
        );

        // Update height while preserving its original unit.
        const heightMatch = attributes.match(
            /\bheight\s*=\s*(['"])([^'"]+)\1/i,
        );

        if (heightMatch) {
            const numericMatch = heightMatch[2].match(
                /^\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)(.*)$/,
            );

            if (numericMatch) {
                const originalHeight = Number(numericMatch[1]);
                const unit = numericMatch[2];

                const newPhysicalHeight = originalHeight * cropFraction;

                newAttributes = newAttributes.replace(
                    /\bheight\s*=\s*(['"])([^'"]+)\1/i,
                    (_match: string, quote: string) =>
                        `height=${quote}${newPhysicalHeight}${unit}${quote}`,
                );
            }
        }

        return `<svg${newAttributes}>`;
    });
}

async function test() {
    await generatePreview(`<document><p font.color="red">Warning!<pagebreak/>NextPage</p><section size="A5"/><p>ON SMALL PAGE</p></document>`, 'warning', {});
    await generatePreview(`<p font.color="red">OnvePage!</p>`, 'onepage', {});
}

//test();
