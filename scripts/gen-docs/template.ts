
import { template } from 'underscore';

export function compileTemplate(input: string) {
    let compiled: ReturnType<typeof template>;
    compiled = template(input, {
        evaluate: /<%!([\s\S]+?)%>/g,
        interpolate: /<%=([\s\S]+?)%>/g,
        escape: /<%(?![!=])([\s\S]+?)%>/g
    });
    return compiled;
}
