import {NodeCompiler} from '@myriaddreamin/typst-ts-node-compiler';
import * as cheerio from 'cheerio';

export default function (code: string, isDisplay: boolean, injection?: string) {
    injection = injection || '';
    const compiler = NodeCompiler.create();
    const defaultEm = 11;

    if (isDisplay) {
        const template = `
#set page(height: auto, width: auto, margin: 0pt)
${injection}
$ ${code} $
`;
        const compileResult = compiler.compile({mainFileContent: template});
        const document = compileResult.result;
        if (!document) {
            return '';
        }
        const svg = compiler.svg(document);
        const dom = cheerio.load(svg);

        const height = parseFloat(dom('svg').prop('data-height'));
        const width = parseFloat(dom('svg').prop('data-width'));
        dom('svg').prop('height', `${height / defaultEm}em`);
        dom('svg').prop('width', `${width / defaultEm}em`);
        dom('svg').prop('style', 'display: block; margin: 16px auto');
        dom('style').remove();

        return dom.html('svg');

    } else {
        const template = `
#set page(height: auto, width: auto, margin: 0pt)
${injection}
#let s = state("t", (:))
#let pin(t) = context {
  let width = measure(line(length: here().position().y)).width
  s.update(it => it.insert(t, width) + it)
}
#show math.equation: it => {
  box(it, inset: (top: 0.5em, bottom: 0.5em))
}
$pin("l1")${code}$
#context [
  #metadata(s.final().at("l1")) <label>
]
`;
        const compileResult = compiler.compile({mainFileContent: template});
        const document = compileResult.result;
        if (!document) {
            return '';
        }
        const svg = compiler.svg(document);
        const query = compiler.query(document, { selector: '<label>' });
        const baseline = parseFloat(query[0].value.slice(0, -2));

        const dom = cheerio.load(svg);
        const height = parseFloat(dom('svg').prop('data-height'));
        const width = parseFloat(dom('svg').prop('data-width'));
        const shift = height - baseline;
        dom('svg').prop('height', `${height / defaultEm}em`);
        dom('svg').prop('width', `${width / defaultEm}em`);
        dom('svg').prop('style', `display: inline; vertical-align: -${shift / defaultEm}em;`);
        dom('style').remove();

        return dom.html('svg');
    }
}