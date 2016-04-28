/**
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
*/

var js_eval = eval; // eval redefined later, so save the js one

/**************************************************/

/* THE PARSER */

/**
	The chief (only?) innovation of this Lisp is that
	it allows for expressions to be evaluated backwards.
	Affixing a dollar to the beginning of a string causes
	the parser to deep-reverse the string, ie to reverse
	the string and deep-reverse its substrings.

	Substrings can also be reversed without affecting
	the string as a whole. For example, the following
	three strings evaluate to the same value:

	> (* (+ 3 4) (+ 5 6))
	> $((6 5 +) (4 3 +) *)
	> (* (+ 3 4) $(6 5 +))

	The initial idea was to allow for an Arabic-language
	Lisp interpreter. It turns out that it's a huge pain
	to get Arabic script working alongside Roman script
	(or more generally, to get RtL scripts to get along
	with LtR scripts). Now it's really just for a gimmick.

	Other syntactic sugar can be added later, eg 'code
	for (quote code).
*/

// convert number strings to real numbers
function atom(token) {
	var test = token - 0;
	if (isNaN(test)) return token;
	else return test;
}

// more special chars can be added later
function notSpecial(char) {
	return char != '(' &&
			char != '$';
}

function parse(codeString) {
	var firstChar = codeString[0];
	
	// code is an atom
	if (notSpecial(firstChar))
		return atom(codeString);

	// code needs to be reversed
	if (firstChar == '$')
		return revParse(codeString.slice(1));

	// code is a list
	var result = [];
	var remainder = codeString.slice(1,-1);

	while (remainder) {
		var remFirst = remainder[0];

		// if the first item is an atom
		if (notSpecial(remFirst)) {

			var first = (remainder.split(' ',1))[0];

			result.push(atom(first));

			var space_index = remainder.indexOf(' ');
			if (space_index >= 0)
				remainder =
					remainder.slice(space_index + 1);
			else
				return result;
		}

		// if the first item is itself a list
		else {
			// does the list need to be reversed?
			var revSwitch = remFirst == '$' ? true : false;

			// find the end of the list
			var start = revSwitch ? 1 : 0;
			var open_paren = 1;
			var close_paren = 0;
			var i = revSwitch ? 2 : 1;

			while (close_paren < open_paren) {
				if (remainder[i] == '(')
					open_paren += 1;
				if (remainder[i] == ')')
					close_paren += 1;
				i += 1;
			}

			var snippet = remainder.slice(start ,i);

			// reverse the snippet if need be
			if (revSwitch)
				result.push(revParse(snippet));
			else
				result.push(parse(snippet));

			// keep going or quit
			if (i < remainder.length)
				remainder = (remainder.slice(i+1));
			else
				return result;
		}
	}
	return result;
}

// reverse an array and all subarrays recursively
function deepReverse(array) {
	var newArray = array;
	newArray.forEach(function(element) {
		if (Array.isArray(element))
			element = deepReverse(element);
	})
	newArray.reverse();
	return newArray;
}

function revParse(codeString) {
	return deepReverse(parse(codeString));
}


/***************************************************/

/* THE EVALUATOR */

/**
	The eval-apply apply model used here is the one
	found in chapter four of SICP. Environments are
	implemented as arrays of dictionaries. It turns
	out that JavaScript objects are aliased pretty
	thoroughly, which was a major roadblock.
	There's probably a better way to do that (see
	the section on fun / lambda evaluation for a
	suggestion.)

	Short keywords have been chosen, namely 'def'
	instead of 'define' (like in Python) and 'fun'
	instead of 'lambda' (because lambdas are not
	only fun, they're fundamental!).

	Besides EVAL and APPLY, the major components
	of the interpreter, there are a few utility
	functions for dealing with environments
	(including a few for copying them so as to
	avoid aliasing).
*/


// PRIMITIVES implemented directly in js
// TODO: make these take a variable number of args
// TODO: add primitive list ops?
var primitives = {
	'+': function(a,b){return a+b},
	'-': function(a,b){return a-b},
	'*': function(a,b){return a*b},
	'/': function(a,b){return a/b},
	'<' : function(a,b){return a<b},
	'>' : function(a,b){return a>b},

	// truth conditions -- should these be different?
	'#f' : false, // include 0?
	'#t' : true,
};

