import * as fs from 'node:fs';
import { compileTemplate } from '../../scripts/gen-docs/template.ts';
import hljs from 'highlight.js';
import { Test } from './test-reader';
import path from 'node:path';
import { debugFilesContent, doctmlFileContent, docxFileName, errorFileContent, htmlFileContent, htmlFileName, infoFileContent, listTests, pdfFileName, pngFileName, processErrors, reportFileNameNoExt } from './common.ts';

interface ReportPanel {
    title: string;
    html?: string;
    url?: string;
    unfold?: boolean;
};

interface ReportTest {
    test: Test;
    success: boolean;
    panels: ReportPanel[];
};

hljs.registerLanguage('doctml', function (hljs) {
    const xml = hljs.getLanguage('xml');
    return {
        ...xml,
        contains: [
            ...(xml!.contains || []),
            {
                begin: /<%/,
                end: /%>/,
                subLanguage: 'javascript'
            }
        ]
    };
});


function compareTests(a: ReportTest, b: ReportTest): number {
    if (a.test.inputFile > b.test.inputFile) return 1;
    if (a.test.inputFile < b.test.inputFile) return -1;
    if (a.test.index > b.test.index) return 1;
    if (a.test.index < b.test.index) return -1;
    if (a.test.id > b.test.id) return 1;
    if (a.test.id < b.test.id) return -1;
    return 0;
}


export async function generateReport() {
    let ids = listTests();
    let reportTests: ReportTest[] = [];
    for (let id of ids) {
        let { success, errorHtml } = processErrors(id);
        let reportTest: ReportTest = {
            test: infoFileContent(id),
            success,
            panels: [],
        };
        let panels = reportTest.panels;
        if (errorHtml.trim().length > 0) {
            panels.push({
                title: 'Error',
                html: `<pre class="error">${errorHtml}</pre>`,
                unfold: !success,
            });
        }
        for (let [debugType, content] of Object.entries(debugFilesContent(id))) {
            let language = 'txt';
            if (debugType.endsWith('.doctml')) {
                language = 'xml';
                debugType = debugType.replace('.doctml', '');
            } else if (debugType.endsWith('json')) {
                language = 'json';
            }
            panels.push({
                title: debugType,
                html: '<pre class="code"><code class="language-' + language + '">' + hljs.highlight(content, { language }).value + '</code></pre>',
            });
        }
        if (fs.existsSync(docxFileName(id))) {
            panels.push({
                title: 'DOCX',
                url: path.relative(path.dirname(reportFileNameNoExt()), docxFileName(id)).replace(/\\/g, '/'),
            });
        }
        if (fs.existsSync(pdfFileName(id))) {
            panels.push({
                title: 'PDF',
                url: path.relative(path.dirname(reportFileNameNoExt()), pdfFileName(id)).replace(/\\/g, '/'),
            });
        }
        if (fs.existsSync(htmlFileName(id))) {
            panels.push({
                title: 'HTML',
                html: '<pre class="code"><code class="language-html">' + hljs.highlight(htmlFileContent(id), { language: 'html' }).value + '</code></pre>',
            });
        }
        if (fs.existsSync(pngFileName(id))) {
            panels.push({
                title: 'Image',
                html: '<img src="' + path.relative(path.dirname(reportFileNameNoExt()), pngFileName(id)).replace(/\\/g, '/') + '" alt="Image">',
            });
        }
        panels.push({
            title: 'DocTML',
            html: '<pre class="code"><code class="language-xml">' + hljs.highlight(doctmlFileContent(id), { language: 'doctml' }).value + '</code></pre>',
        });
        reportTests.push(reportTest);
    }
    reportTests.sort(compareTests);
    let template = compileTemplate(fs.readFileSync('test/docs/report.template.html', 'utf-8'));
    let results = template({ reportTests, errorOnly: false, fs, hljs });
    fs.writeFileSync(reportFileNameNoExt() + '-full.html', results);
    results = template({ reportTests, errorOnly: true, fs, hljs });
    fs.writeFileSync(reportFileNameNoExt() + '-errors.html', results);
}
