import type StateBlock from 'markdown-it/lib/rules_block/state_block.d.mts';
import type StateCore from 'markdown-it/lib/rules_core/state_core.d.mts';
import type StateInline from 'markdown-it/lib/rules_inline/state_inline.d.mts';
import type Token from 'markdown-it/lib/token.d.mts';

export function isValidInlineDelim(state: StateInline, pos: number): { can_open: boolean; can_close: boolean; } {
    const prevChar = state.src[pos - 1];
    const char = state.src[pos];
    const nextChar = state.src[pos + 1];

    if (char !== '$') {
        return { can_open: false, can_close: false };
    }

    let canOpen = false;
    let canClose = false;
    if (prevChar !== '$' && prevChar !== '\\' && (
        prevChar === undefined || isWhitespace(prevChar) || !isWordCharacterOrNumber(prevChar)
    )) {
        canOpen = true;
    }

    if (nextChar !== '$' && (
        nextChar == undefined || isWhitespace(nextChar) || !isWordCharacterOrNumber(nextChar))
    ) {
        canClose = true;
    }

    return { can_open: canOpen, can_close: canClose };
}

export function isWhitespace(char: string): boolean {
    return /^\s$/u.test(char);
}

export function isWordCharacterOrNumber(char: string): boolean {
    return /^[\w\d]$/u.test(char);
}

export function isValidBlockDelim(state: StateInline, pos: number): { readonly can_open: boolean; readonly can_close: boolean; } {
    const prevChar = state.src[pos - 1];
    const char = state.src[pos];
    const nextChar = state.src[pos + 1];
    const nextCharPlus1 = state.src[pos + 2];

    if (
        char === '$'
        && prevChar !== '$' && prevChar !== '\\'
        && nextChar === '$'
        && nextCharPlus1 !== '$'
    ) {
        return { can_open: true, can_close: true };
    }

    return { can_open: false, can_close: false };
}

export function inlineMath(state: StateInline, silent: boolean): boolean {
    if (state.src[state.pos] !== "$") {
        return false;
    }

    const lastToken = state.tokens.at(-1);
    if (lastToken?.type === 'html_inline') {
        // We may be inside of inside of inline html
        if (/^<\w+.+[^/]>$/.test(lastToken.content)) {
            return false;
        }
    }

    let res = isValidInlineDelim(state, state.pos);
    if (!res.can_open) {
        if (!silent) {
            state.pending += "$";
        }
        state.pos += 1;
        return true;
    }

    // First check for and bypass all properly escaped delimieters
    // This loop will assume that the first leading backtick can not
    // be the first character in state.src, which is known since
    // we have found an opening delimieter already.
    let start = state.pos + 1;
    let match = start;
    let pos;
    while ((match = state.src.indexOf("$", match)) !== -1) {
        // Found potential $, look for escapes, pos will point to
        // first non escape when complete
        pos = match - 1;
        while (state.src[pos] === "\\") {
            pos -= 1;
        }

        // Even number of escapes, potential closing delimiter found
        if (((match - pos) % 2) == 1) {
            break;
        }
        match += 1;
    }

    // No closing delimter found.  Consume $ and continue.
    if (match === -1) {
        if (!silent) {
            state.pending += "$";
        }
        state.pos = start;
        return true;
    }

    // Check if we have empty content, ie: $$.  Do not parse.
    if (match - start === 0) {
        if (!silent) {
            state.pending += "$$";
        }
        state.pos = start + 1;
        return true;
    }

    // Check for valid closing delimiter
    res = isValidInlineDelim(state, match);
    if (!res.can_close) {
        if (!silent) {
            state.pending += "$";
        }
        state.pos = start;
        return true;
    }

    if (!silent) {
        const token = state.push('math_inline', 'math', 0);
        token.markup = "$";
        token.content = state.src.slice(start, match);
    }

    state.pos = match + 1;
    return true;
}