// the global environment (an array of dictionaries)
var global_env = [{}, primitives];

// zip vars and vals together (to be added to the env)
function newFrame(variables, values) {
	// error
	if (variables.length != values.length)
		throw 'var val mismatch!'

	var frame = {};
	for (var i = 0; i < variables.length; i++)
		frame[variables[i]] = values[i];
	return frame;
}

// some deep copy functions to avoid aliasing
// do these work properly?
function copyArray(array) {
	if (typeof(array) != 'object')
		return array;
	var arrayCopy = [];
	for (var i = 0; i < array.length; i++) {
		if (typeof(array[i]) != 'object')
			arrayCopy[i] = array[i];
		else
			arrayCopy[i] = copyArray(array[i]);
	}
	return arrayCopy;
}

function copyFrame(frame) {//debugger;
	var keys = copyArray(Object.keys(frame));
	var frameCopy = {};
	for (var i = 0; i < keys.length; i++)
		frameCopy[keys[i]] = copyArray(frame[keys[i]]);
	return frameCopy;
}

function copyEnv(env) {
	envCopy = [];
	for (var i = 0; i < env.length; i++) {
		frameCopy = copyFrame(env[i]);
		envCopy.push(frameCopy);
	}
	return envCopy;
}

// add a new frame to the env
function extendEnv(frame, env) {
	var envCopy = copyEnv(env);
	envCopy.unshift(frame);
	return envCopy;
};

// return the value of the earliest occurence
// of the variable in the env
function lookup(variable, env) {//debugger;
	for (i = 0; i < env.length; i++) 
		if (variable in env[i]) {
			var value = env[i][variable];
			if (value in primitives)
				return primitives[value];
			else
				return eval(value, env.slice(i));
		}

	// error (if nothing is found)
	console.log(variable, env);
	throw 'unbound variable!' +
			"\n" + variable;
}

// find the earliest frame in which the var occurs
// (used by set!)
function mostRecentFrame(variable, env) {
	for (i = 0; i < env.length; i++)
		if (variable in env[i])
			return env[i];

	// error (if nothing is found)
	throw 'you can\'t set an unbound variable!';
}


// evaluate an expression in a particular environment
//(works in tandem with apply)
function eval(exp, env) {//debugger;
	// ATOMS
	var type = typeof(exp);

	// numbers
	if (type == 'number' || type == 'boolean')
		return exp;

	//variables
	if (type == 'string')
		return lookup(exp, env);

	// non-atoms: special and derived

	var tag = exp[0];

	// SPECIAL FORMS

	// quotation
	// this needs better output formatting to be useful
	if (tag == 'quote') {
		var text = exp[1];
		return text;
	}

	// conditionial
	else if (tag == 'if') {//debugger;
		var cond = exp[1];
		var then = exp[2];
		var othw = exp[3];

		if (eval(cond,env)) // which truth does this use, js or lisp?
			return eval(then,env);
		else
			return eval(othw,env);
	}

	// definition
	else if (tag == 'def') {//debugger;
		var variable = exp[1];
		var value = exp[2];

		// design decision: can variables be redefined?

		// allow redefinition :
		/*
		env[0][variable] = value;
		return 'defined!';
		*/

		//  forbid redefinition (use set! instead) :
		if (isNaN(env[variable])) {
			var firstFrame = env[0];

			/* should the value be evaluated upon definition
				or only during lookup? */

			//firstFrame[variable] = eval(value, env);

			firstFrame[variable] = value;
			return 'defined!'; // does this need to return something?
		}
		else throw 'already defined!';
	}

	// assignment
	else if (tag == 'set!') {//debugger;
		var variable = exp[1];
		var value = exp[2];
		var frame = mostRecentFrame(variable, env);
		var frInd = env.indexOf(frame);
		frame[variable] = eval(value, env.slice(frInd));
		return 'set!'; // does this need to return something?
	}


	// TODO: begin statements (internal definitions?)


	// function abstraction (ie lambdas)
	else if (tag == 'fun') {//debugger;

		var params = exp[1];
		var body = exp[2];

		// package the function with the current env

		/* does the entire env need to be packaged?
			maybe we could create a tiny dictionary
			that contained only what's used in the body
			of the function and attach just that.

			Eg if the exp is (fun (x) (+ a x)),
			the function only needs to look up a and +,
			so we could look those up and package
			{a : 3, + : ...} with the function.

			Major TODO.
		*/

		var funcEnv = copyEnv(env);

		return ['fun', params, body, funcEnv];
	}

	// DERIVED FORMS

	else if (tag == 'not') {//debugger;
		var A = exp[1];
		var convertedExp = ['if', A, '#f', '#t'];
		return eval(convertedExp, env);
	}

	else if (tag == 'and') {
		var A = exp[1];
		var B = exp[2];
		var convertedExp = ['if', A, B, A];
		return eval(convertedExp, env);
	}

	else if (tag == 'or') {
		var A = ['not', exp[1]];
		var B = ['not', exp[2]];
		var and = ['and', A, B];
		var convertedExp = ['not', and];
		return eval(convertedExp, env);
	}

	// GENERAL FUNCTIONS

	else {//debugger;
		var func = exp[0];
		var args = exp.slice(1);

		// for convenience (because we call env often)
		var fixedEnvEval = evalInEnv(env);

		// primitives

		// TODO: make this less ugly
		/* TODO: make primitive functions take
				take a variable number of arguments */
		if (func in primitives) {
			var primFunc = primitives[func];
			var arg_0 = fixedEnvEval(args[0]);
			var arg_1 = fixedEnvEval(args[1]);
			return primFunc(arg_0, arg_1);
		}

		// compound functions
		else {
			var evExp = exp.map(fixedEnvEval);
			var evFunc = evExp[0];
			var evArgs = evExp.slice(1);
			return apply(evFunc, evArgs);
		}
	}
}

