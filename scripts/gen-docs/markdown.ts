
import crypto from 'node:crypto';
import qre from 'qre';
import JSON5 from 'json5';
import showdown from 'showdown';
import showdownHighlight from 'showdown-highlight';
import { asyncJob, jobPostponed, JobPostponed } from './async-jobs';
import { DocumentMetrics, generatePreview } from './gen-preview';

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
            regex: /(?<!(?:^|\n)\s*>[^\n]*\r?\n)(?<=^|\n)(?<prefix>[ \t]*>)(?<type>[ \t]*\[!(?:NOTE|TIP|IMPORTANT|WARNING|CAUTION)\][ \t]*)(?<text>(?:\r?\n\k<prefix>.*?(?=\r?\n|$))+)/gsi,
            replace: (m0, prefix, type, text) => {
                let className = type.replace(/[^a-z]+/gi, '').toLowerCase();
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
        // ```xml
        let ext1 = {
            type: 'lang',
            regex: /(?:^|(?<=\n))(```xml)(.*?)(\r?\n)([\s\S]*?)(\r?\n```)(?:(?=\r?\n)|$)/g,
            replace: (m0: string, start: string, argsText: string, nl1: string, code: string, end: string) => {
                let args = argsText.trim() ? JSON5.parse(argsText) : {};
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
                return `${start}${nl1}${code}${end}\n\`\`\`\nHerEGoEsAPreVIewoFtHecODEaboVe_${hash}\n\`\`\``;
            }
        };
        let ext2 = {
            type: 'output',
            regex: qre.global.legacy`
                1: { // example code block
                    "<pre"
                    ">" or whitespace
                    lazy-repeat any
                    "</pre>"
                }
                repeat whitespace
                { // magic pre block
                    "<pre"
                    ">" or whitespace
                    lazy-repeat any
                    "HerEGoEsAPreVIewoFtHecODEaboVe_"
                    2: repeat [a-z]
                    lazy-repeat any
                    "</pre>"
                }
                `, // https://kildom.github.io/qre-web-demo/#2xVVNT8MwDOWcX1HltsOY4Lh1kZAobCdASLtME0uCS9c2S5UM9oH47zjNuom2wGlaDz04ju3n5xdLbH23MPCxgPWlSu0FwcEZexqf3rH3TuwIygSoeAPWIjhL6jw7mumAEC8utJZc7xmuSCV1rV71g08nWNhwVaC+HOOByLXMGq7uoyEWQNuPGHWCOXaz1Svnuy1y5Slfbn9J0sMsrJnmq2HZR/ojaYlO8beFRNbOD20EJrrXkb15NDAZw1rfrUYgH24jLvQEXtrzX/croFPe3c1O0dj5YXKcgHF25oS4hqAYV2ZIN5SF5WhI3C52SCl71spPS9hzf+ZDl3e8K/sHKldpkmVxkr8WaVIIEHnGOV6UPF7GIol/xj0UWO2RKb6DrtTjZjLQmXVqXmgbkG8=
            replace: (m0: string, codeHTML: string, hash: string) => {
                
                let doc: DocumentMetrics | JobPostponed;
                doc = asyncJob(`doctml-preview-${hash}`);
                if (doc === jobPostponed) {
                    throw new Error("This should not happen!");
                }
                let images = '';
                for (let page of doc.pages) {
                    let width = Math.round(page.pixelWidth / doc.pngWidth * 95);
                    images += `<div class="doctml-preview-img"><img src="preview/${page.svgCroppedName}" style="width: ${width}%"/></div>`;
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

}
