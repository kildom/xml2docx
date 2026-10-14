

export interface Runner {
    start(): Promise<boolean>; // Returns true if runner requires files to be passed with addFiles() and files parameter.
    stop(): Promise<void>;
    addFiles(files: string[]): Promise<void>;
    run(input: string,
        data: string | undefined,
        output: string,
        inputFiles: string[]): Promise<string[]>;
}

