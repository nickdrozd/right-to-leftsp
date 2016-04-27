# right-to-leftsp
A Lisp (Scheme) interpreter


RIGHT-to-LEFTSP

	An interpreter for a dialect of Scheme written
	right-to-left (or left-to-right, whichever way
	is cool with you).

	It's a work in progress. There remain problems
	with variable collision (maybe?) when the
	lambdas get nested.

	For example, if we say

	> (def addn 
		(fun (n) 
			(fun (z) 
				(+ z n))))

	and

	> (def apply 
		(fun (f x) 
			(f x)))

	then

	> (apply (addn 3) 
			(apply (addn 2) 
					5))

	produces an error, even though less complex
	combinations involving those functions don't.

	Still, it's able to compute some nontrivial
	Lisp code. For example, the anonymous recursive

	> (((fun (f) 
			(f f)) 
		(fun (t) 
			(fun (n) 
				(if (< n 2) 
					n 
					(+ n 
						((t t) (- n 1))))))) 
		9)

	correctly evaluates to 45 (the 9th triangular number).

	For some reason the general Y-combinator doesn't work
	(see the end of the code for definitions). That would
	be a nice thing to get working.
