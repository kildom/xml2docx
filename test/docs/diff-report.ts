import * as fs from 'node:fs';
import { compileTemplate } from '../../scripts/gen-docs/template.ts';
import hljs from 'highlight.js';
import { Test } from './test-reader.ts';
import path from 'node:path';
import { debugFilesContent, diffHtmlFileContent, diffHtmlFileName, diffPngFileName, doctmlFileContent, docxFileName, errorFileContent, htmlFileContent, htmlFileName, infoFileContent, listTests, pdfFileName, pngFileName, processErrors, reportFileNameNoExt } from './common.ts';
import { TestBundle } from './test-docs-diff.ts';

interface ReportPanel {
    title: string;
    html?: string;
    url?: string;
    unfold?: boolean;
};

interface ReportTest {
    title?: string;
    test: Test;
    success: boolean;
    panels: ReportPanel[];
};

interface ReportBundle {
    inputFile: string;
    severity: 'ERROR' | 'WARNING' | 'NOTICE' | '';
    message: string;
    bundle: TestBundle;
    old?: ReportTest;
    mix?: ReportTest;
    cur?: ReportTest;
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


function compareBundles(a: ReportBundle, b: ReportBundle): number {
    if (a.inputFile > b.inputFile) return 1;
    if (a.inputFile < b.inputFile) return -1;
    let aIndex = a.cur?.test.index ?? a.mix?.test.index ?? a.old?.test.index ?? 0;
    let bIndex = b.cur?.test.index ?? b.mix?.test.index ?? b.old?.test.index ?? 0;
    if (aIndex > bIndex) return 1;
    if (aIndex < bIndex) return -1;
    let aId = a.cur?.test.id ?? a.mix?.test.id ?? a.old?.test.id ?? 0;
    let bId = b.cur?.test.id ?? b.mix?.test.id ?? b.old?.test.id ?? 0;
    if (aId > bId) return 1;
    if (aId < bId) return -1;
    return 0;
}

export async function generateDiffReport(bundles: TestBundle[]) {
    let reportBundles: ReportBundle[] = [];
    let summaryMessages: { [message: string]: number } = {};

    for (let bundle of bundles) {
        reportBundles.push(await createReportBundle(bundle, summaryMessages));
    }

    reportBundles.sort(compareBundles);
    let template = compileTemplate(fs.readFileSync('test/docs/diff-report.template.html', 'utf-8'));
    let results = template({ reportTests: [], reportBundles, errorOnly: false, fs, hljs });
    fs.writeFileSync('test/outputs/diff-full.html', results);
    results = template({ reportTests: [], reportBundles, errorOnly: true, fs, hljs });
    fs.writeFileSync('test/outputs/diff-errors.html', results);

    if (Object.values(summaryMessages).length > 0) {
        fs.writeFileSync('test/outputs/diff-summary.md', `Count | Message\n------|--------\n${Object.entries(summaryMessages).map(([message, count]) => `${count} | ${message}`).join('\n')}\n`);
    } else {
        fs.writeFileSync('test/outputs/diff-summary.md', '**No differences found.**\n');
    }
}

async function createReportBundle(bundle: TestBundle, summaryMessages: { [message: string]: number }): Promise<ReportBundle> {
    let reportBundle: ReportBundle = {
        severity: '',
        message: '',
        inputFile: '',
        bundle,
        success: false,
        panels: [],
    };
    if (bundle.oldId) reportBundle.old = await createReportTest(bundle.oldId, 'old', 'old: Old Tests + Old Code');
    if (bundle.mixId) reportBundle.mix = await createReportTest(bundle.mixId, 'mix', 'mix: Old Tests + Current Code');
    if (bundle.curId) reportBundle.cur = await createReportTest(bundle.curId, 'cur', 'cur: Current Tests + Current Code');
    let inputFiles = new Set<string>(
        [reportBundle.old, reportBundle.mix, reportBundle.cur]
            .filter(x => x)
            .map(x => path.basename(x!.test.inputFile)));
    reportBundle.inputFile = [...inputFiles].sort().join(', ');
    reportBundle.success = !!(reportBundle.cur?.success && reportBundle.mix?.success && reportBundle.old?.success
        && !bundle.diffOldMix && !bundle.diffMixCur && !bundle.diffCurOld);
    if (!reportBundle.success) {
        let caseStrings: string[] = [];
        if (reportBundle.old) caseStrings.push('o');
        if (reportBundle.mix) caseStrings.push('m');
        if (reportBundle.cur) caseStrings.push('c');
        if (bundle.diffOldMix) caseStrings.push('o!=m');
        if (bundle.diffMixCur) caseStrings.push('m!=c');
        if (bundle.diffCurOld) caseStrings.push('c!=o');
        let caseString = caseStrings.join(',');
        let message: [typeof reportBundle.severity, string, string] = ['', '', ''];
        switch (caseString) {
        case 'c':
            message = ['NOTICE', 'New test added.', 'Verify results manually.'];
            break;
        case 'o,m':
            message = ['WARNING', 'Test removed.', 'Make sure it is intentional.'];
            break;
        case 'o,m,o!=m':
            message = ['WARNING', 'Compatibility broken and test removed.', 'Make sure it is intentional.'];
            break;
        case 'o,m,c':
            message = ['', '', '']; // No differences, so some error in test
            break;
        case 'o,m,c,o!=m,m!=c':
        case 'o,m,c,o!=m,c!=o':
        case 'o,m,c,o!=m,m!=c,c!=o':
            message = ['WARNING', 'Compatibility broken.', 'Make sure it is intentional.'];
            break;
        case 'o,m,c,m!=c,c!=o':
            message = ['NOTICE', 'Test modified.', 'Verify results manually.'];
            break;
        case 'o':
        case 'm':
        case 'o,c':
        case 'o,c,c!=o':
        case 'm,c':
        case 'm,c,m!=c':
        default:
            message = ['ERROR', 'Test rearranged or broken.', 'Verify results manually.'];
            break;
        }
        if ((reportBundle.old && !reportBundle.old.success)
            || (reportBundle.mix && !reportBundle.mix.success)
            || (reportBundle.cur && !reportBundle.cur.success)) {
            message[0] = 'ERROR';
            message[1] = message[1] ? 'Test failed and ' + message[1].toLowerCase() : 'Test failed.';
            message[2] = 'Verify results manually.';
        }
        if (!message[0]) {
            message = ['ERROR', 'Unknown error.', 'Verify results manually.'];
        }
        reportBundle.severity = message[0];
        reportBundle.message = message[1] + ' ' + message[2];
        let summary = `${message[0]}: ${message[1]} ${message[2]}`;
        summaryMessages[summary] = (summaryMessages[summary] ?? 0) + 1;

        addDiffPanels(reportBundle, bundle.oldId, 'old', 'mix', 'old ≈ mix');
        addDiffPanels(reportBundle, bundle.mixId, 'mix', 'cur', 'mix ≈ cur');
        addDiffPanels(reportBundle, bundle.curId, 'cur', 'old', 'cur ≈ old');
    }
    return reportBundle;
}

function addDiffPanels(reportBundle: ReportBundle, testId: string | undefined, root: string, root2: string, title: string) {
    if (!testId) return;
    let diffHtml = diffHtmlFileName(testId, root);
    if (fs.existsSync(diffHtml)) {
        let diff = diffHtmlFileContent(testId, root);
        reportBundle.panels.push({
            title: `HTML: ${title}`,
            html: '<pre class="code"><code class="language-diff">' + hljs.highlight(diff, { language: 'diff' }).value + '</code></pre>',
        });
    }
    let diffPng = diffPngFileName(testId, root);
    if (fs.existsSync(diffPng)) {
        reportBundle.panels.push({
            title: `PNG: ${title}`,
            html: `
                <div class="img-diff-container">
                    <span class="img-diff-switcher" onmouseover="hideImage('img-diff-${testId}-${root}-${root2}-0'); showImage('img-diff-${testId}-${root}-${root2}-1')" 
                        onmouseout="showImage('img-diff-${testId}-${root}-${root2}-0'); hideImage('img-diff-${testId}-${root}-${root2}-1')">${root}</span><span
                    class="img-diff-switcher" onmouseover="hideImage('img-diff-${testId}-${root}-${root2}-0'); showImage('img-diff-${testId}-${root}-${root2}-2')" 
                        onmouseout="showImage('img-diff-${testId}-${root}-${root2}-0'); hideImage('img-diff-${testId}-${root}-${root2}-2')">${root2}</span>
                    <div class="img-diff-flex">
                    <div class="img-diff-diff"><img id="img-diff-${testId}-${root}-${root2}-0" src="${path.relative(path.dirname(reportFileNameNoExt()), diffPng).replace(/\\/g, '/')}" alt="Diff Image"></div>
                    <div class="img-diff-img" style="left: -1px"><img id="img-diff-${testId}-${root}-${root2}-1" src="${path.relative(path.dirname(reportFileNameNoExt()), pngFileName(testId, root)).replace(/\\/g, '/')}" alt="Diff Image"></div>
                    <div class="img-diff-img" style="left: -2px"><img id="img-diff-${testId}-${root}-${root2}-2" src="${path.relative(path.dirname(reportFileNameNoExt()), pngFileName(testId, root2)).replace(/\\/g, '/')}" alt="Diff Image"></div>
                    </div>
                </div>
            `,
        });
    }
}

async function createReportTest(id: string, root?: string, title?: string): Promise<ReportTest> {

    console.log('Processing', id);
    let { success, errorHtml } = processErrors(id, root);
    let reportTest: ReportTest = {
        title: title,
        test: infoFileContent(id, root),
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
    for (let [debugType, content] of Object.entries(debugFilesContent(id, root))) {
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
    if (fs.existsSync(docxFileName(id, root))) {
        panels.push({
            title: 'DOCX',
            url: path.relative(path.dirname(reportFileNameNoExt()), docxFileName(id, root)).replace(/\\/g, '/'),
        });
    }
    if (fs.existsSync(pdfFileName(id, root))) {
        panels.push({
            title: 'PDF',
            url: path.relative(path.dirname(reportFileNameNoExt()), pdfFileName(id, root)).replace(/\\/g, '/'),
        });
    }
    if (fs.existsSync(htmlFileName(id, root))) {
        panels.push({
            title: 'HTML',
            html: '<pre class="code"><code class="language-html">' + hljs.highlight(htmlFileContent(id, root), { language: 'html' }).value + '</code></pre>',
        });
    }
    if (fs.existsSync(pngFileName(id, root))) {
        panels.push({
            title: 'Image',
            html: '<img src="' + path.relative(path.dirname(reportFileNameNoExt()), pngFileName(id, root)).replace(/\\/g, '/') + '" alt="Image">',
        });
    }
    panels.push({
        title: 'DocTML',
        html: '<pre class="code"><code class="language-xml">' + hljs.highlight(doctmlFileContent(id, root), { language: 'doctml' }).value + '</code></pre>',
    });

    return reportTest;
}
