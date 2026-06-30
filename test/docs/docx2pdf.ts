import { pipeline } from 'node:stream/promises';
import * as http from 'node:http';
import * as fs from 'node:fs';
import * as child_process from 'node:child_process';
import * as path from 'node:path';
import { isDirectExecution, mkdir, mkdirFor } from './common';


async function checkJSONResponse(res: http.IncomingMessage): Promise<any> {
    let data = '';
    for await (const chunk of res) {
        data += chunk;
    }
    if (res.statusCode !== 200) {
        throw new Error(`Server returned status code ${res.statusCode}: ${data}`);
    } else {
        let obj = JSON.parse(data);
        if (obj.status !== 'success') {
            throw new Error('Server returned error status');
        }
        return obj;
    }
}


function prepareOptions(address: string, path: string, method: string = 'GET'): http.RequestOptions {
    let [host, portStr] = address.split(':');
    let port = portStr ? parseInt(portStr) : 8083;
    const options: http.RequestOptions = { host, port, path, method };
    if (method === 'POST') {
        options.headers = {
            'Content-Type': 'application/octet-stream',
        };
    }
    return options;
}


async function upload(address: string, file: string): Promise<number> {

    const options = prepareOptions(address, '/upload', 'POST');
    let id: number = 0;

    // eslint-disable-next-line no-async-promise-executor
    await new Promise<void>(async (resolve, reject) => {
        try {
            const req = http.request(options, async (res) => {
                try {
                    let obj = await checkJSONResponse(res);
                    id = obj.id;
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
            await pipeline(
                fs.createReadStream(file),
                req
            );
        } catch (err) {
            reject(err);
        }
    });

    return id;
}


async function commandCommon(address: string, command: string, ids: number[]): Promise<void> {
    const options = prepareOptions(address, `/${command}?${ids.join(',')}`);

    // eslint-disable-next-line no-async-promise-executor
    await new Promise<void>(async (resolve, reject) => {
        try {
            const req = http.request(options, async (res) => {
                try {
                    await checkJSONResponse(res);
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
            req.end();
        } catch (err) {
            reject(err);
        }
    });

}


async function remove(address: string, ids: number[]): Promise<void> {
    await commandCommon(address, 'delete', ids);
}


async function convert(address: string, ids: number[]): Promise<void> {
    await commandCommon(address, 'convert', ids);
}


async function download(address: string, id: number, format: 'pdf' | 'html', output: string): Promise<void> {
    const options = prepareOptions(address, `/download?${id},${format === 'html' ? '1' : '0'}`);

    // eslint-disable-next-line no-async-promise-executor
    await new Promise<void>(async (resolve, reject) => {
        try {
            const req = http.request(options, async (res) => {
                try {
                    if (res.statusCode !== 200) {
                        await checkJSONResponse(res);
                    }
                    await pipeline(
                        res,
                        fs.createWriteStream(output)
                    );
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
            req.end();
        } catch (err) {
            reject(err);
        }
    });

}


function getConvertScript(): string {
    if (fs.existsSync('./docx-convert.ps1')) {
        return './docx-convert.ps1';
    }
    if (fs.existsSync('./scripts/docx-convert.ps1')) {
        return './scripts/docx-convert.ps1';
    }
    throw new Error('Cannot find docx-convert.ps1 script');
}


function convertDocxFilesLocally(files: { [key: string]: string }) {
    let res = child_process.spawnSync('powershell.exe',
        [
            '-ExecutionPolicy',
            'Bypass',
            '-File',
            getConvertScript(),
            ...Object.keys(files)
        ], { stdio: 'inherit' });
    if (res.error) {
        throw res.error;
    } else if (res.status) {
        throw new Error(`Process exit code ${res.status}`);
    }
    for (let ext of ['.pdf', '.html']) {
        for (let [inputFile, outputFile] of Object.entries(files)) {
            inputFile = path.join(path.dirname(inputFile), path.basename(inputFile, path.extname(inputFile)) + ext);
            outputFile = path.join(path.dirname(outputFile), path.basename(outputFile, path.extname(outputFile)) + ext);
            mkdirFor(outputFile);
            fs.renameSync(inputFile, outputFile);
        }
    }
}


async function execWithRetry<T>(func: T, ...args: any[]) {
    let lastError: any = undefined;
    for (let attempt = 0; attempt < 5; attempt++) {
        try {
            return await (func as any)(...args);
        } catch (err) {
            lastError = err;
        }
    }
    throw lastError;
}


async function convertDocxFilesOnServer(address: string, files: { [key: string]: string }) {
    let list: { id: number, outputPdf: string, outputHtml: string }[] = [];
    try {
        for (let [inputFile, outputFile] of Object.entries(files)) {
            list.push({
                id: -1,
                outputPdf: path.join(path.dirname(outputFile), path.basename(outputFile, path.extname(outputFile)) + '.pdf'),
                outputHtml: path.join(path.dirname(outputFile), path.basename(outputFile, path.extname(outputFile)) + '.html'),
            });
            list.at(-1)!.id = await execWithRetry(upload, address, inputFile);
        }
        await execWithRetry(convert, address, list.map(x => x.id));
        for (let item of list) {
            mkdirFor(item.outputPdf);
            await execWithRetry(download, address, item.id, 'pdf', item.outputPdf);
            await execWithRetry(download, address, item.id, 'html', item.outputHtml);
        }
    } finally {
        try {
            await execWithRetry(remove, address, list.map(x => x.id));
        } catch (_err) {
            // Ignore errors during cleanup
        }
    }
}


export async function convertDocxFiles(files: { [key: string]: string }) {
    for (let ext of ['.pdf', '.html']) {
        for (let outputFile of Object.values(files)) {
            outputFile = path.join(path.dirname(outputFile), path.basename(outputFile, path.extname(outputFile)) + ext);
            fs.rmSync(outputFile, { force: true });
        }
    }
    if (process.env.DOCX_CONVERT_SERVER) {
        await convertDocxFilesOnServer(process.env.DOCX_CONVERT_SERVER, files);
    } else {
        if (!process.platform.toLowerCase().startsWith('win')) {
            console.error(`
                Local conversion is only supported on Windows with Office installed.
                If you have a conversion server available, please set DOCX_CONVERT_SERVER environment
                variable to its address (e.g. localhost:8083). You can start the server with node.js using the
                "dist/dev/convert-server.js" script. Build it first with a "npm run dev-build-convert-server" command.
                This server IS NOT SECURE, so do not expose it to the public network.
            `.replace(/\s+/g, ' ').trim().replace(/(.{1,79})(?: |$)/g, '$1\n').trim());
            process.exit(1);
        }
        convertDocxFilesLocally(files);
    }
}


(typeof __RUN_SELF_TEST__ === 'boolean' ? __RUN_SELF_TEST__ : isDirectExecution(import.meta.url)) && (async () => {
    const fs = await import('node:fs');
    mkdir('test/outputs/_tmp/docx2pdf_test/in');
    mkdir('test/outputs/_tmp/docx2pdf_test/out');
    for (let run = 0; run < 2; run++) {
        let list = Object.create(null);
        console.log(`Preparing files for run ${run}`);
        for (let file = 0; file < 10; file++) {
            fs.copyFileSync(`test/docs/data/include/styles/styles.docx`, `test/outputs/_tmp/docx2pdf_test/in/${run}${file}.docx`);
            list[`test/outputs/_tmp/docx2pdf_test/in/${run}${file}.docx`] = `test/outputs/_tmp/docx2pdf_test/out/${run}${file}.pdf`;
            try { fs.unlinkSync(`test/outputs/_tmp/docx2pdf_test/out/${run}${file}.pdf`); } catch (_) { }
            try { fs.unlinkSync(`test/outputs/_tmp/docx2pdf_test/out/${run}${file}.html`); } catch (_) { }
        }
        console.log(`Converting files for run ${run}`);
        await convertDocxFiles(list);
        console.log(`Checking files for run ${run}`);
        for (let file = 0; file < 10; file++) {
            if (fs.readFileSync(`test/outputs/_tmp/docx2pdf_test/out/${run}${file}.html`, 'utf-8').substring(0, 1000).indexOf('<html') === -1
                || !fs.readFileSync(`test/outputs/_tmp/docx2pdf_test/out/${run}${file}.pdf`, 'latin1').startsWith('%PDF')
            ) {
                throw new Error(`Invalid conversion result of file ${run}${file}.docx`);
            }
        }
    }
    console.log('Self test PASSED');
})();
