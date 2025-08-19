import rehypeTypst from './rehype-typst';
import rehypeParse from 'rehype-parse';
import rehypeStringify from 'rehype-stringify';
import {unified} from 'unified';
import * as cheerio from 'cheerio';
import type MarkdownIt from 'markdown-it';
import type Token from "markdown-it/lib/token.d.mts";
import {
    blockMath,
    handleMathInHtml,
    inlineMath,
    inlineMathBlock
} from "./ruler.ts";

function render(typ: string, mode: string) {
    const result = unified()
        .use(rehypeParse, {fragment: true})
        .use(rehypeTypst)
        .use(rehypeStringify)
        .processSync(`<code class="math-${mode}">${typ}</code>`);

    const dom = cheerio.load(result.value);
    dom('style').remove();

    if (mode === 'inline') {
        const style = dom('svg').attr('style');
        dom('svg').attr('style', style + 'display:inline');
        return dom.html('svg');
    } else {
        const style = dom('svg').attr('style');
        dom('svg').attr('style', style + 'margin:16px auto');
        return dom.html('svg');
    }
}


interface MarkdownKatexOptions {
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
}

export default function (md: MarkdownIt, options?: MarkdownKatexOptions) {
    const enableMathBlockInHtml = options?.enableMathBlockInHtml;
    const enableMathInlineInHtml = options?.enableMathInlineInHtml;
    const enableFencedBlocks = options?.enableFencedBlocks;

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
        return render(token.content, 'inline');
    };
    md.renderer.rules.math_inline_block = (tokens, idx) => {
        const token = tokens[idx];
        return render(token.content, 'display');
    };
    md.renderer.rules.math_block = (tokens, idx) => {
        const token = tokens[idx];
        return render(token.content, 'display');
    };

    if (enableFencedBlocks) {
        const mathLanguageId = 'math';

        const originalFenceRenderer = md.renderer.rules.fence;
        md.renderer.rules.fence = function (tokens: Token[], idx: number, options, env, self) {
            const token = tokens[idx];
            if (token.info.trim().toLowerCase() === mathLanguageId && enableFencedBlocks) {
                return render(token.content, 'display') + '\n';
            } else {
                return originalFenceRenderer?.call(this, tokens, idx, options, env, self) || '';
            }
        };
    }
    // #endregion
}