// fix the evaluation environment
// for ease of reading
function evalInEnv(env) {
	return function (exp) {
		return eval(exp,env);
	};
}

// apply function to arguments
// (works in tandem with eval)
function apply(func, args) {//debugger;
	if (func[0] != 'fun')
		throw 'application error';

	var parameters = func[1];
	var body = func[2];
	var funcEnv = func[3];

	var evalFrame = newFrame(parameters, args);
	var evalEnv = extendEnv(evalFrame, funcEnv);

	return eval(body, evalEnv);
}

/**************************************************/

/* PUT IT ALL TOGETHER */

// parse, then evaluate in the global environment

/* TODO: output arrays as lisp code
		eg ['*',3,n] as (* 3 n) */

function lisp(codeString) {
	return eval(parse(codeString), global_env);
} 

/*************************************************/

// some basic definitions for testing

lisp('(def x 3)');
lisp('(def y 4)');

lisp('(def add1 (fun (x) (+ x 1)))');
lisp('(def apply (fun (f x) (f x)))');
lisp('(def addx (fun (y) (+ x y)))');
lisp('(def ylppa (fun (x f) (f x)))');
lisp('(def addn (fun (n) (fun (z) (+ z n))))');

// the following function doesn't work. why? (good homework problem)
// lisp('(def inc! (fun (x) (set! x (add1 x))))');

lisp('(def Y (fun (y) ((fun (f) (f f)) (fun (g) (y (fun (x) ((g g) x)))))))');
lisp('(def tri (fun (t) (fun (n) (if (< n 2) n (+ n (t (- n 1)))))))');
lisp('(def triangular (fun (n) (if (< n 2) n (+ n (triangular (- n 1))))))');
lisp('(def tri_tri ((fun (f) (f f)) (fun (t) (fun (n) (if (< n 2) n (+ n ((t t) (- n 1))))))))');
lisp('(def fib (fun (n) (if (< n 2) n (+ (fib (- n 1)) (fib (- n 2))))))');
lisp('(def fib_it (fun (n) (def loop (fun (a b count) (if (= (add1 count) n) b (loop b (+ a b) (add1 count))))) (loop 0 1 0)))');

/*
list operations don't work right now because of problems
with higher-order functions, but they should work otherwise
*/

/*
lisp('(def nil (quote ()))');
lisp('(def cons (fun (a b) (fun (m) (m a b))))');
lisp('(def car (fun (p) (p (fun (a b) a))))');
lisp('(def cdr (fun (p) (p (fun (a b) b))))');
*/








