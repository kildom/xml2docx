
export const jobPostponed = Symbol("jobPostponed");
export type JobPostponed = typeof jobPostponed;

let pendingJobs: Record<string, () => Promise<any>> = {};
let doneJobs: Record<string, any> = {};
let errorJobs: Record<string, any> = {};
let postponedJobsCount = 0;

async function executor() {
    while (Object.keys(pendingJobs).length > 0) {
        let jobId = Object.keys(pendingJobs)[0];
        try {
            let result = await pendingJobs[jobId]();
            delete pendingJobs[jobId];
            doneJobs[jobId] = result;
        } catch (e) {
            delete pendingJobs[jobId];
            errorJobs[jobId] = e;
        }
    }
    executorPromise = undefined;
}

let executorPromise: Promise<void> | undefined = undefined;


export function asyncJob(jobId: string, func?: () => Promise<any>): any {
    if (jobId in doneJobs) {
        return doneJobs[jobId];
    } else if (jobId in errorJobs) {
        throw errorJobs[jobId];
    } else if (jobId in pendingJobs) {
        postponedJobsCount++;
        return jobPostponed;
    } else {
        if (!func) {
            throw new Error(`Job ${jobId} was not scheduled.`);
        }
        pendingJobs[jobId] = func;
        if (!executorPromise) {
            executorPromise = executor();
        }
        postponedJobsCount++;
        return jobPostponed;
    }
}

export async function asyncRetryLoop(func: () => void): Promise<any> {
    while (true) {
        console.log('----------- RUN function in asyncRetryLoop -----------');
        func();
        console.log('----------- DONE function in asyncRetryLoop -----------', postponedJobsCount);
        if (postponedJobsCount === 0) {
            break;
        }
        if (executorPromise) {
            await executorPromise;
        }
        postponedJobsCount = 0;
    }
}
