import fs from "node:fs";
import path from "node:path";
import qre from 'qre';
import { generateGraph } from "./gen-graph";
import { Docs, parseDocs } from "./parse-docs";
import { preprocessDocs } from "./preprocess";
import { markdownToHtml } from "./markdown";
import { compileTemplate } from "./template";
import { asyncRetryLoop } from "./async-jobs";
import { runCli } from "../utils";

/*

This file generates the documentation in HTML format.

The output files structure:
 - [page-name].html - page generated from [page-name].md using templates/page.html
 - [tag-name].html - tag page generated from specific tag data using templates/tag.html
 - graph-dark.svg - dark graph of tags
 - graph-light.svg - light graph of tags
 - img/* - images copied from the docs/img folder
 - static/* - static files copied from the templates/static folder
   The ts files in static directory are not copied, but only main.ts
   is compiled to main.js in the output directory.

To be done later (all three files should be downloaded in parallel to speed up loading search functionality):
 - search-index - lexical search index
 - search-embeddings - semantic search embeddings
 - search-model - semantic search model
*/

const outputDir = 'dist/html';
const pageTemplatePath = 'scripts/gen-docs/templates/page.html';
const tagTemplatePath = 'scripts/gen-docs/templates/tag.html';

function escapeHtml<T>(text: T): T {
    if (!text) return text;
    return (text as any).replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function stripHtmlTags<T>(text: T): T {
    if (!text) return text;
    return (text as any).replace(/<[^>]*>/g, '');
}


async function main() {

    // Load the docs data from files
    let docs = parseDocs();

    // Preprocess the docs data and substitute links and references
    preprocessDocs(docs, {
        substituteLink(ctx, link, text) {
            let m = link.match(/^([^#]*)#([\s\S]*)$/);
            let [address, fragment] = m ? [m[1], m[2]] : [link, ""];
            if (address.endsWith(".md")) {
                address = address.slice(0, -3) + ".html";
            }
            return `${address}${fragment ? "#" + fragment : ""}`;
        },
        referenceTag(ctx, tag) {
            let endingSlash = (tag.children && tag.children.length > 0) ? "/" : "";
            if (tag.name.toUpperCase() === tag.name) {
                return `<a href="${tag.name}.html" class="tag-link">\`${tag.name}${endingSlash}\`</a>`;
            }
            return `<a href="${tag.name}.html" class="tag-link">\`<${tag.name}${endingSlash}>\`</a>`;
        },
        referenceAttribute(ctx, tag, attribute, value) {
            if (ctx.tag === tag) {
                return `<a href="#attr-${attribute.name}" class="attr-link">\`` +
                    `${attribute.name}="${escapeHtml(value) || '…'}"\`</a>`;
            } else {
                return `<a href="${tag.name}.html#attr-${attribute.name}" class="attr-link">\`` +
                    `<${tag.name}&nbsp;${attribute.name}="${escapeHtml(value) || '…'}"\`</a>`;
            }
        },
        templateData(ctx, tag, attribute, page, enumObj) {
            return {
                agents: false,
            }
        },
    });

    console.log("Generating graph...");
    generateGraph(docs, `${outputDir}/graph-light.svg`, `${outputDir}/graph-dark.svg`, tag => `${tag.name}.html`);

    console.log("Generating pages...");
    await generatePages(docs);

    console.log("Generating tags...");
    await generateTags(docs);

    console.log("Generating js...");
    generateJs();

    console.log("Copying static content...");
    copyStaticContent();
}

const headerExtractRegex = qre.global`
    "<h"
    number: [1-6]
    optional {
        at-least-1 whitespace
        repeat not ">"
    }
    ">"
    title: lazy-repeat any
    {
        "</h"
        match<number>
        ">"
    }
`; // https://kildom.github.io/qre-web-demo/#2bVTLroIwEL1rvqLpCpIrCgsXinVlont3TRMhNkEDmEBNfMR/dx5YjNqwoPM48zidKV1drcHPtquLw8hxfez+PnlEGuU8CHh4MI63h11gL8zti9EAH6nMSkk/zbkubDsTOhlNDUk8i3e64nljYGiJ1/Y0IRFSMeqDg/Q3d3CVnYkqv12BDOa0uZJqiCGzcZ8SHloqGSenBhsPv4Ny+3ppzUGJuyArU3HYL2R3qq1UW5hnAR/mxT2BCKkCq8TrvDxRBMmIre3OFUIS9LDgvjsbzcnltcE0TCA7m7gDisIw/xdFJBZK0G7eNC7MdWIiGHwvKFAQ6YlZxjo1H4g/Qz4B

async function generatePages(docs: Docs) {
    let template = compileTemplate(fs.readFileSync(pageTemplatePath, 'utf-8'));
    for (let page of Object.values(docs.pages)) {
        console.log(`    generating page: ${page.name}.html`);
        let fileName = `${outputDir}/${page.name}.html`;
        let html!: string;
        await asyncRetryLoop(() => {
            html = markdownToHtml(page.text, true);
        });
        let titleMatches = html.matchAll(headerExtractRegex);
        let title = [...titleMatches].sort((a, b) => parseInt(a[1]) - parseInt(b[1]))[0]?.[2] || page.name;
        title = stripHtmlTags(title);
        console.log('        ', title);
        fs.mkdirSync(path.dirname(fileName), { recursive: true });
        fs.writeFileSync(fileName, html, 'utf-8');
        let htmlContent!: string;
        await asyncRetryLoop(() => {
            htmlContent = template({ page, html, title });
        });
        fs.writeFileSync(fileName, htmlContent, 'utf-8');
    }
}

async function generateTags(docs: Docs) {
    let template = compileTemplate(fs.readFileSync(tagTemplatePath, 'utf-8'));
    for (let tag of Object.values(docs.tags).filter(t => !t.hidden)) {
        console.log(`    generating tag: ${tag.name}.html`);
        let fileName = `${outputDir}/${tag.name}.html`;
        let htmlContent!: string;
        await asyncRetryLoop(() => {
            htmlContent = template({ tag, markdown: markdownToHtml });
        });
        fs.writeFileSync(fileName, htmlContent, 'utf-8');
    }
}

function generateJs() {
    runCli('npx', [
        'esbuild',
        'scripts/gen-docs/templates/src/main.ts',
        '--platform=browser',
        '--format=iife',
        '--bundle',
        '--sourcemap',
        '--target=es2020',
        '--global-name=js',
        `--outfile=${outputDir}/src/main.js`
    ]);
}

function copyStaticContent() {
    let staticDir = 'scripts/gen-docs/templates/static';
    let outputStaticDir = `${outputDir}/static`;
    console.log(`    from ${staticDir} to ${outputStaticDir}`);
    fs.mkdirSync(outputStaticDir, { recursive: true });
    fs.cpSync(staticDir, outputStaticDir, { recursive: true });
}

main();
