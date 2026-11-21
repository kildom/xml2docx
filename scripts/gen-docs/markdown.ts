
import crypto from 'node:crypto';
import qre from 'qre';
import JSON5 from 'json5';
import showdown from 'showdown';
import showdownHighlight from 'showdown-highlight';
import { asyncJob, jobPostponed, JobPostponed } from './async-jobs';
import { DocumentMetrics, generatePreview, PreviewArgs } from './gen-preview';
import { isDevMode } from './dev';

let pluginsRegistered = false;

function alphabeticHash(text: string): string {
    let hashHex = crypto.createHash('md5').update(text).digest('hex');
    let hash = '';
    for (let c of hashHex) {
        if (c.charCodeAt(0) >= '0'.charCodeAt(0) && c.charCodeAt(0) <= '9'.charCodeAt(0)) {
            hash += String.fromCharCode(c.charCodeAt(0) - '0'.charCodeAt(0) + 'g'.charCodeAt(0));
        } else {
            hash += c;
        }
    }
    return hash;
}

export function markdownToHtml(markdown: string, withParagraphs: boolean = true): string {

    if (!pluginsRegistered) {
        registerPlugins();
        pluginsRegistered = true;
    }

    let mdConverter = new showdown.Converter({
        extensions: [
            showdownHighlight({
                pre: true,
                auto_detection: true,
            }),
            'gitHubAlerts',
            'gitHubDarkLightImages',
            'docs',
            'doctmlCode',
            'docxJsLinks',
        ],
        ghCompatibleHeaderId: true,
        simplifiedAutoLink: true,
        tables: true,
    });
    let html = mdConverter.makeHtml(markdown) as string;

    if (withParagraphs) {
        return html;
    } else {
        return html
            .split(/<p>|<\/p>/)
            .map(x => x.trim())
            .filter(x => x.length > 0)
            .join('<br>');
    }
}

