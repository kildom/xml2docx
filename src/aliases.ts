/*!
 * Copyright 2023 Dominik Kilian
 * 
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the
 * following conditions are met:
 * 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following
 *    disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the
 *    following disclaimer in the documentation and/or other materials provided with the distribution.
 * 3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote
 *    products derived from this software without specific prior written permission.
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS “AS IS” AND ANY EXPRESS OR IMPLIED WARRANTIES,
 * INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
 * SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY,
 * WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import { Node, Element, XMLError, mergeElements, deepCopy } from './xml';

enum AliasState {
    UNRESOLVED,
    RESOLVING,
    RESOLVED,
}

interface Alias {
    element: Element;
    state: AliasState;
    hasAttributes: boolean;
    parentAliases: Map<string, Alias>;
    inherits: string[];
}


function resolveAlias(alias: Alias) {
    if (alias.state === AliasState.RESOLVED) return;
    if (alias.state === AliasState.RESOLVING) throw new XMLError(alias.element, 'Infinite alias loop detected.');
    alias.state = AliasState.RESOLVING;
    resolveAliases(alias.element, alias.parentAliases);
    for (let inheritName of alias.inherits) {
        if (!alias.parentAliases.has(inheritName)) {
            throw new XMLError(alias.element, `Alias '${inheritName}' not defined.`);
        }
        let inherit = alias.parentAliases.get(inheritName) as Alias;
        resolveAlias(inherit);
        let element = mergeElements(inherit.element, alias.element);
        element.name = alias.element.name;
        alias.element = element;
    }
    alias.state = AliasState.RESOLVED;
}

export function resolveAliases(parentElement: Element, parentAliases: Map<string, Alias> = new Map()) {

    let aliases = new Map<string, Alias>(parentAliases);
    let defined = new Set<string>();
    let filtered: Node[] = [];

    /* Properties from aliases are probably overcomplication: they can be replaced
    by <ALIAS> or <element:ALIAS> where the alias has ":property" already inside.
    for (let [fullName, value] of Object.entries(parentElement.attributes || {})) {
        let names = fullName.split(':');
        if (names.length > 1 && names.at(-1) == 'alias') {
            if (!parentAliases.has(value)) {
                throw new XMLError(parentElement, `Undefined alias "${value}"`);
            }
            let alias = parentAliases.get(value) as Alias;
            delete (parentElement.attributes as any)[fullName];
            resolveAlias(alias);
            let element: Element = deepCopy(alias.element);
            names[names.length - 1] = 'property';
            element.name = names.join(':');
            parentElement.elements = parentElement.elements || [];
            parentElement.elements.unshift(element);
        }
    }
    */

    for (let node of (parentElement.elements || [])) {
        if (node.type === 'element' && node.name.startsWith('DEF:')) {
            let names = node.name.substring(4).split(':');
            let name = names.shift() as string;
            let alias: Alias = {
                element: node,
                state: AliasState.UNRESOLVED,
                hasAttributes: !!node.attributes && Object.keys(node.attributes).length > 0,
                parentAliases: aliases,
                inherits: names,
            };
            if (defined.has(name)) {
                throw new XMLError(node, `Alias '${name}' already defined.`);
            }
            defined.add(name);
            aliases.set(name, alias);
        } else {
            filtered.push(node);
        }
    }

    let filtered2: Node[] = [];

    for (let node of filtered) {
        if (node.type === 'element' && aliases.has(node.name)) {
            let alias = aliases.get(node.name) as Alias;
            if (alias.hasAttributes
                || (!!node.attributes && Object.keys(node.attributes).length)
                || (!!node.elements && Object.keys(node.elements).length)) {
                throw new XMLError(node, `Inline aliases cannot have attributes or children.`);
            }
            resolveAlias(alias);
            filtered2.push(...deepCopy(alias.element.elements || []))
        } else if (node.type === 'element' && aliases.has(node.name.split(':').at(-1) as string)) {
            resolveAliases(node, aliases);
            let names = node.name.split(':');
            let element: Element | null = null;
            while (names.length > 0 && aliases.has(names.at(-1) as string)) {
                let aliasName = names.pop() as string;
                let alias = aliases.get(aliasName) as Alias;
                resolveAlias(alias);
                if (element === null) {
                    element = deepCopy(alias.element);
                } else {
                    element = mergeElements(element, alias.element);
                }
            }
            element = mergeElements(element || node, node);
            filtered2.push(element);
            element.name = names.join(':');
        } else if (node.type === 'element') {
            resolveAliases(node, aliases);
            filtered2.push(node);
        } else {
            filtered2.push(node);
        }
    }

    parentElement.elements = filtered2;
}
