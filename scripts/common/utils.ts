
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { spawnSync } from 'node:child_process';


declare global {
    const __RUN_SELF_TEST__: boolean | undefined;
}

export function isDirectExecution(metaUrl: string): boolean {
    const nodeArgvEntry = process.argv[1];
    if (!nodeArgvEntry) {
        return false;
    }
    const entryUrl = pathToFileURL(path.resolve(nodeArgvEntry)).href;
    return metaUrl === entryUrl;
}


export function cloneWithRefs<T>(root: T): T {
    interface RefInfo {
        level: number;
        refs: number;
        id: number;
        placed: boolean;
    }

    const info = new Map<object, RefInfo>();

    // ---------------------------------------------------------------------
    // Pass 1 - collect metadata.
    // ---------------------------------------------------------------------

    function collect(value: unknown, level: number): void {
        if (value === null || typeof value !== "object")
            return;

        const existing = info.get(value);

        if (existing) {
            existing.refs++;
            if (level < existing.level)
                existing.level = level;
            return; // Already traversed this object.
        }

        info.set(value, {
            level,
            refs: 1,
            id: 0,
            placed: false,
        });

        if (Array.isArray(value)) {
            for (const item of value)
                collect(item, level + 1);
        } else {
            for (const item of Object.values(value))
                collect(item, level + 1);
        }
    }

    collect(root, 0);

    // Remove objects referenced only once and assign ids.

    let nextId = 1;

    for (const [obj, entry] of info) {
        if (entry.refs === 1) {
            info.delete(obj);
        } else {
            entry.id = nextId++;
        }
    }

    // ---------------------------------------------------------------------
    // Pass 2 - clone.
    // ---------------------------------------------------------------------

    function clone(value: unknown, level: number): unknown {
        if (value === null || typeof value !== "object")
            return value;

        const entry = info.get(value);

        if (!entry) {
            if (Array.isArray(value))
                return value.map(item => clone(item, level + 1));

            const out: Record<string, unknown> = {};

            for (const [key, item] of Object.entries(value))
                out[key] = clone(item, level + 1);

            return out;
        }

        if (!entry.placed && entry.level === level) {
            entry.placed = true;

            let out: unknown[] | Record<string, unknown>;

            if (Array.isArray(value)) {
                out = value.map(item => clone(item, level + 1));
            } else {
                out = {};

                for (const [key, item] of Object.entries(value))
                    out[key] = clone(item, level + 1);
            }

            out = { "###REF###": `<OBJ:${entry.id}>`, ...out };

            return out;
        }

        let ref = `<REF:${entry.id}>`;

        if (typeof (value as any).type === 'string' && (value as any).type.length < 80) {
            ref += ' ' + (value as any).type;
        }
        if (typeof (value as any).name === 'string' && (value as any).name.length < 80) {
            ref += ' ' + (value as any).name;
        }

        return ref;
    }

    return clone(root, 0) as T;
}

export function runCli(cmd: string, args: string[]): void {
    const result = spawnSync(cmd, args, {
        cwd: ".",
        stdio: "inherit",
        shell: false,
    });

    if (result.error) {
        throw result.error;
    }

    if (result.status !== 0) {
        throw new Error(
            `Process exited with status ${result.status ?? "unknown"}`
        );
    }
}
