import { Options } from './doctml';



const USAGE = `
USAGE:
    doctml [options] <input.xml> [output.docx]

Transform an DocTML file into a docx file.

For detailed DocTML file format, please see the documentation at
https://kildom.github.io/doctml/

Options:

<input.xml>
    Input DocTML file.

[output.docx]
    Output document. By default, it is <input> with the ".docx" extension.

-d <data.json>
--data <data.json>
    Interpret the input file as a template and use the <data.json> file for
    template input data.
    CAUTION! ACTIVATING THIS OPTION WILL PERMIT THE EXECUTION OF ARBITRARY
             CODE FROM THE <input.xml> FILE WITHOUT LIMITATIONS. USE ONLY
             DOCTML FILES FROM A TRUSTED SOURCE.

--docx.js
    Enable <docx.js> tags in the input file.
    CAUTION! ACTIVATING THIS OPTION WILL PERMIT THE EXECUTION OF ARBITRARY
             CODE FROM THE <input.xml> FILE WITHOUT LIMITATIONS. USE ONLY
             DOCTML FILES FROM A TRUSTED SOURCE.

--help
    Show this message.

--version
    Show version information.

--license
    Show license information.

--debug
    Dump intermediate files alongside the output after each step of
    processing and show more verbose output in case of errors. This option
    is mainly useful when debugging the template or the tool.
`;

function printUsage(failed?: string): void {
    if (failed) {
        console.error('\n' + failed);
        console.log(USAGE);
        process.exit(3);
    } else {
        console.log(USAGE);
    }
}

function parseArguments() {
    let options: Options = {};
    let debug = false;
    let argCounter = 0;
    let args = process.argv.slice(2);
    if (args.length === 0) {
        printUsage();
        process.exit(0);
    }
    for (let i = 0; i < args.length; i++) {
        let arg = args[i];
        let next = args[i + 1];

        if (arg === '-d' || arg === '--data') {
            if (options.dataFile) {
                printUsage('Only one data file allowed.');
            } else if (next === undefined) {
                printUsage('The "--data" option requires a parameter.');
            } else {
                options.dataFile = next;
                i++;
            }
        } else if (arg === '--docx.js') {
            options.docxJsEnabled = true;
        } else if (arg === '--help' || arg === '/?' || arg === '-h' || arg === '/h') {
            printUsage();
            process.exit(0);
        } else if (arg === '--license') {
            // TODO: Printing license information
            //console.log(getLicense());
            process.exit(0);
        } else if (arg === '--version') {
            // TODO: Printing version information
            //console.log(getLicense());
            process.exit(0);
        } else if (arg === '--debug') {
            debug = true;
        } else if (arg.startsWith('-')) {
            throw printUsage(`Unknown option: ${arg}`);
        } else if (argCounter === 0) {
            options.inputFile = arg;
            argCounter++;
        } else if (argCounter === 1) {
            options.outputFile = arg;
            argCounter++;
        } else {
            throw printUsage('Too many arguments.');
        }
    }
    return { options, debug };
}

async function main() {
    let args = parseArguments();
    try {
        //await exec(args);
    } catch (ex) {
        //printError(err, args.debug);
        //process.exit(1);
    }
    console.log(args);
}

main();
