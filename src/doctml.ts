
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

function processOptions(options: Options): OptionsProcessed {

    // Copy options and preserve "this" of the callbacks.
    let readFile = options.readFile;
    let debugFile = options.debugFile;
    let optionsCopy: Options = {
        ...options,
        inputFile: options.inputFile ?? ':input',
        dataFile: options.dataFile ?? (options.data == null ? undefined : ':data'),
        docxJsEnabled: !!options.docxJsEnabled,
        readFile: readFile ? (...args: any[]) => (options.readFile as any)(...args) : undefined,
        debugFile: debugFile ? (...args: any[]) => (options.debugFile as any)(...args) : undefined,
    };

    // Set output file name to default if not specified.
    if (optionsCopy.outputFile == null) {
        if (optionsCopy.inputFile == ':input') {
            optionsCopy.outputFile = ':output';
        } else {
            let pathParts = options.inputFile!.split(/([/\\])/);
            let name = pathParts.at(-1)!;
            let nameParts = name.split('.');
            if (nameParts.length === 1) {
                nameParts.push('docx');
            }
            nameParts[nameParts.length - 1] = 'docx';
            pathParts[pathParts.length - 1] = nameParts.join('.');
            optionsCopy.outputFile = pathParts.join('');
        }
    }

    // Read input if just file name given.
    if (optionsCopy.input == null) {
        if (optionsCopy.inputFile == null || optionsCopy.readFile == null) {
            throw new DocTMLError('No input given.');
        }
        optionsCopy.input = optionsCopy.readFile(optionsCopy.inputFile, false) as string;
    }

    // Read data if just data file name given.
    if (optionsCopy.data == null && optionsCopy.dataFile != null) {
        if (optionsCopy.readFile == null) {
            throw new DocTMLError('Cannot read data file, no readFile callback given.');
        }
        optionsCopy.data = optionsCopy.readFile(optionsCopy.dataFile, false) as string;
    }

    // Parse JSON5 string if needed.
    if (typeof optionsCopy.data === 'string') {
        try {
            optionsCopy.data = JSON5.parse(optionsCopy.data);
        } catch (ex) {
            throw new DocTMLError('Error parsing input data.', ex);
        }
    }

    return optionsCopy as OptionsProcessed;
}



export async function generate(options: Options, returnBase64?: false): Promise<Uint8Array>;
export async function generate(options: Options, returnBase64: true): Promise<string>;
export async function generate(options: Options, returnBase64?: boolean): Promise<Uint8Array | string> {

    let optionsProcessed = processOptions(options);

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

