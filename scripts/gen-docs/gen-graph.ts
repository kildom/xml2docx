import fs from "node:fs";
import path from "node:path";
import { isDirectExecution, runCli } from "../utils";
import { Docs, DocsTag } from "./parse-docs";
import { compileTemplate } from "./template";


interface GraphNode {
    id: string;
    name: string;
    brief: string;
    link: string;
};

interface GraphGroupItem {
    name: string;
    brief: string;
    link: string;
};

interface GraphGroup {
    id: string;
    name: string;
    items: GraphGroupItem[];
};

interface GraphEdge {
    from: string;
    to: string;
    implicit: boolean;
};


function getId(tag: DocsTag): string {
    return tag.inGroup ? tag.inGroup.name : tag.name;
}

function getChildren(tag: DocsTag): [DocsTag[], DocsTag | undefined] {
    let children: DocsTag[] = [];
    let implicit: DocsTag | undefined;
    if (tag.children.length) {
        children = tag.children;
        implicit = tag.implicit;
    } else if (tag.aliasOf) {
        children = tag.aliasOf.tag.children;
        implicit = tag.aliasOf.tag.implicit;
    }
    return [children, implicit];
}

export function generateGraph(docs: Docs, outputLight: string, outputDark: string,
    linkCallback: (tag: DocsTag) => string): void {

    let nodes: GraphNode[] = [];
    let groups: GraphGroup[] = [];
    let edges: Record<string, GraphEdge> = {};

    let doneTags = new Set<DocsTag>();

    for (let docsGroup of Object.values(docs.groups).filter(g => !g.hidden)) {
        let group: GraphGroup = {
            id: docsGroup.name,
            name: docsGroup.brief || docsGroup.name,
            items: docsGroup.tags.map(tag => ({
                name: tag.name,
                brief: tag.brief || tag.name,
                link: linkCallback(tag),
            })),
        };
        groups.push(group);
        for (let docsTag of docsGroup.tags) {
            doneTags.add(docsTag);
            let [children, implicit] = getChildren(docsTag);
            for (let child of children) {
                let from = getId(docsTag);
                let to = getId(child);
                edges[`${from}->${to}`] = { from, to, implicit: child === implicit };
            }
        }
    }

    for (let docsTag of Object.values(docs.tags).filter(t => !t.hidden && !doneTags.has(t))) {
        let node: GraphNode = {
            id: docsTag.name,
            name: docsTag.name,
            brief: docsTag.brief || docsTag.name,
            link: linkCallback(docsTag),
        };
        nodes.push(node);
        let [children, implicit] = getChildren(docsTag);
        for (let child of children) {
            let from = getId(docsTag);
            let to = getId(child);
            edges[`${from}->${to}`] = { from, to, implicit: child === implicit };
        }
    }

    let templateData = {
        nodes,
        groups,
        edges: Object.values(edges),
    };

    let tempDirPath = 'temp/docs-graph';
    let templateDirPath = 'scripts/gen-docs/templates';
    fs.mkdirSync(tempDirPath, { recursive: true });
    fs.mkdirSync(path.dirname(outputLight), { recursive: true });
    fs.mkdirSync(path.dirname(outputDark), { recursive: true });
    dotFromTemplate(`${templateDirPath}/graph-light.dot`, templateData, `${tempDirPath}/graph-light.dot`);
    svgFromDot(`${tempDirPath}/graph-light.dot`, outputLight);
    dotFromTemplate(`${templateDirPath}/graph-dark.dot`, templateData, `${tempDirPath}/graph-dark.dot`);
    svgFromDot(`${tempDirPath}/graph-dark.dot`, outputDark);
}

function dotFromTemplate(templatePath: string, data: any, outputPath: string): void {
    let templateContent = fs.readFileSync(templatePath, 'utf-8');
    let template = compileTemplate(templateContent);
    let dotContent = template(data);
    fs.writeFileSync(outputPath, dotContent, 'utf-8');
}

function svgFromDot(dotPath: string, outputPath: string): void {
    let dot = 'dot';
    if (process.env.GRAPHVIZ_DOT_PATH) {
        dot = process.env.GRAPHVIZ_DOT_PATH;
    }
    runCli(dot, ['-Tsvg', dotPath, '-o', outputPath]);
}

(typeof __RUN_SELF_TEST__ === 'boolean' ? __RUN_SELF_TEST__ : isDirectExecution(import.meta.url)) && (async () => {
    let pd = await import('./parse-docs');
    let docs = pd.parseDocs();
    generateGraph(docs, 'temp/docs-graph/graph-light.svg', 'temp/docs-graph/graph-dark.svg', tag => `${tag.name}.html`);
})();
