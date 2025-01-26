
/**
 * Extracts the directory path from a given file path.
 *
 * @param path - The path to a file.
 *               If the input path refers to a directory, the return value is unspecified.
 * @returns      The directory portion of the given file path. It always includes trailing
 *               slash (or backslash).
 */
export function dirName(path: string): string {
    // Works only on files, if path is a directory the return value in unspecified.
    let pathParts = path.split(/([/\\]+)/);
    pathParts.pop()!;
    if (pathParts.length === 0) {
        if (typeof globalThis !== 'undefined'
            && typeof globalThis.process !== 'undefined'
            && typeof globalThis.process.platform === 'string'
            && globalThis.process.platform === 'win32'
        ) {
            return '.\\';
        } else {
            return './';
        }
    }
    return pathParts.join('');
}
