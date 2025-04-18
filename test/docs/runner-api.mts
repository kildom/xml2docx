import { Runner } from './runner';


export class RunnerNode implements Runner {

    async start(): Promise<void> {
        // nothing to do
    }

    async stop(): Promise<void> {
        // nothing to do
    }

    async run(input: string, data: string | undefined, output: string): Promise<void> {
    }
}