function registerPlugins() {

    showdown.extension('gitHubAlerts', function () {
        let ext1 = {
            type: 'lang',
            regex: /(?<!(?:^|\n)\s*>[^\n]*\r?\n)(?<=^|\n)(?<prefix>[ \t]*>)(?<type>[ \t]*\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION|DEV)\][ \t]*)(?<text>(?:\r?\n\k<prefix>.*?(?=\r?\n|$))+)/gsi,
            replace: (m0, prefix, type, text) => {
                let className = type.replace(/[^a-z]+/gi, '').toLowerCase();
                if (className === 'dev' && !isDevMode()) {
                    return '';
                }
                let title = className.substring(0, 1).toUpperCase() + className.substring(1);
                let res = `${prefix}<div class="--gitHubAlert-begin-${className}">${title}</div>${text}\n`
                    + `${prefix}<div class="--gitHubAlert-end"></div>\n`;
                return res;
            }
        };
        let ext2 = {
            type: 'output',
            regex: /<div class="--gitHubAlert-begin-(\w+)">(.*?)<\/div>/g,
            replace: '<div class="gitHubAlert-$1"><div class="gitHubAlert-title">$2</div><div class="gitHubAlert-text">'
        };
        let ext3 = {
            type: 'output',
            regex: /<div class="--gitHubAlert-end"><\/div>/g,
            replace: '</div></div>'
        };
        return [ext1, ext2, ext3];
    });

    showdown.extension('gitHubDarkLightImages', function () {
        let ext1 = {
            type: 'output',
            regex: qre.global.legacy`
                1: {
                    '<img'
                    at-least-1 whitespace
                    lazy-repeat [^>]
                }
                optional {
                    2: ('class="', repeat [^>"])
                    3: ('"', lazy-repeat [^>])
                }
                4: {
                    'src="'
                    lazy-repeat [^>"]
                }
                (5: '#gh-dark-mode-only"') or (6: '#gh-light-mode-only"')
                7: lazy-repeat [^>]
                optional {
                    8: ('class="', lazy-repeat [^>"])
                    9: ('"', lazy-repeat [^>])
                }
                10: '>'
                `, // https://kildom.github.io/qre-web-demo/#2pZVNb8IwDIZ3zq+IskNaabCx77Ulpx23GzfUiaqqwraWVg2axBD/HTs0hTZBIJGjY1v28zoOcPiFzqCiAngPf9RVX0OUkIWE7B4OWLWOjXpGMNJ/h6OAri0jHh59F5I7rw5k2HNxeubJ/wqoa/GmXyK2nDaWpR0dd1n3AfV4CutLjRm/MYMBuVnsOwMeMABd+7XY7nYxj0fpqDqFAs5pmp3TtfcUUH4t5wOtM0o8KBf5inEfF4z33NzmuJ4711aml+A09ROMX7uMrX7coN8uAT26gw4FJ7N2gHFHwAjPSFQJHEXaFKTKIoMFvZCMag1knVQ7bEP1Jx0IaZIvx+y9TCefH3SSSMUE0QkPwjVXE9+HbCcwtZTLeVYzEd1WF6cUbevmE5zCEkcI+2+1zvzYDztOYArJFg==
            replace: (m0: string, p1, cls2, p3, src4, dark5, light6, p7, cls8, p9, p10) => {
                let className = light6 ? 'only-light-mode' : 'only-dark-mode';
                if (cls2) {
                    cls2 += ' ' + className;
                } else if (cls8) {
                    cls8 += ' ' + className;
                } else {
                    src4 = `class="${className}" ${src4}`;
                }
                return `${p1}${cls2 || ''}${p3 || ''}${src4}"${p7}${cls8 || ''}${p9 || ''}${p10}`;
            }
        };
        return [ext1];
    });

    showdown.extension('docs', function () {
        // @conditional {...}
        let ext1 = {
            type: 'output',
            regex: /@conditional\s*\{(.*?)\}/g,
            replace: '<span class="conditional"><span><span>$1</span></span>Conditionally required</span>',
        };
        // @required or @optional
        let ext2 = {
            type: 'output',
            regex: /@(optional|required)/g,
            replace: (m0, text) => `<span class="${text}">${text[0].toUpperCase() + text.substring(1)}</span>`,
        };
        return [ext1, ext2];
    });

    showdown.extension('doctmlCode', function () {
        function toBase64(value: unknown): string {
            const json = JSON.stringify(value);
            const bytes = new TextEncoder().encode(json);

            let binary = "";
            bytes.forEach(byte => {
                binary += String.fromCharCode(byte);
            });

            return btoa(binary);
        }
        function fromBase64<T = unknown>(base64: string): T {
            const binary = atob(base64);
            const bytes = Uint8Array.from(binary, char => char.charCodeAt(0));

            const json = new TextDecoder().decode(bytes);
            return JSON.parse(json) as T;
        }
        // ```xml
        let ext1 = {
            type: 'lang',
            regex: /(?:^|(?<=\n))(```xml)(.*?)(\r?\n)([\s\S]*?)(\r?\n```)(?:(?=\r?\n)|$)/g,
            replace: (m0: string, start: string, argsText: string, nl1: string, code: string, end: string) => {
                let args = (argsText.trim() ? JSON5.parse(argsText) : {}) as PreviewArgs;
                if (args.noPreview) {
                    return [start, nl1, code, end].join('');
                }
                let hash = alphabeticHash(`${JSON.stringify(args)}\n${code}`);
                let doc: DocumentMetrics | JobPostponed;
                doc = asyncJob(`doctml-preview-${hash}`, () => generatePreview(code, hash, args));
                if (doc === jobPostponed) {
                    return [start, nl1, code, end].join('');
                }
                console.log("doctml code block found:", hash, code, args);
                return `${start}${nl1}${code}${end}\n\n<p>HerEGoEsAPreVIewoFtHecODEaboVe_${hash}:${toBase64(args)}:</p>`;
            }
        };
        let ext2 = {
            type: 'output',
            regex: qre.global.legacy`
                1: { // example code block
                    "<pre"
                    ">" or whitespace
                    lazy-repeat {
                        {
                            [^<]
                        } or {
                            "<"
                            look-ahead not "/pre>"
                        }
                    }
                    "</pre>"
                }
                repeat whitespace
                { // magic paragraph
                    "<p>"
                    repeat whitespace
                    "HerEGoEsAPreVIewoFtHecODEaboVe_"
                    2: repeat [a-z]
                    ":"
                    3: lazy-repeat any
                    ":"
                    repeat whitespace
                    "</p>"
                }
                `, // https://kildom.github.io/qre-web-demo/#2lZVBT8IwFMc991MsvXFAVG5jLDERhRMaEy4EpW2e22RjS4eCEL+7722whdEx6WGH9r2u//frv09h6duJhu8A1tfRZ3rF8OKMcowvX1h7MjuK0hY6XkOaoriUVTkTZt5jLDcXzmas94QPUFnVq7e2tSPDwkZECfqLiFsyjNXiJJQGd/AA3LzkcjJMWU1jVCi2P8gqQ74zRtCoX6ExfXNmtQG5a8/mc8esoDhjSZLuHe+gZrc+5de4Yp7lTs1mp+H7Ip2pZwYuEl6gLGwKwtMi8euo1Zy/+SdZ/hD04CkepPfPGiYjWMePqyGo8cNAyHgC7+a97+zD9lPR3pqJcduc27WPbgp696L0f8pCGEYU88JG9JqhkeaM0cXHl2ml+3zDXSfzicJWm/a5kIq745UPOrOP06Gvm5NuTnyNo9x2x3mIrKHqoRSB8hP5IZVY+nIBHoh4mSyTMISFFwU2dG/6NmlkhaJDF55iFyFtZV/X0Jq1KlE412N/
            replace: (m0: string, codeHTML: string, hash: string, argsEncoded: string) => {

                let args = fromBase64<PreviewArgs>(argsEncoded);
                let doc: DocumentMetrics | JobPostponed;
                doc = asyncJob(`doctml-preview-${hash}`);
                if (doc === jobPostponed) {
                    throw new Error("This should not happen!");
                }
                let images = '';
                for (let page of doc.pages) {
                    let width = Math.round(page.pixelWidth / doc.pngWidth * 95);
                    images += `<div class="doctml-preview-img"><img src="preview/${args.fullPage ? page.svgName : page.svgCroppedName}" style="width: ${width}%"/></div>`;
                }
                return `
                    <div class="doctml-preview-group">
                        ${codeHTML}
                        <div class="doctml-preview-panel">${images}</div>
                    </div>`;
                // TODO: Add controls to preview PDF and download DOCX
                // click on page shows dialog with PDF iframe preview
                // button on that dialog to download the DOCX
            }
        };
        return [ext1, ext2];
    });

    showdown.extension('docxJsLinks', function () {
        let ext1 = {
            type: 'lang',
            regex: qre.global.legacy.ignoreCase`
                "docx.js:"
                1: repeat [a-z0-9_]
                optional {
                    "."
                    2: repeat [a-z0-9_]
                }
                `, // https://kildom.github.io/qre-web-demo/#2SwYGvW5BUWpZZmq5Xm5WMQMXMOF4QqIxsBQY9qDMDvRUkQIwxxelFhcDPVfMhR7PoGhWsubigmQuoCg4rqExDI1U5HjmQs+2Sin5yRV6WcVWShhShlawaIpO1K0y0LWMj8VQA08X1RhSYNP1MI0FASMijK7lSoB7DJS+gF5L4OKCOTeksiAVlacHix8uLrhOWPkTDcw/IDMQJVpRqmasJpoqoJg1FwA=
            replace: (m0: string, typeName: string, property?: string) => {
                if (property) {
                    return `<a href="https://docx.js.org/api/types/index.${typeName}.html#${property.toLowerCase()}" target="doctmlDocxJsFrame"><code>docx.js ${typeName}.${property}</code></a>`;
                } else {
                    return `<a href="https://docx.js.org/api/types/index.${typeName}.html" target="doctmlDocxJsFrame"><code>docx.js ${typeName}</code></a>`;
                }
            }
        };
        return [ext1];
    });

}
