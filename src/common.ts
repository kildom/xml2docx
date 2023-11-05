
export type AnyObject = { [key: string]: any };

export function undefEmpty<T extends {}>(obj: T): T | undefined {
    for (let value of Object.values(obj)) {
        if (value !== undefined) {
            return obj;
        }
    }
    return undefined;
}
