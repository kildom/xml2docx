
import * as fs from 'node:fs';
import { Options, Result, generate } from '../src/doctml';
import assert from 'node:assert';

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
            debugFile: (result, type, content) => {
                if (type === 'rendered') throw new EndOfTestIsNotAnError(content as string);
            },
            readFile: (result, file, binary) => {
                return fs.readFileSync(file, binary ? null : 'utf8');
            },
        };

        let result = await generate(options);

        try {
            assert(result.errors.length > 0, 'Expected error, got none.');
            let ok = result.errors.length === 1 && result.errors[0].sourceError instanceof EndOfTestIsNotAnError;

            if (ok) {
                let output = (result.errors[0].sourceError as EndOfTestIsNotAnError).result.trim();
                assert(expected !== 'ERROR', `Expecting exception\nGot output:\n${output}`)
                if (output !== expected) {
                    for (let pos = 0; pos <= Math.min(output.length, expected.length); pos++) {
                        if (output[pos] !== expected[pos]) {
                            let ok = output.substring(0, pos);
                            let line = ok.split('\n').length;
                            let startOfLine = ok.lastIndexOf('\n') + 1;
                            let column = ok.substring(startOfLine).length + 1;
                            assert(false, `Difference at line ${line}, column ${column}\nGot output:\n${output}`);
                        }
                    }
                    assert(false, `Unexpected\nGot output:\n${output}`);
                }
            } else {
                assert(expected === 'ERROR', 'Expecting output, got errors.');
            }

            passingTests++;
            console.log(`[PASS] ${fileName}`);

        } catch (err) {

            failingTests++;
            console.error(`[FAIL] ${fileName}`);
            console.error('       ' + err.message.trim().replace(/\r?\n/g, '\n       '));
            for (let resultError of result.errors) {
                if (!(resultError.sourceError instanceof EndOfTestIsNotAnError)) {
                    console.error(resultError);
                    if (resultError.sourceError) {
                        console.error(resultError.sourceError);
                    }
                }
            }

        }
    }

    console.log(`\nResults: ${passingTests} passing, ${failingTests} failing.`);

    if (failingTests > 0) {
        process.exit(1);
    }
}

test();
