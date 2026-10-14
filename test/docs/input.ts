
import fs from 'node:fs';
import { CUR, mkdirFor } from './common';

import { AttributeDocs, getTags, parse, TagDocs } from '../../scripts/gen-docs/parser';


export interface TestCaseDoc {
    type: 'doc';
    name: string;
    inputFile: string;
    outputFileStem: string;
    expectedErrors: string[];
    error: string;
    node: Tag | Attribute;
}

export interface TestCaseLink {
    type: 'link';
    name: string;
    node: Tag | Attribute;
    testCase: TestCaseDoc;
}

export type TestCase = TestCaseDoc | TestCaseLink;


export interface Tag extends TagDocs {
    type: 'tag';
    attributes: Record<string, Attribute>;
    testCases: TestCase[];
}


export interface Attribute extends AttributeDocs {
    type: 'attribute';
    fullName: string;
    testCases: TestCase[];
}


function createTags() {
    parse();
    let nodeByName: Record<string, Tag | Attribute> = {};
    let tags = getTags() as Tag[];
    tags.push({
        type: 'tag',
        name: 'general',
        customPage: '',
        children: [],
        parents: [],
        indirectChildren: [],
        indirectParents: [],
        groupsAndChildren: [],
        brief: 'General tests, not assigned to any tag or attribute.',
        details: '',
        attributes: {},
        testCases: [],
    });
    for (let tag of tags) {
        tag.type = 'tag';
        tag.testCases = [];
        nodeByName[tag.name] = tag;
        for (let attribute of Object.values(tag.attributes)) {
            attribute.type = 'attribute';
            attribute.testCases = [];
            attribute.fullName = `${tag.name}.${attribute.name}`;
            nodeByName[attribute.fullName] = attribute;
        }
    }
    return { tags, nodeByName };
}


function createTestCases(nodeByName: Record<string, Attribute | Tag>) {

    let testCases: TestCase[] = [];

    for (let file of fs.readdirSync('test/docs/data', { recursive: true, encoding: 'utf-8' })) {
        let inputFile = `test/docs/data/${file}`;
        let stem = file.replace(/\.doctml$/, '');
        let content = fs.readFileSync(inputFile, 'utf-8');
        let parts = content.split(/<!--\s*\n(.*?)\n\s*-->/gs);
        if (parts.length === 1) {
            throw new Error(`Missing test cases in ${inputFile}`);
        }
        if (parts.at(-2)!.trim().toUpperCase() !== 'END') {
            parts.push('END', '');
        }
        let header = parts.shift()!;
        let footer = parts.pop()!;
        parts.pop();
        for (let i = 0; i < parts.length; i += 2) {
            let groupIndex = i >> 1;
            let casesText = parts[i];
            let body = parts[i + 1];
            let outputStem = `${stem}.t${groupIndex}`;
            let casesArr = casesText
                .split('\n')
                .map(x => x.trim())
                .filter(x => x)
                .map(x => x.match(/^(.*?):(.*)$/))
                .map(m => { if (!m) throw new Error('Invalid test case'); return m; })
                .map(m => [m[1].trim().toLowerCase(), m[2].trim()]);
            if (casesArr.length === 0) throw new Error('Invalid test case');
            let testCaseDoc: TestCaseDoc = {
                type: 'doc',
                inputFile,
                name: `${casesArr[0][0]}: ${casesArr[0][1]}`,
                expectedErrors: [],
                outputFileStem: outputStem,
                error: '',
                node: nodeByName[casesArr[0][0]],
            };
            let currentTestCases: TestCase[] = [testCaseDoc];
            for (let caseItem of casesArr.slice(1)) {
                if (caseItem[0] === 'error') {
                    testCaseDoc.expectedErrors.push(caseItem[1]);
                } else {
                    currentTestCases.push({
                        type: 'link',
                        name: `${caseItem[0]}: ${caseItem[1]}`,
                        node: nodeByName[caseItem[0]],
                        testCase: testCaseDoc,
                    });
                }
            }
            for (let testCase of currentTestCases) {
                if (!testCase.node) {
                    throw new Error(`Test case does not match any tag or attribute: ${testCase.name}`);
                }
                testCase.node.testCases.push(testCase);
            }
            testCases.push(...currentTestCases);
            let doctmlFile = `${CUR}/doctml/${outputStem}.doctml`;
            mkdirFor(doctmlFile);
            fs.writeFileSync(doctmlFile, header + body + footer);
        }
    }

    return testCases;
}

function checkMissingTestCases(tags: Tag[], testCases: TestCase[]) {
    for (let tag of tags) {
        if (tag.testCases.length === 0) {
            let testCase: TestCaseDoc = {
                type: 'doc',
                name: `${tag.name}: All documented tags must have at least one test case.`,
                inputFile: '[none]',
                outputFileStem: `${tag.name}-missing`,
                expectedErrors: [],
                error: 'Test cases not implemented.',
                node: tag,
            };
            tag.testCases.push(testCase);
            testCases.push(testCase);
        }
        for (let attribute of Object.values(tag.attributes)) {
            if (attribute.testCases.length === 0) {
                let testCase: TestCaseDoc = {
                    type: 'doc',
                    name: `${tag.name}.${attribute.name}: All documented attributes must have at least one test case.`,
                    inputFile: '[none]',
                    outputFileStem: `${tag.name}-${attribute.name}-missing`,
                    expectedErrors: [],
                    error: 'Test cases not implemented.',
                    node: attribute,
                };
                attribute.testCases.push(testCase);
                testCases.push(testCase);
            }
        }
    }
}

export function prepareInput() {
    let { tags, nodeByName } = createTags();
    let testCases = createTestCases(nodeByName);
    checkMissingTestCases(tags, testCases);
    return { tags, testCases };
}
