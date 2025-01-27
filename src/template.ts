
import { template } from 'underscore';
import { DocTMLError, OptionsProcessed } from './doctml';
import { dirName } from './common';


class TemplateUtils {
    public templateDir: string;
    public inputFile: string;
    public inputDir: string;
    public dataFile: string;
    public dataDir: string;
    public data: any;

    constructor(
        public options: OptionsProcessed,
        public templateFile: string
    ) {
        this.templateDir = dirName(this.templateFile);
        this.inputFile = options.inputFile;
        this.inputDir = dirName(this.inputFile);
        this.dataFile = options.dataFile!;
        this.dataDir = dirName(this.dataFile);
        this.data = options.data;
    }

    public include(fileName: string): string {
        if (this.options.readFile == null) {
            throw new DocTMLError('Cannot include files, no readFile callback given.');
        }
        let template = this.options.readFile(fileName, false) as string;
        let text = renderTemplate(this.options, template, fileName);
        return text;
    }

}

export function renderTemplate(options: OptionsProcessed, input: string, inputFile: string): string {

    let compiled: ReturnType<typeof template>;
    try {
        compiled = template(input, {
            evaluate: /<%!([\s\S]+?)%>/g,
            interpolate: /<%=([\s\S]+?)%>/g,
            escape: /<%(?![!=])([\s\S]+?)%>/g
        });
    } catch (err) {
        throw new DocTMLError(`Error parsing template from "${inputFile}".`, err);
    }

    try {
        let utils = new TemplateUtils(options, inputFile);
        return compiled({ utils: utils, ...options.data, __utils__: utils });
    } catch (err) {
        throw new DocTMLError(
            `Error evaluating template from "${inputFile}" with data from "${options.dataFile}".`,
            err
        );
    }
}
