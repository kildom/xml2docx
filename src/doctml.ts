
import JSON5 from 'json5';
import { renderTemplate } from './template';

export type DebugFileType = 'data' | 'rendered'; // If macros implemented add 'expanded'

export interface Options {
    input?: string;
    inputFile?: string;
    data?: any;
    dataFile?: string;
    outputFile?: string;
    docxJsEnabled?: boolean;
    debugFile?: (type: DebugFileType, content: string | Uint8Array) => void;
    readFile?: (file: string, binary: boolean) => Uint8Array | string;
}

export interface OptionsProcessed {
    input: string;
    inputFile: string;
    data?: any;
    dataFile?: string;
    outputFile: string;
    docxJsEnabled: boolean;
    debugFile?: (type: DebugFileType, content: string | Uint8Array) => void;
    readFile?: (file: string, binary: boolean) => Uint8Array | string;
}

export class DocTMLError extends Error {
    constructor(
        message: string,
        public sourceError?: any
    ) {
        super(message);
    }
}

function processOptions(options: Options): void {

    // Update simple options.
    options.inputFile = options.inputFile ?? ':input';
    options.dataFile = options.dataFile ?? (options.data == null ? undefined : ':data');
    options.docxJsEnabled = !!options.docxJsEnabled;

    // Set output file name to default if not specified.
    if (options.outputFile == null) {
        if (options.inputFile === ':input') {
            options.outputFile = ':output';
        } else {
            let pathParts = options.inputFile!.split(/([/\\])/);
            let name = pathParts.at(-1)!;
            let nameParts = name.split('.');
            if (nameParts.length === 1) {
                nameParts.push('docx');
            }
            nameParts[nameParts.length - 1] = 'docx';
            pathParts[pathParts.length - 1] = nameParts.join('.');
            options.outputFile = pathParts.join('');
        }
    }

    // Read input if just file name given.
    if (options.input == null) {
        if (options.inputFile == null || options.readFile == null) {
            throw new DocTMLError('No input given.');
        }
        options.input = options.readFile(options.inputFile, false) as string;
    }

    // Read data if just data file name given.
    if (options.data == null && options.dataFile != null) {
        if (options.readFile == null) {
            throw new DocTMLError('Cannot read data file, no readFile callback given.');
        }
        options.data = options.readFile(options.dataFile, false) as string;
    }

    // Parse JSON5 string if needed.
    if (typeof options.data === 'string') {
        try {
            options.data = JSON5.parse(options.data);
        } catch (err) {
            throw new DocTMLError('Error parsing input data.', err);
        }
    }
}


export async function generate(options: Options, returnBase64?: false): Promise<Uint8Array>;
export async function generate(options: Options, returnBase64: true): Promise<string>;
export async function generate(options: Options, returnBase64?: boolean): Promise<Uint8Array | string> {

    processOptions(options);
    let optionsProcessed = options as OptionsProcessed;

    // Output debugging data file.
    if (optionsProcessed.data != null && optionsProcessed.debugFile) {
        optionsProcessed.debugFile('data', JSON.stringify(optionsProcessed.data, null, 4));
    }

    if (optionsProcessed.data != null) {
        // Render template if data provided.
        optionsProcessed.input = renderTemplate(
            optionsProcessed,
            optionsProcessed.input,
            optionsProcessed.inputFile);
        // Output debugging rendered file.
        if (optionsProcessed.debugFile) {
            optionsProcessed.debugFile('rendered', optionsProcessed.input);
        }
    }

    // Process macros.
    // Macros are not currently implemented, but may be in future.

    returnBase64;
    return optionsProcessed.input;
}
