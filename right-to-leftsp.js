/* 
	MODIFYING RIGHT-TO-LEFTSP 

	If you want to use Right-to-Leftsp but you don't 
	like the superficial language choices that have been 
	made, go ahead and change them! If you think 'fun' 
	is a dumb keyword to use for function abstraction, 
	change it back to 'lambda', or, even better, change 
	it to something else! Use a different language!

	You can also change the list separators. If you think 
	it's inappropriate to make curly braces equivalent 
	with parentheses, change isOpenParen and isCloseParen 
	accordingly. On the other hand, if you want to use 
	angle brackets or slashes or some other weird crap, 
	add them in! (Just make sure they don't conflict 
	with the basic arithmetic functions!)
*/

/* keywords */

const QUOTE_KEY = 'quote';
const IF_KEY = 'if';
const DEF_KEY = 'def';
const SET_KEY = 'set!';
const LAMBDA_KEY = 'fun';
const BEGIN_KEY = 'begin';
const DELAY_KEY = 'delay';

/* syntax */

function isOpenParen(char) {
	return char == '(' || 
			char == '[' || 
			char == '{';
}

function isCloseParen(char) {
	return char == ')' || 
			char == ']' || 
			char == '}';
}

/* FLAGS */

var DEBUG = 0;

function debug() {
	DEBUG = 1 - DEBUG;
}

/**************************************************/

/* THE PAR$ER */

/**
	The chief (only?) innovation of this Lisp is that
	it allows for expressions to be evaluated backwards.
	Affixing a dollar to the beginning of a string causes
	the PAR$ER to deep-reverse the string, i.e. to reverse
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
	with LtR scripts). Now it's really just a gimmick.

	Other syntactic sugar can be added later, e.g. 'code
	for (quote code).

	Oh, and did you know that parentheses, square 
	brackets, and curly braces can all be used 
	interchangeably? Neat, right?
*/

/*
	NOTE: This parser was written before I knew anything 
	about how parsers are supposed to work. In 
	particular, it's clearly the work of someone who 
	hasn't thought to tokenize input before parsing. 
	It's a miracle that the thing works at all, 
	especially considering that it has the reverse-$ 
	thing (which, in hindsight, is actually pretty cool.)

	The whole thing needs to be rewritten and broken 
	into smaller pieces.
*/

// convert number strings to real numbers
function atom(token) {
	var test = token - 0;
	if (isNaN(test)) return token;
	else return test;
}

// more special chars can be added later
function notSpecial(char) {
	return !(isOpenParen(char)) &&
			char != '$';
}