export function blockMath(state: StateBlock, start: number, end: number, silent: boolean): boolean {
    let found = false;
    let pos = state.bMarks[start] + state.tShift[start];
    let max = state.eMarks[start];

    if (pos + 2 > max) {
        return false;
    }
    if (state.src.slice(pos, pos + 2) !== '$$') {
        return false;
    }

    pos += 2;
    let firstLine = state.src.slice(pos, max);

    // Check for single line expressions such as `$$x$$`
    const endIndexes = [...firstLine.matchAll(/\$\$/g)];
    if (endIndexes.length === 1 && endIndexes[0].index === firstLine.length - 2) {
        // Fake inline expression such as `$$x$$`
        // We actually want to treat this as a block instead of inline
        firstLine = firstLine.trim().slice(0, -2);
        found = true;
    } else if (endIndexes.length > 1) {
        // Multiple $$ in the first line, so this is not a block
        // Should be treated as inline instead
        return false;
    }

    if (silent) {
        return true;
    }

    let lastLine: string | undefined;
    let next: number;
    let lastPos: number | undefined;
    for (next = start; !found;) {
        next++;
        if (next >= end) {
            break;
        }

        pos = state.bMarks[next] + state.tShift[next];
        max = state.eMarks[next];

        if (pos < max && state.tShift[next] < state.blkIndent) {
            // non-empty line with negative indent should stop the list:
            break;
        }

        if (state.src.slice(pos, max).trim().slice(-2) === '$$') {
            lastPos = state.src.slice(0, max).lastIndexOf('$$');
            lastLine = state.src.slice(pos, lastPos);
            found = true;
        }
        else if (state.src.slice(pos, max).trim().includes('$$')) {
            lastPos = state.src.slice(0, max).trim().indexOf('$$');
            lastLine = state.src.slice(pos, lastPos);
            found = true;
        }
    }

    state.line = next + 1;

    const token = state.push('math_block', 'math', 0);
    token.block = true;
    token.content = (firstLine && firstLine.trim() ? firstLine + '\n' : '')
        + state.getLines(start + 1, next, state.tShift[start], true)
        + (lastLine && lastLine.trim() ? lastLine : '');
    token.map = [start, state.line];
    token.markup = '$$';
    return true;
}
export function inlineMathBlock(state: StateInline, silent: boolean): boolean {
    var start, match, token, res, pos;

    if (state.src.slice(state.pos, state.pos + 2) !== "$$") {
        return false;
    }

    res = isValidBlockDelim(state, state.pos);
    if (!res.can_open) {
        if (!silent) {
            state.pending += "$$";
        }
        state.pos += 2;
        return true;
    }

    // First check for and bypass all properly escaped delimieters
    // This loop will assume that the first leading backtick can not
    // be the first character in state.src, which is known since
    // we have found an opening delimieter already.
    start = state.pos + 2;
    match = start;
    while ((match = state.src.indexOf("$$", match)) !== -1) {
        // Found potential $$, look for escapes, pos will point to
        // first non escape when complete
        pos = match - 1;
        while (state.src[pos] === "\\") {
            pos -= 1;
        }

        // Even number of escapes, potential closing delimiter found
        if (((match - pos) % 2) == 1) {
            break;
        }
        match += 2;
    }

    // No closing delimter found.  Consume $$ and continue.
    if (match === -1) {
        if (!silent) {
            state.pending += "$$";
        }
        state.pos = start;
        return true;
    }

    // Check if we have empty content, ie: $$$$.  Do not parse.
    if (match - start === 0) {
        if (!silent) {
            state.pending += "$$$$";
        }
        state.pos = start + 2;
        return true;
    }

    // Check for valid closing delimiter
    res = isValidBlockDelim(state, match);
    if (!res.can_close) {
        if (!silent) {
            state.pending += "$$";
        }
        state.pos = start;
        return true;
    }

    if (!silent) {
        token = state.push('math_block', 'math', 0);
        token.block = true;
        token.markup = "$$";
        token.content = state.src.slice(start, match);
    }

    state.pos = match + 2;
    return true;
}
// For any html block that contains math, replace the html block token with new tokens that separate out
// the html blocks from the math
export function handleMathInHtml(state: StateCore, mathType: string, mathMarkup: string, mathRegex: RegExp) {
    const tokens = state.tokens;

    for (let index = tokens.length - 1; index >= 0; index--) {
        const currentToken = tokens[index];
        const newTokens: Token[] = [];

        if (currentToken.type !== "html_block") {
            continue;
        }

        const content = currentToken.content;

        // Process for each math referenced within the html block
        for (const match of content.matchAll(mathRegex)) {
            if (!match.groups) {
                continue;
            }

            const html_before_math = match.groups.html_before_math;
            const math = match.groups.math;
            const html_after_math = match.groups.html_after_math;

            if (html_before_math) {
                newTokens.push({ ...currentToken, type: "html_block", map: null, content: html_before_math } as Token);
            }

            if (math) {
                newTokens.push({
                    ...currentToken,
                    type: mathType,
                    map: null,
                    content: math,
                    markup: mathMarkup,
                    block: true,
                    tag: "math",
                } as Token);
            }

            if (html_after_math) {
                newTokens.push({ ...currentToken, type: "html_block", map: null, content: html_after_math } as Token);
            }
        }

        // Replace the original html_block token with the newly expanded tokens
        if (newTokens.length > 0) {
            tokens.splice(index, 1, ...newTokens);
        }
    }
    return true;
}