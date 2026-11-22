
import * as fs from 'node:fs';
import * as path from 'node:path';


export class TestCase {
    public id: string = '';
    public dir: string = '';
    public inputFile: string = '';
    public inputLine: string = '';
    public coverage: {
        tag: string;
        attribute?: string;
        title: string;
    }[] = [];
    public expectedErrors: string[] = [];

    constructor(file?: string)
    {
        if (file) {
            let testCaseData: Pick<TestCase, keyof TestCase> = JSON.parse(fs.readFileSync(file, 'utf-8'));
            this.id = testCaseData.id;
            this.dir = path.dirname(file);
            this.inputFile = testCaseData.inputFile;
            this.inputLine = testCaseData.inputLine;
            this.coverage = testCaseData.coverage;
            this.expectedErrors = testCaseData.expectedErrors;
        }
    }

};


