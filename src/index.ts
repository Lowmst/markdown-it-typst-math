import render from "./render.ts";
import type MarkdownIt from 'markdown-it';
import type Token from "markdown-it/lib/token.d.mts";
import {
    blockMath,
    handleMathInHtml,
    inlineMath,
    inlineMathBlock
} from "./ruler.ts";

interface MarkdownTypstOptions {
    /**
     * Enable rendering of `$$` match blocks inside of html elements.
     */
    readonly enableMathBlockInHtml?: boolean;

    /**
     * Enable rendering of inline match of html elements.
     */
    readonly enableMathInlineInHtml?: boolean;

    /**
     * Enable rendering of of fenced math code blocks:
     *
     * ~~~md
     * ```math
     * \pi
     * ```
     * ~~~
     */
    readonly enableFencedBlocks?: boolean;

    /**
     * Controls if an exception is thrown on katex errors.
     */
    readonly throwOnError?: boolean;

    readonly typstInjection?: string;
}

export default function (md: MarkdownIt, options?: MarkdownTypstOptions) {
    const enableMathBlockInHtml = options?.enableMathBlockInHtml;
    const enableMathInlineInHtml = options?.enableMathInlineInHtml;
    const enableFencedBlocks = options?.enableFencedBlocks;
    const typstInjection = options?.typstInjection;

    // #region Parsing
    md.inline.ruler.after('escape', 'math_inline', inlineMath);
    md.inline.ruler.after('escape', 'math_inline_block', inlineMathBlock);


    md.block.ruler.after('blockquote', 'math_block', blockMath, {
        alt: ['paragraph', 'reference', 'blockquote', 'list']
    });

    // Regex to capture any html prior to math block, the math block (single or multi line), and any html after the math block
    const math_block_within_html_regex = /(?<html_before_math>[\s\S]*?)\$\$(?<math>[\s\S]+?)\$\$(?<html_after_math>(?:(?!\$\$[\s\S]+?\$\$)[\s\S])*)/gm;

    // Regex to capture any html prior to math inline, the math inline (single line), and any html after the math inline
    const math_inline_within_html_regex = /(?<html_before_math>[\s\S]*?)\$(?<math>.*?)\$(?<html_after_math>(?:(?!\$.*?\$)[\s\S])*)/gm;

    if (enableMathBlockInHtml) {
        md.core.ruler.push("math_block_in_html_block", (state) => {
            return handleMathInHtml(state, "math_block", "$$", math_block_within_html_regex);
        });
    }

    if (enableMathInlineInHtml) {
        md.core.ruler.push("math_inline_in_html_block", (state) => {
            return handleMathInHtml(state, "math_inline", "$", math_inline_within_html_regex);
        });
    }
    // #endregion

    // #region Rendering
    md.renderer.rules.math_inline = (tokens, idx) => {
        const token = tokens[idx];
        return render(token.content, false, typstInjection);
    };
    md.renderer.rules.math_inline_block = (tokens, idx) => {
        const token = tokens[idx];
        return render(token.content, true, typstInjection);
    };
    md.renderer.rules.math_block = (tokens, idx) => {
        const token = tokens[idx];
        return render(token.content, true, typstInjection);
    };

    if (enableFencedBlocks) {
        const mathLanguageId = 'math';

        const originalFenceRenderer = md.renderer.rules.fence;
        md.renderer.rules.fence = function (tokens: Token[], idx: number, options, env, self) {
            const token = tokens[idx];
            if (token.info.trim().toLowerCase() === mathLanguageId && enableFencedBlocks) {
                return render(token.content, true, typstInjection) + '\n';
            } else {
                return originalFenceRenderer?.call(this, tokens, idx, options, env, self) || '';
            }
        };
    }
    // #endregion
}