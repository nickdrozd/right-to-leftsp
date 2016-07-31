# right-to-leftsp
A Lisp (Scheme) interpreter


RIGHT-to-LEFTSP

In the fourth chapter of the textbook *Structure and Interpretation of Computer Programs* (SICP), Abelson and Sussman present a Lisp (Scheme) interpreter they call the *metacircular evaluator*. The interpreter is "metacircular" because the program interprets the same language in which it is written. That's a mind-bending property, but ultimately it's inessential -- the program could be 'translated' into another language without affecting how the interpreter runs. 

This interpreter is just such a translation. In fact, it's not even an especially clever one. As far as the functioning of the interpreter itself goes, the only real changes iare that this interpreter handles the application of primitive functions in the *eval* function, whereas SICP's handles primitives in the *apply* function, and that environments and frames are defined slightly differently things in JavaScript don't all have to be defined in terms of linked lists.  Besides that, it's basically the same.

Actually, it's not true that metacircularity is completely inessential. One advantage of a Lisp interpreter written in Lisp is that the underlying Lisp system already 'knows' how to parse the Lisp code that gets passed to the Lisp interpreter. There is thus no need to bother with lexing and parsing and all that, and indeed SICP doesn't really cover those topics. That advantage is lost when writing the interpreter in JavaScript, and so a parser had to be written from scratch. It's clearly the work of someone without much knowledge of parsing, and as of this writing (July 2016) it could really stand to be rewritten more elegantly.

*But why is it called 'Right-to-Leftsp'?*

Great question! Initially, the goal of this project was to develop an Arabic-script Lisp interpreter (be it in Arabic, Persian, or even English). It turns out that it's difficult to get LtR scripts to get along with RtL scripts, so that project has been abandoned (for now?). However, the parser was built with a reversing feature. That seemed cool, so it was kept. Now it's just a superficial novelty.

The way it works is that a list with a $ appened to the front (outside the leftmost parenthesis) is reversed, so if the list is written RtL, it will be reversed before being parsed, and will therefore get parsed LtR, which is what the interpreter expects to happen. Note that the reversal is by list item, not by characters -- don't write the names of things backwards! $s can be nested, which can get confusing. For example, the following are equivalent:

* (((fun (x) (fun (y) (+ x y))) 3) 4)
* (((fun (x) (fun (y) (+ x y))) 3) 4)
* $(4 (3 (((y x +) (y) fun) (x) fun)))
* (((fun (x) (fun (y) $(y x +))) 3) 4)
* $(4 (3 ($(fun (y) (+ x y)) (x) fun)))
* $$(((fun (x) (fun (y) (+ x y))) 3) 4)

And so are the following:

* (def x (+ 4 5))
* $((5 4 +) x def)
* $($(+ 4 5) x def)

Isn't that something?

*Sure, but what's that 'fun' and 'def' nonsense? That doesn't look like any Lisp I've ever seen!*

If you're writing a new interpreter, why not take the opportunity to try out some new keywords and see how they feel? Python uses 'def' and nobody complains (I think). The word 'lambda' is annoying to type and is a historical acciddent. As Paul Graham said, " Alonzo Church himself wouldn't have used it if he had to write out the word lambda each time." So Right-to-Leftsp uses 'fun', short for 'function', as in 'function abstraction'. And remember, functions are not only fun, they're fundamental! 

(Actually, SICP never uses the word 'function' in a nonmathematical sense; instead, they always use the word 'procedure', with the abbreviated for 'proc'. But how is 'proc' pronounced? Should it rhyme with 'rock'? Or what?)

Anyway, if you don't like the keywords chosen here, feel free to change them! The keywords are conveniently all located at the top of the source code. Located just below the keywords are the list of 'separators': in Right-to-Leftsp, square brackets and curly braces are no different from parentheses. If you want to add other separators, like angle brackets or slashes or whatever, add them! Or take them away and make a Lisp with only curly braces allowed! 

*What's the deal with the shitty HTML front-end?*

That's pretty much all there is to it.

* PERSONAL REFLECTION

I initially started reading Chapter 4 of SICP in April 2016 (I started SICP itself in December 2015). Working through the interpreter was slow-going, and I didn't understand much. I was also learning JavaScript at the same time, the idea being that I could kill two birds with one stone by translating the Scheme program into JS. It took me three or four week to get a working interpreter. Even then it only worked about 80% correctly. For reasons I still don't understand exactly, if higher-order functions were compounded beyond a certain level, they would stop working.

After finishing that, I moved on to Chapter 5, which takes Lisp interpreters to a whole other level of difficulty. They introduce a toy assembly language to show how to implement a Lisp interpreter at the machine level. Based on this chapter, I undertook two more projects: a register machine simulator translated from Scheme to Javascript (https://github.com/nickdrozd/SICP-register-machine) and a full Lisp REPL written in C and adapted from the book's toy assembly language (https://github.com/nickdrozd/lispinc).

The register machine simulator deals with much more complicated JavaScript than this interpreter does, and the C Lisp interpreter is a much more carefully-built interpreter than this one, so I felt like my programming ability improved considerably after working on those projects. Then one day (specifically, yesterday as I write this) I thought "I should really go back and work out the kinks in the first interpreter". And verily I did: I was able to rewrite the whole thing (minus the parser, which I didn't feel like revisiting) in just a few hours. This is concrete proof that my programming ability has improved over the past few months, which is gratifying.