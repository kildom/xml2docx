

export interface Runner {
    name: string;
    start(): Promise<boolean>; // Returns true if runner requires files to be passed with addFiles() and files parameter.
    stop(): Promise<void>;
    addFiles(files: { [key: string]: Uint8Array }): Promise<void>;
    run(input: string,
        data: string | undefined,
        output: string,
        inputFiles: { [key: string]: Uint8Array }): Promise<{ [key: string]: Uint8Array } & { error?: string }>;
}

