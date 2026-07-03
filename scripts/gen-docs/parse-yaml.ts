import fs from 'node:fs';
import path from 'node:path';
import * as yaml from 'yaml';
import { z } from 'zod';
import { isDirectExecution } from '../utils';

/*

The file is responsible for parsing and initial validating the YAML files and Markdown files in the `docs` directory.

The result of parseDocsInput() function contains data structure as it is written in the YAML files almost without
modifications. It only adds "location" property to all top-level items.

*/

const DOCS_DIR = 'docs';

const ExampleSchema = z.object({
    'title': z.string(),
    'code': z.string(),
}).strict();

const AttributeSchema = z.object({
    'value': z.string().optional(),
    'required': z.union([z.boolean(), z.string()]).optional(),
    'brief': z.string().optional(),
    'details': z.string().optional(),
    'type': z.string().optional(),
    'docx-js': z.string().optional(),
    'experimental': z.boolean().optional(),
    'examples': z.array(ExampleSchema).optional(),
    'validation': z.string().optional(),
}).strict();

const TypeSchema = AttributeSchema.extend({
    'type-name': z.string(),
    'location': z.string(),
}).strict();

const TagSchema = z.object({
    'tag-name': z.string(),
    'location': z.string(),
    'children': z.array(z.string()).optional(),
    'implicit': z.string().optional(),
    'brief': z.string().optional(),
    'details': z.string().optional(),
    'combine': z.array(z.string()).optional(),
    'attributes': z.record(z.string(), AttributeSchema).optional(),
    'custom-page': z.string().optional(),
    'alias-of': z.string().optional(),
    'alias-text': z.string().optional(),
    'docx-js': z.string().optional(),
    'unused-docx-js': z.array(z.string()).optional(),
    'examples': z.array(ExampleSchema).optional(),
}).strict();

const GroupSchema = z.object({
    'group-name': z.string(),
    'location': z.string(),
    'brief': z.string().optional(),
    'tags': z.array(z.string()),
}).strict();

const PageSchema = z.object({
    'page-name': z.string(),
    'location': z.string(),
    'text': z.string(),
}).strict();

const EnumSchema = z.object({
    'enum-name': z.string(),
    'location': z.string(),
    'combine': z.array(z.string()).optional(),
    'values': z.record(z.string(), z.union([z.string(), z.null()])).optional(),
}).strict();

export type YamlAttribute = z.infer<typeof AttributeSchema>;
export type YamlType = z.infer<typeof TypeSchema>;
export type YamlTag = z.infer<typeof TagSchema>;
export type YamlGroup = z.infer<typeof GroupSchema>;
export type YamlPage = z.infer<typeof PageSchema>;
export type YamlEnum = z.infer<typeof EnumSchema>;
export type YamlExample = z.infer<typeof ExampleSchema>;

export type YamlTopLevelItem = YamlTag | YamlGroup | YamlPage | YamlType | YamlEnum;

export interface YamlDocs {
    tags: Record<string, YamlTag>;
    groups: Record<string, YamlGroup>;
    pages: Record<string, YamlPage>;
    types: Record<string, YamlType>;
    enums: Record<string, YamlEnum>;
};

export function parseDocsInput(): YamlDocs {
    let result: YamlDocs = {
        tags: {},
        groups: {},
        pages: {},
        types: {},
        enums: {},
    };
    for (let file of fs.readdirSync(DOCS_DIR)) {
        let fullPath = path.join(DOCS_DIR, file);
        if (file.endsWith('.yaml')) {
            const fileContent = fs.readFileSync(fullPath, 'utf-8');
            const parsedYaml = yaml.parse(fileContent);
            if (!Array.isArray(parsedYaml)) {
                console.error(`Error parsing ${file}: top-level structure must be an array`);
                process.exit(1);
            }
            for (let item of parsedYaml) {
                if (typeof item !== 'object' || item === null) {
                    console.error(`Error parsing ${file}: each item must be an object`);
                    process.exit(1);
                }
                let schema: any;
                let container: Record<string, any>;
                let name: string;
                if (item['tag-name']) {
                    schema = TagSchema;
                    container = result.tags;
                    name = item['tag-name'];
                } else if (item['group-name']) {
                    schema = GroupSchema;
                    container = result.groups;
                    name = item['group-name'];
                } else if (item['page-name']) {
                    schema = PageSchema;
                    container = result.pages;
                    name = item['page-name'];
                } else if (item['type-name']) {
                    schema = TypeSchema;
                    container = result.types;
                    name = item['type-name'];
                } else if (item['enum-name']) {
                    schema = EnumSchema;
                    container = result.enums;
                    name = item['enum-name'];
                } else {
                    console.error(`Error parsing ${file}: each item must have one of the following keys: 'tag-name', 'group-name', 'page-name', 'type-name', 'enum-name'. Found keys: ${Object.keys(item).join(', ')}`);
                    process.exit(1);
                }
                item.location = `${file}:${name}`;
                const parseResult = schema.safeParse(item);
                if (!parseResult.success) {
                    console.error(`Error parsing ${file}:${name}:`, parseResult.error);
                    process.exit(1);
                }
                if (container[name]) {
                    console.error(`Error parsing ${file}:${name}: duplicate definition. Previous definition at ${container[name].location}`);
                    process.exit(1);
                }
                container[name] = parseResult.data!;
            }
        } else if (file.endsWith('.md')) {
            result.pages[file.substring(0, file.length - 3)] = {
                "page-name": file.substring(0, file.length - 3),
                "location": file,
                "text": fs.readFileSync(fullPath, 'utf-8'),
            };
        }
    }
    return result;
}


(typeof __RUN_SELF_TEST__ === 'boolean' ? __RUN_SELF_TEST__ : isDirectExecution(import.meta.url)) && (async () => {
    console.log(JSON.stringify(parseDocsInput(), null, 2));
})();

