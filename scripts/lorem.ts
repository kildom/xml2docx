import { LoremIpsum } from 'lorem-ipsum-nn';
import { isDirectExecution } from './utils';


interface LoremOptions {
    seed?: number;
    language?: string;
    length?: number;
    skipLoremIpsum?: boolean;
    paragraphs?: string;
    prefix?: string;
    wordWrap?: number;
    lineBreak?: string;
};

// TODO: This function should be available in DocTML by default.
export function lorem(optionsOrLength?: LoremOptions | number, seed?: number): string {

    if (typeof optionsOrLength === 'number') {
        optionsOrLength = { length: optionsOrLength, seed };
    }

    let options = optionsOrLength || {};
    options.wordWrap = options.wordWrap || +Infinity;

    let lorem = new LoremIpsum({
        version: 1,
        language: options.language || 'la',
        seed: options.seed,
        paragraphs: options.paragraphs ? { separator: options.paragraphs } : undefined,
    });

    let text = options.prefix || '';
    if (!options.skipLoremIpsum) {
        text += 'Lorem ipsum ';
    }
    let length = (options.length || 500) - text.length;

    lorem.setContext(text);
    text += lorem.generate(length);

    if (options.wordWrap) {
        let lineBreak = options.lineBreak || '\n';
        let paragraphBreak = options.paragraphs ? options.paragraphs : 'ThiSTeXtIsNOTDiviDedINtopAraGraphs';
        text = text.split(paragraphBreak).map(paragraph => {
            let result = '';
            while (paragraph.length > options.wordWrap!) {
                let wrapAt = paragraph.lastIndexOf(' ', options.wordWrap);
                if (wrapAt === -1) {
                    wrapAt = options.wordWrap!;
                }
                result += paragraph.substring(0, wrapAt) + lineBreak;
                paragraph = paragraph.substring(wrapAt).trimStart();
            }
            result += paragraph;
            return result;
        }).join(paragraphBreak);
    }
    return text;
}


(typeof __RUN_SELF_TEST__ === 'boolean' ? __RUN_SELF_TEST__ : isDirectExecution(import.meta.url)) && (async () => {
    console.log('\n----------\nDefaults:')
    console.log(lorem());
    console.log('\n----------\nPL:')
    console.log(lorem({ language: 'pl' }));
    console.log('\n----------\nShort:')
    console.log(lorem({ length: 100 }));
    console.log('\n----------\nWith Lorem Ipsum:')
    console.log(lorem({ length: 100, skipLoremIpsum: true }));
    console.log('\n----------\nThe same seed:')
    console.log(lorem({ length: 100, seed: 12345 }));
    console.log(lorem({ length: 100, seed: 12345 }));
    console.log('\n----------\nParagraphs:')
    console.log(lorem({ length: 1000, paragraphs: '\n\n' }));
    console.log('\n----------\nWith Prefix:')
    console.log(lorem({ length: 100, prefix: 'Thannedident' }));
    console.log(lorem({ length: 100, prefix: 'Thannedident' }));
    console.log('\n----------\nDirect params:')
    console.log(lorem(100));
    console.log(lorem(100));
    console.log(lorem(100, 12345));
    console.log(lorem(100, 12345));
})();
