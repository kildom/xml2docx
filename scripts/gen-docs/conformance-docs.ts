
import * as fs from 'node:fs';
import { Docs } from './parse-docs';
import { mkdirFor } from '../common/utils';

const conformanceTestFile = 'artifacts/test/conformance/docs/tests.doctml';
const conformanceCoverageTarget = 'artifacts/test/conformance/docs/tags.json';

let testsFromDocs = new Set<string>();

export function registerTest(coverage: string, code: string, data?: any)
{
    let testStr: string;
    let covNew = coverage
        .split('\n')
        .map(x => x.trim())
        .filter(x => x)
        .map(x => x.startsWith('ERROR:') ? x : x + ' (docs)')
        .join('\n');
    if (data) {
        testStr = `\n\n<!--\n${covNew}\nDATA: ${JSON.stringify(data)}\n-->\n\n${code}\n\n`;
    } else {
        testStr = `\n\n<!--\n${covNew}\n-->\n\n${code}\n\n`;
    }
    testsFromDocs.add(testStr);
}

export function writeConformanceTests(docs: Docs)
{
    let testFile = '';
    for (let test of testsFromDocs) {
        testFile += test;
    }
    testFile += '<!--\nEND\n-->\n';
    mkdirFor(conformanceTestFile);
    fs.writeFileSync(conformanceTestFile, testFile);
    let coverageTarget = {} as any;
    for (let [tagName, tag] of Object.entries(docs.tags)) {
        if (tag.hidden) {
            continue;
        }
        let targetTag = {
            name: tagName,
            brief: tag.brief,
            attributes: {} as Record<string, string>,
        };
        for (let [attrName, attr] of Object.entries(tag.attributes)) {
            targetTag.attributes[attrName] = attr.brief;
        }
        coverageTarget[tagName] = targetTag;
    }
    mkdirFor(conformanceCoverageTarget);
    fs.writeFileSync(conformanceCoverageTarget, JSON.stringify(coverageTarget, null, 4));
}
