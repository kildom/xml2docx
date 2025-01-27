
import * as fs from 'node:fs';
import { Options, generate } from '../src/doctml';

class EndOfTestIsNotAnError extends Error {
    public constructor(
        public result: string
    ) {
        super();
    }
}

async function test() {
    let passingTests = 0;
    let failingTests = 0;
    for (let fileName of fs.readdirSync('test/template')) {
        if (!fileName.endsWith('.txt')) continue;

        let path = `test/template/${fileName}`;
        let text = fs.readFileSync(path, 'utf8');
        let [template, expected] = text.split(/----------------------------+/);
        template = template.trim();
        expected = expected.trim();

        let options: Options = {
            input: template,
            inputFile: path,
            dataFile: 'test/template/data.json5',
            debugFile: (type, content) => {
                if (type === 'rendered') throw new EndOfTestIsNotAnError(content as string);
            },
            readFile: (file, binary) => {
                return fs.readFileSync(file, binary ? null : 'utf8');
            },
        };

        let errorMessage: string | undefined = undefined;
        let error: any = undefined;

        try {
            await generate(options);
            throw new Error('This should not happen.');
        } catch (err) {
            if (err instanceof EndOfTestIsNotAnError) {
                let result = err.result.trim();
                if (expected === 'ERROR') {
                    errorMessage = `Expecting exception\nGot result:\n${result}`;
                } else if (result !== expected) {
                    for (let pos = 0; pos <= Math.min(result.length, expected.length); pos++) {
                        if (result[pos] !== expected[pos]) {
                            let ok = result.substring(0, pos);
                            let line = ok.split('\n').length;
                            let startOfLine = ok.lastIndexOf('\n') + 1;
                            let column = ok.substring(startOfLine).length + 1;
                            errorMessage = `Difference at line ${line}, column ${column}\nGot result:\n${result}`;
                            break;
                        }
                    }
                    if (!errorMessage) {
                        errorMessage = `Unexpected\nGot result:\n${result}`;
                    }
                }
            } else {
                if (expected !== 'ERROR') {
                    errorMessage = 'Expecting output, got exception:';
                    error = err;
                }
            }
        }

        if (errorMessage) {
            failingTests++;
            console.error(`[FAIL] ${fileName}`);
            console.error('       ' + errorMessage.trim().replace(/\r?\n/g, '\n       '));
            if (error) {
                console.error(error);
            }
        } else {
            passingTests++;
            console.log(`[PASS] ${fileName}`);
        }
    }

    console.log(`\nResults: ${passingTests} passing, ${failingTests} failing.`);

    if (failingTests > 0) {
        process.exit(1);
    }
}

test();
