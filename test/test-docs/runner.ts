

export interface Runner {
    start(): Promise<void>;
    stop(): Promise<void>;
    run(input: string, data: string | undefined, output: string): Promise<void>;
}

