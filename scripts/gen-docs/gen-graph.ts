import fs from "node:fs";
import { isDirectExecution } from "../utils";
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

function generateGraph(docs: Docs, outputFile: string): void {
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
                link: `${tag.name}.html`,
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
            link: `${docsTag.name}.html`,
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
    
    let template = compileTemplate(fs.readFileSync('scripts/gen-docs/templates/graph-light.dot', 'utf-8'));

    let dotContent = template(templateData);

    fs.writeFileSync(outputFile + '.dot', dotContent, 'utf-8');
}

(typeof __RUN_SELF_TEST__ === 'boolean' ? __RUN_SELF_TEST__ : isDirectExecution(import.meta.url)) && (async () => {
    let pd = await import('./parse-docs');
    let docs = pd.parseDocs();
    generateGraph(docs, 'test/outputs/graph.svg');
})();
