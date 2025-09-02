# Markdown-It Typst Math

Markdown It plugin that adds [Typst](https://github.com/typst/typst) rendering for math equations.

It references some of the code from [vscode-markdown-it-katex](https://github.com/microsoft/vscode-markdown-it-katex) and [@myriaddreamin/reyhpe-typst](https://www.npmjs.com/package/@myriaddreamin/rehype-typst).

Adapted for VitePress dark mode.
## Usage

Install markdown-it

```bash
npm install markdown-it
```

Install the plugin

```bash
npm install @lowmst/markdown-it-typst-math
```

Use it in your javascript

```javascript
import markdownit from 'markdown-it';
import mt from '@lowmst/markdown-it-typst-math';

const md = markdownit();
md.use(mt);
```

Import CSS `'@lowmst/markdown-it-typst-math/dist/index.css'`

## Example

```markdown
# Typst Test

- Inline $integral_a^b f(x)upright(d)x=lim_(lambda->0)sum_(i=1)^n f(xi_i)Delta x_i$

- Block $$integral_a^b f(x)upright(d)x=lim_(lambda->0)sum_(i=1)^n f(xi_i)Delta x_i$$
```

![image](https://raw.githubusercontent.com/Lowmst/markdown-it-typst-math/master/image/example.png)