import fs from 'node:fs';
import graphviz from 'graphviz-wasm';
import { getGroups, getTags, parse } from './parser';
import { compileTemplate } from './template';
import { markdownToHtml } from './markdown';

function safeStringify(obj) {
    const seen = new WeakSet();
    return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) return `[Circular] ${value.name}`;
            seen.add(value);
        }
        return value;
    }, 2);
}

async function main() {

    parse();
    let tags = getTags();
    fs.writeFileSync('dist/tags.json', safeStringify(tags));

    let tagTemplateText = fs.readFileSync('scripts/gen-docs/templates/tag.html', 'utf8');
    let tagTemplate = compileTemplate(tagTemplateText);

    for (let tag of getTags()) {
        let html = tagTemplate({ tag, markdownToHtml });
        fs.mkdirSync(`dist/docs`, { recursive: true });
        fs.writeFileSync(`dist/docs/${tag.name}.html`, html);
    }

    let dotTemplateText = fs.readFileSync('scripts/gen-docs/templates/graph.dot', 'utf8');
    let dotTemplate = compileTemplate(dotTemplateText);
    let dot = dotTemplate({ tags: getTags(), groups: getGroups() });
    fs.writeFileSync('dist/docs/graph.dot', dot);
    await graphviz.loadWASM();
    const svg = graphviz.layout(dot);
    fs.writeFileSync('dist/docs/graph.svg', svg);
}

main();