function parse(codeString) {
	var firstChar = codeString[0];
	
	// if the code is an atom
	if (notSpecial(firstChar))
		return atom(codeString);

	// if the code needs to be reversed
	if (firstChar == '$')
		return revParse(codeString.slice(1));

	// if the code is a list
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
				if (isOpenParen(remainder[i]))
					open_paren += 1;
				if (isCloseParen(remainder[i]))
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

/*
	EVAL / APPLY

	The interpreter consists of two mutually recursive 
	functions: eval and apply. eval takes as arguments 
	an expression and an environment. It dispatches on 
	the type of the expression and acts accordingly. In 
	some cases, nothing interesting happens. For 
	example, if the expression is a quote expression, 
	eval will simply return the quoted text. The 
	interesting case is function application. In this 
	case, the expression's operator and operands are all 
	evaluated. If the operator is a lambda expression, 
	the evaluation environment gets bound to it. 

	Then, the evaluated function and arguments are passed 
	to apply. apply extends the evaluation environment 
	by creating a new frame wherein the arguments are 
	bound to the function parameters. The body of the 
	function is then passed back to eval, where it will 
	get evaluated in the extended evaluation environment.

	Example: say the environment is the basic global_env 
	and the expression is ((fun (n) (+ n 4)) 5). eval 
	attaches the global_env to the lambda expression and 
	then passes it and 5 (which is self-evaluating) to 
	apply. apply creates a new frame wherein n is defined 
	to be 5. Then that extended environment and the 
	function body, (+ n 4), are passed back to eval. 
	When eval looks up the values of the variables + and 
	n, it will find them both -- + because it's defined 
	in the lowest level of the global_env, and n because 
	it's defined in the environment extension. eval then 
	applies the value of + (which in this implementation 
	is an actual JavaScript function) to 4 and 5, 
	returning 9 as the answer.
*/

/* EVAL */

function eval(exp, env) {

	const envEval = function(exp) {
		return eval(exp, env);
	}

	// numbers etc
	if (isSelfEvaluating(exp))
		return exp;

	// variables
	else if (isVariable(exp))
		return lookup(exp, env);

	// quotations
	else if (isQuote(exp))
		return quotedText(exp);

	// conditionals
	else if (isIf(exp)) {
		const test = ifTest(exp);
		const then = ifThen(exp);
		const othw = ifOthw(exp);

		if (isTrue(envEval(test)))
			return envEval(then);
		else
			return envEval(othw);
	}
		
	// definition
	else if (isDef(exp)) {
		const variable = defVar(exp);
		const value = defVal(exp);
		const evalVal = envEval(value);

		return defineVar(variable, evalVal, env);
	}

	// assignment
	else if (isAss(exp)) {
		const variable = assVar(exp);
		const value = assVal(exp);

		return setVar(variable, value, env);
	}

	// lambdas
	else if (isLambda(exp)) { if (DEBUG) debugger;
		const taggedLambda = 
			attachEnv(exp, env);

		return taggedLambda;
	}

	// begins
	else if (isBegin(exp)) {
		const actions = 
			beginActions(exp);

		return evalSeq(actions, env);
	}

	// delay (special form)
	else if (isDelay(exp)) { if (DEBUG) debugger;
		const delayExp =
			makeDelay(exp);

		return envEval(delayExp);
	}

	// function application
	else {
		const func = getFunc(exp);
		const args = getArgs(exp);
		const evFunc = envEval(func);
		const evArgs = args.map(envEval);

		if (isPrimitive(func))
			return applyPrimitive(evFunc, evArgs)

		return apply(evFunc, evArgs);
	}
}

/* APPLY */

function apply(func, args) { if (DEBUG) debugger;
	const params = getParams(func);
	const body = getBody(func);
	const env = getEnv(func);

	const appEnv = 
		extendEnv(params, args, env);

	return evalSeq(body, appEnv);
}

/* eval / apply helpers */

function evalSeq(exps, env) { if (DEBUG) debugger;
	const first = firstExp(exps);

	if (isLastExp(exps))
		return eval(first, env);

	else {
		eval(first, exps);
		return evalSeq(restExps(exps), env);
	}
}

function applyPrimitive(func, args) {
	const arglist = 
		Array.prototype.slice.call(arguments)[1];

	return func.apply(this, arglist);
}

/* PUT IT ALL TOGETHERS */

function lisp(codeString) {
	return eval(parse(codeString), global_env);
}

/***************************************************/

/*
	ENVIRONMENTS AND PRIMITIVE FUNCTIONS
*/

/* constructors */

function Env(frame, enclosure) {
	this.frame = frame;
	this.enclosure = enclosure;
}

function makeFrame(vars, vals) {
	const frame = {};

	for (var i = 0; i < vars.length; i++)
		frame[vars[i]] = vals[i];

	return frame;
}

function extendEnv(vars, vals, base) { if (DEBUG) debugger;
	const frame = makeFrame(vars, vals);
	const extEnv = new Env(frame, base);
	return extEnv;
}

/* global_env and primitives */

const primitives = {
	// arithmetic
	'+': function(a,b){return a+b},
	'-': function(a,b){return a-b},
	'*': function(a,b){return a*b},
	'/': function(a,b){return a/b},
	'<' : function(a,b){return a<b},
	'>' : function(a,b){return a>b},
	'=' : function(a,b){return a==b},

	// types
	'null?' : function(s){return s.length==0},

	// truth conditions -- should these be different?
	'#f' : false,
	'#t' : true,
}

const empty_env = [];

function isEmptyEnv(env) {
	return env == empty_env;
}

const base_env = new Env(primitives, empty_env);

const global_env = new Env({}, base_env)

/* variable lookup */

const _UNBOUND = '_UNBOUND';

function lookup(variable, env) { if (DEBUG) debugger;
	if (isEmptyEnv(env)) 
		return _UNBOUND;

	else if (variable in env.frame)
		return env.frame[variable];

	else return lookup(variable, env.enclosure);
}

/* environment modification */

function defineVar(variable, value, env) { if (DEBUG) debugger;
	return env.frame[variable] = value;
}

function setVar(variable, value, env) {
	if (isEmptyEnv(env)) {
		console.log(`unbound variable: ${variable}`);
		return _UNBOUND;
	}

	const frame = env.frame;
	const enclosure = env.enclosure;

	if (variable in frame)
		return frame[variable] = value;

	else return setVar(variable, value, enclosure); 
}

/***************************************************/

/* low-level helpers */

function isSelfEvaluating(exp) {
	const type = typeof(exp);
	return type == 'number' || type == 'boolean';
}

function isVariable(exp) {
	return typeof(exp) == 'string';
}

function getTag(exp) {
	return exp[0];
}

function hasTag(exp, tag) {
	return getTag(exp) == tag;
}

/* quotation */

function isQuote(exp) {
	return hasTag(exp, QUOTE_KEY);
}

function quotedText(exp) {
	return exp[1];
}

/* if */

function isIf(exp) {
	return hasTag(exp, IF_KEY);
}

function ifTest(exp) {
	return exp[1];
}

function ifThen(exp) {
	return exp[2];
}

function ifOthw(exp) {
	return exp[3];
}

function isTrue(exp) {
	return exp != false;
}

/* def / ass */

function isDef(exp) {
	return hasTag(exp, DEF_KEY);
}

function defVar(exp) {
	return exp[1];
}

function defVal(exp) {
	return exp[2];
}

function isAss(exp) {
	return hasTag(exp, SET_KEY);
}

function assVar(exp) {
	return exp[1];
}

function assVal(exp) {
	return exp[2];
}

/* lambda */

function isLambda(exp) {
	return hasTag(exp, LAMBDA_KEY);
}

function lambdaParams(exp) {
	return exp[1];
}

function lambdaBody(exp) {
	return exp[2];
}

function attachEnv(exp, env) {
	const params = lambdaParams(exp);
	const body = lambdaBody(exp);
	const taggedLambda = 
		[LAMBDA_KEY, params, body, env];

	return taggedLambda;
}

/* begin */

function isBegin(exp) {
	return hasTag(exp, BEGIN_KEY);
}

function beginActions(exp) {
	return exp.slice(1);
}

function isLastExp(seq) {
	// return seq.slice(1) == [];
	return seq.slice(1).length == 0;
}

function firstExp(seq) {
	return seq[0];
}

function restExps(seq) {
	return seq[1];
}

/* delay */

function isDelay(exp) {
	return hasTag(exp, DELAY_KEY);
}

function delayBody(exp) {
	return exp[1];
}

function makeDelay(exp) {
	return [LAMBDA_KEY, [], delayBody(exp)];
}

/* functions */

function getFunc(exp) {
	return exp[0];
}

function getArgs(exp) {
	return exp.slice(1);
}

function isPrimitive(func) {
	return func in primitives;
}

/* application */

function getParams(func) {
	return func[1];
}

function getBody(func) {
	// return func[2];
	const body = func.slice(2);
	body.pop();
	return body;
}

function getEnv(func) {
	return func[3];
}


/*************************************************/

/* 
	LIBRARY 

	TODO:

	It would be nice to have a bunch of strings defined
	individually (and perhaps gathered into an array) 
	and then a single load_library function to load 
	them all into the interpreter.
*/

/* list operations */

lisp('(def nil (quote ()))');
lisp('(def cons (fun (a b) (fun (m) (m a b))))');
lisp('(def car (fun (p) (p (fun (a b) a))))');
lisp('(def cdr (fun (p) (p (fun (a b) b))))');

/* some recursive functions of various kinds */

lisp('(def Y (fun (y) ((fun (f) (f f)) (fun (g) (y (fun (x) ((g g) x)))))))');
lisp('(def tri (fun (t) (fun (n) (if (< n 2) n (+ n (t (- n 1)))))))');
lisp('(def triangular (fun (n) (if (< n 2) n (+ n (triangular (- n 1))))))');
lisp('(def tri_tri ((fun (f) (f f)) (fun (t) (fun (n) (if (< n 2) n (+ n ((t t) (- n 1))))))))');
lisp('(def fib (fun (n) (if (< n 2) n (+ (fib (- n 1)) (fib (- n 2))))))');
lisp('(def fib_it (fun (n) (def loop (fun (a b count) (if (= (add1 count) n) b (loop b (+ a b) (add1 count))))) (loop 0 1 0)))');

/* other stuff */

lisp('(def add1 (fun (x) (+ x 1)))');
lisp('(def apply (fun (f x) (f x)))');
lisp('(def addx (fun (y) (+ x y)))');
lisp('(def ylppa (fun (x f) (f x)))');
lisp('(def addn (fun (n) (fun (z) (+ z n))))');


