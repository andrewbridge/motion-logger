# Sample texts directory

This directory contains several public domain texts from The Project Gutenberg service which are being used for training
and analysis purposes by the text predictor and it's dependencies.

To my knowledge, each of the texts has been included in its entirety, with the full license for each.

The following books were part of sample text used by Peter Novig during his writing of his [Spelling Corrector](http://norvig.com/spell-correct.html).
[The full, concatenated file can be seen on his site](http://norvig.com/big.txt).

- The Adventures of Sherlock Holmes
- History of the United States
- Manual of Surgery
- Of War and Peace

Additional, Peter Novig farmed some common words from Wiktionary and the British National Corpus. I have included these
farmed words in words.txt

The farmed words from Wiktionary came from http://en.wiktionary.org/wiki/Wiktionary:Frequency_lists, specifically The
Project Gutenberg frequency lists. I have removed both this comment of retrieval and some code at the end of the document.
I have reduced these words slightly, as some of them were acronymns, which we don't want in our main dictionary.

I also removed profanity and generally offensive words as it didn't seem appropriate here, though in the real world,
these would be acceptable in the list.
