# Moonchild

[![Live demo](https://img.shields.io/badge/Live%20demo-%E2%86%92-9D6EB3.svg?style=flat-square)](https://harc.github.io/moonchild/editor/)

Moonchild brings source code to life. It's a toolkit for experimenting with new
kinds of programming interfaces. It's based on [CodeMirror][cm], a web-based
text editor. Moonchild adds a framework which makes it easy to create plugins
which modify and extend the source code presentation.

You can watch a [15-minute demo of Moonchild](http://vimeo.com/106498564)
that was presented at the [Future Programming Workshop at SPLASH 2014][fpw], or the [5-minute highlight reel](https://vimeo.com/106578509).

[cm]: http://codemirror.net/
[fpw]: http://www.future-programming.org/program.html

Plugins (written in HTML and JavaScript) consume the AST, and can produce DOM
nodes that modify or replace the text of any of the AST nodes. Plugins can not
only read from the AST, they can also modify the original source code. For
example, a plugin could transform hex colour codes in the source code into a
colour swatches that could pop open a standard colour picker.

Plugins can not only react to the state of the AST, they can also react to
data that is produced by other plugins. It's also possible to embed metadata
in the source code via a special comment format. These metadata comments are
parsed along with the source code, and attached to the appropriate AST node.

## Why?

Many people have suggested ASCII text files might not be the best way to
present source code. On the other hand, plain text has a lot of benefits,
not least of which is the huge ecosystem of tools built around consuming and
producing it.

Unlike some approaches to non-textual programming, Moonchild does not reject
plain text. Instead, it proposes that code should be augmented _when 
appropriate_ with richer behaviours and representations, much like you'd find
in a [good textbook](http://mitpress.mit.edu/books/introduction-algorithms):

[![Merge diagram from "Introduction to Algorithms"][clr-image]][clr-link]

[clr-image]: https://raw.githubusercontent.com/pdubroy/moonchild/master/clr-merge-diagram.png
[clr-link]: http://mitpress.mit.edu/sites/default/files/titles/content/9780262033848_sch_0001.pdf

There have been many extensible editor frameworks built in the past, including
(but not limited to) Emacs, Eclipse, and [Barista][barista]. One thing that
makes Moonchild different is that plugins can be written in HTML and
JavaScript, making it much more approachable and accessible than some
previous frameworks.

[barista]: https://faculty.washington.edu/ajko/barista.shtml

## Basic Setup

```
git clone https://github.com/pdubroy/moonchild.git
cd moonchild
npm install
```

## Running the demo

Run `npm start` to start the server required for the editor demo. To open the editor, open the URL printed in the console (e.g. http://localhost:8080/editor).

Use the buttons along the bottom of the editor to enable and disable the plugins:

![Toolbar buttons](https://raw.githubusercontent.com/pdubroy/moonchild/master/editor/images/toolbar.png)

(This UI is just for demo purposes -- in real use, you hopefully wouldn't have to ever explicitly turn plugins on and off.)

## Organization

`metadata.coffee` is the source code for the modified JavaScript parser, which parses metadata embedded in comments and attaches it to the appropriate AST nodes.

`moonchild.coffee` provides the core of the plugin system: plugin registration, and notifying the plugins when a new AST is available.

The code for the editor is in `editor/`. `ui_helpers.js` contains a bunch of stuff that should eventually go into Moonchild proper.

## Writing plugins

The plugins are written in a few different styles, but `markdown-comments.html` is the best example of how I think plugins should be written.

A minimal plugin looks like this:

```js
var moonchild = Moonchild.registerExtension();
moonchild.on('parse', function(ast, comments) {
  // Analyze the AST, potentially extend nodes using `moonchild.addExtras`.
});
```

A plugin that modifies the presentation should also do something like this:
```js
moonchild.on('display', function(ast, comments) {
  // Walk the AST, and change the source code presentation by calling
  // `moonchild.addWidget`.
});
```

## References

[Ko, A. J.](https://faculty.washington.edu/ajko/) and Myers, B. A. (2006), [Barista: An Implementation Framework for Enabling New Tools, Interaction Techniques and Views in Code Editors](https://faculty.washington.edu/ajko/papers/Ko2006Barista.pdf), CHI 2006. [_Project page_](https://faculty.washington.edu/ajko/barista.shtml)

[Baecker, R](http://ron.taglab.ca/). and Marcus, A., [Design Principles for the Enhanced Presentation of Computer Program Source Text](http://www.diku.dk/OLD/undervisning/2001f/f01.639/baecker.pdf), CHI (1986), 51-58.

[McDirmid, Sean](http://research.microsoft.com/en-us/people/smcdirm/), [Experiments in Code Typography](http://research.microsoft.com/en-us/projects/liveprogramming/typography.aspx), August 2014.

Eisenberg, A. D. and Kiczales, G., [Expressive programs through presentation extension](http://www.cs.ubc.ca/~ade/research/ade-aosd.07.pdf). In Proc. of 6th Int’l Conf. on Aspect-Oriented Software Development (AOSD 2007), pages 73–84. ACM, 2007.
