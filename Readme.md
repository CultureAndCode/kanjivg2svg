kanjivg2svg
===========

This is a NodeJS fork of the original Ruby 1.9 script that takes stroke order data from the [KanjiVG](http://kanjivg.tagaini.net/) project and outputs SVG files with special formatting.

Usage
-----

    $ node kanjivg2svg -f path/to/kanji/ -t [frames|animated|numbers]

You can change the output type by setting the second argument. If not set it will default to 'frames'. The animated and numbers are not yet implemented.

Why?
----

I'll be using this as a library in my own personal project and a NodeJS fork is required. Hopefully I'll have the willpower to finish it.

License
-------

By Kim Ahlström <kim.ahlstrom@gmail.com>
Original ruby repo: [https://github.com/Kimtaro/kanjivg2svg](https://github.com/Kimtaro/kanjivg2svg)

Fork by Matthew @matthewbadeau

[Creative Commons Attribution-Share Alike 3.0](http://creativecommons.org/licenses/by-sa/3.0/)

KanjiVG
-------

KanjiVG is copyright (c) 2009/2010 Ulrich Apel and released under the Creative Commons Attribution-Share Alike 3.0
