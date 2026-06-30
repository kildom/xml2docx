import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'url';
import * as http from 'node:http';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import child_process from 'node:child_process';

/*

USAGE:

POST /upload

    Uploads a .docx file in the request body.

    JSON response: { "status": "success", "id": <id> }
        where <id> is an integer identifying the uploaded file.

GET /convert?<id1>,<id2>,...

    Converts the uploaded files with the given IDs to .pdf and .html format.

    JSON response: { "status": "success" }

GET /download?<id>,<format>

    Downloads the converted file with the given ID and format.
    The <format> is 0 for .pdf and 1 for .html

GET /delete?<id1>,<id2>,...

    Deletes the uploaded files with the given IDs, along with their converted .pdf and .html files.

    JSON response: { "status": "success" }

*/

const PORT = 8083;
const DEBUGGING = false;
let convertScriptPath: string;

function convertFiles(fileList: string[]): void {
    let res = child_process.spawnSync('powershell.exe',
        [
            '-ExecutionPolicy',
            'Bypass',
            '-File',
            convertScriptPath,
            ...fileList
        ], { stdio: 'inherit' });
    if (res.error) {
        throw res.error;
    } else if (res.status) {
        throw new Error(`Process exit code ${res.status}`);
    }
}


function listFromUrl(url: string): string[] {
    return url
        .substring(url.indexOf('?') + 1)
        .split(',')
        .map(x => parseInt(x.trim()))
        .filter(x => x && !isNaN(x) && x > 0)
        .map(x => `uploads/${prefix}${x}.docx`);

}

function sendSuccess(res: http.ServerResponse): void {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end('{ "status": "success" }');
}

let prefix = DEBUGGING ? '1-' : Math.round(Date.now() / 1000) + '-';
let fileId = DEBUGGING ? Math.round(Date.now() / 1000) * 1000 : 0;

const server = http.createServer(async (req, res) => {

    try {

        if (req.url === '/') {

            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('This is converting server for DocTML tests.');

        } else if (req.url === '/upload' && req.method === 'POST') {

            fileId++;
            let fileName = `uploads/${prefix}${fileId}.docx`;
            await pipeline(
                req,
                fs.createWriteStream(fileName)
            );
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(`{ "status": "success", "id": ${fileId} }`);

        } else if (req.url?.startsWith('/delete?')) {

            for (let file of listFromUrl(req.url)) {
                let match = new RegExp(`^${file.replace('.docx', '')}([^a-zA-Z0-9]|$).*`);
                for (let file of fs.readdirSync('uploads')) {
                    file = `uploads/${file}`;
                    if (match.test(file)) {
                        try {
                            fs.rmSync(file, { recursive: true, force: true });
                        } catch (_ex) { }
                    }
                }
            }
            sendSuccess(res);

        } else if (req.url?.startsWith('/download?')) {

            let list = listFromUrl(req.url);
            let ext = req.url.endsWith(',1') ? '.html' : '.pdf';
            let fileName = list[0].replace('.docx', ext);
            if (!fs.existsSync(fileName)) {
                console.log(`File not found: ${fileName}`);
                throw new Error('File not found');
            }
            res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
            await pipeline(
                fs.createReadStream(fileName),
                res
            );

        } else if (req.url?.startsWith('/convert?')) {

            let list = listFromUrl(req.url);
            convertFiles(list);
            sendSuccess(res);

        } else {

            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('404 Not Found');

        }

    } catch (ex) {

        console.error('Server error: ', ex);
        if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end(`500 Internal Server Error:\n${ex}`);
        }

    } finally {

        if (DEBUGGING) {
            setTimeout(() => process.exit(), 500);
        }
    }
});


function writeTempFile(suffix: string, content: string): string {
    const tmpDir = os.tmpdir();
    for (let i = 0; i < 10000; i++) {
        try {
            const tmpFile = path.join(tmpDir, `temp-${i}${suffix}`);
            if (!fs.existsSync(tmpFile)) {
                fs.writeFileSync(tmpFile, content, 'utf-8');
                return tmpFile;
            }
            let old = fs.readFileSync(tmpFile, 'utf-8');
            if (old === content) {
                return tmpFile;
            }
        } catch (err) { }
    }
    throw new Error('Failed to create temporary file.');
}


async function getConvertScript(): Promise<string> {
    if (fs.existsSync('./docx-convert.ps1')) {
        return './docx-convert.ps1';
    }
    if (fs.existsSync('./scripts/docx-convert.ps1')) {
        return './scripts/docx-convert.ps1';
    }
    let scriptText = '';
    try {
        scriptText = (await import('./docx-convert.ps1')).default;
    } catch (error) {
        throw new Error('Failed to locate docx-convert.ps1 script.');
    }
    return writeTempFile('-docx-convert.ps1', scriptText);
}


function getScriptDir(): string {
    let url = import.meta.url;
    if (url) {
        let filename = fileURLToPath(url);
        return path.dirname(filename);
    } else {
        return __dirname;
    }
}


async function main() {
    process.chdir(getScriptDir());
    try {
        fs.mkdirSync('uploads');
    } catch (_ex) { }
    if (!DEBUGGING) {
        for (let file of fs.readdirSync('uploads')) {
            try { fs.rmSync(`uploads/${file}`, { recursive: true, force: true }); } catch (_ex) { }
        }
    }
    convertScriptPath = await getConvertScript();
    console.log(`Using convert script: ${convertScriptPath}`);
    server.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}/`);
        console.log('\x1b[31mWARNING! This server IS NOT SECURE - do not expose it to the public network.\x1b[0m');
    });
}

main();
