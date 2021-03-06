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
const BEGIN_KEY = 'begin';

const IF_KEY = 'if';
const AND_KEY = 'and';
const OR_KEY = 'or';

const DEF_KEY = 'def';
const SET_KEY = 'set!';

const LAMBDA_KEY = 'fun';
const DELAY_KEY = 'delay';

const TRUE_KEY = '#t';
const FALSE_KEY = '#f';

/* syntax */

const openers = /[([{]/;
const closers = /[)\]}]/;
const separators = /[\s]/;

const reverser = /[\$]/;
const quoter = /[\']/;
// how can variables be included in a regexp?
const readerMacros = /[\$']/;

/* FLAGS */

var DEBUG = 0;

function debug() {
	DEBUG = 1 - DEBUG;
}

/**************************************************/

/* LISP READER */

function lisp(codeString) { 
	if (! parensBalanced(codeString))
		return "BAD SYNTAX -- parentheses unbalanced!"
	
	const parsed = parse(codeString);
	const value = eval(parsed, global_env);
	return value;
}

function parensBalanced(codeString) {
	var op = 0;
	var cp = 0;

	for (var i = 0; i < codeString.length; i++) {
		if (isOpenParen(codeString[i]))
			op++;
		if (isCloseParen(codeString[i]))
			cp++;
	}

	return op == cp;
}

// converts internal representation back to lisp code
function backToLisp(value) { 
	// ???
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

function parse(codeString) {
	return readTokens(tokenize(codeString));
}

// internal representations
const _OP = '(';
const _CP = ')';
const _rev = '$';
const _quo = '\'';

function tokenize(codeString) {
	const openerRegExp = new RegExp(openers, 'g');
	const closerRegExp = new RegExp(closers, 'g');

	// can we deal with all macros at once?
	// const macroRegExp = new RegExp(readerMacros, 'g');

	// temporary fix: deal with macros individually
	const reverserRegExp = new RegExp(reverser, 'g');
	const quoterRegExp = new RegExp(quoter, 'g');

	// how to replace each macro with the right thing?
	const tokens = 
		codeString.replace(openerRegExp, ` ${_OP} `).
			replace(closerRegExp, ` ${_CP} `).
				replace(reverserRegExp, ` ${_rev} `).
					replace(quoterRegExp, ` ${_quo} `).
						split(separators);

	function emptyStringFilter(token) {
		return token != '';
	}

	return tokens.filter(emptyStringFilter);
}

function readTokens(tokens) { 
	if (tokens.length == 0)
		return [];

	const first = tokens[0];

	// expression is not a list
	if (notSpecial(first))
		return makeAtom(first);

	// expression is a list to be reversed
	else if (first == _rev)
		return reverseRead(tokens.slice(1));

	// expression is a quotation
	else if (first == _quo)
		return readQuote(tokens.slice(1));

	// expression is a list
	const result = [];
	var remainder = tokens.slice(1,-1);

	while (remainder.length != 0) {
		var remFirst = remainder[0];

		// first item of the list is an atom
		if (notSpecial(remFirst)) {
			result.push(makeAtom(remFirst));
			remainder = remainder.slice(1);
		}

		// first item is a quotation
		else if (remFirst == _quo) {
			var start = 0;
			while (!isOpenParen(remainder[start]))
				start++;
			const end = start + 
				sublistEndIndex(remainder.slice(start));
			const sublist = 
				remainder.slice(start, end);
		}

		// first item of the list is a list
		else {
			var start = 0;
			while (!isOpenParen(remainder[start]))
				start++;
			const end = start + 
				sublistEndIndex(remainder.slice(start));
			const sublist = 
				remainder.slice(start, end);

			if (remFirst == _rev)
				result.push(reverseRead(sublist));
			else if (remFirst == _quo)
				result.push(readQuote(sublist));
			else
				result.push(readTokens(sublist));

			remainder = remainder.slice(end);
		}
	}

	return result;

	/* helpers */

	function reverseRead(tokens) {
		return deepReverse(readTokens(tokens));

		function deepReverse(array) {
			var newArray = array;

			newArray.forEach(function(element) {
				if (Array.isArray(element))
					element = deepReverse(element);
			})

			newArray.reverse();

			return newArray;
		}
	}

	function readQuote(tokens) {
		return makeQuote(readTokens(tokens));s
	}

	function makeAtom(token) {
		const test = token - 0;
		if (isNaN(test)) 
			return token;
		else 
			return test;
	}

	function notSpecial(token) {
		return token != _rev && 
				token != _quo && 
				token != _OP && 
				token != _CP;
	}

	function isMacro(token) {
		return readerMacros.test(token);
	}

	function sublistEndIndex(tokens) {
		// tokens[0] is open paren
		var i = 1; 
		var op = 1;
		var cp = 0;

		while (cp < op) {
			if (isOpenParen(tokens[i]))
				op += 1;
			if (isCloseParen(tokens[i]))
				cp += 1;
			i += 1;
		}

		return i;
	}
}

/***************************************************/

/* edit to add analyze!!! */

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
	const analyzed = analyze(exp);
	return analyzed(env);
}

/* ANALYZE */

function analyze(exp) {

	// numbers etc
	if (isSelfEvaluating(exp)) {
		return function (env) {
			return exp;
		};		
	}

	// variables
	else if (isVariable(exp)) {
		return function(env) {
			return lookup(exp, env);
		};		
	}

	// quotations
	else if (isQuote(exp)) {
		const text = quotedText(exp);

		return function(env) {
			return text;
		};	
	}
	
	// conditionals
	else if (isIf(exp)) {
		const test = analyze(ifTest(exp));
		const then = analyze(ifThen(exp));
		const othw = analyze(ifOthw(exp));

		return function(env) {
			if (isTrue(test(env)))
				return then(env);
			else
				return othw(env);
		};
	}

	else if (isAnd(exp))
		return analyze(makeAnd(andExps(exp)));
		
	else if (isOr(exp))
		return analyze(makeOr(orExps(exp)));
		
	// definition
	else if (isDef(exp)) {
		const variable = defVar(exp);
		const value = analyze(defVal(exp));

		return function(env) {
			return defineVar(variable, value(env), env);
		};
	}

	// assignment
	else if (isAss(exp)) { 
		const variable = assVar(exp);
		const value = analyze(assVal(exp));

		return function(env) {
			return setVar(variable, value(env), env);
		};
	}

	// lambdas
	else if (isLambda(exp)) { 
		const params = lambdaParams(exp);
		const body = lambdaBody(exp);
		const anBody = analyzeSeq(body);

		return function(env) {
			return makeFunc(params, anBody, env);
		};
	}

	// begins
	else if (isBegin(exp)) {
		const actions = 
			beginActions(exp);

		return analyzeSeq(actions);
	}

	// delay (special form)
	else if (isDelay(exp)) { 
		const delayExp =
			makeDelay(exp);

		return analyze(delayExp);
	}

	// function application
	else {
		const func = getFunc(exp);
		const args = getArgs(exp);
		const anFunc = analyze(func);
		const anArgs = args.map(analyze);

		return function(env) {
			const envFunc = anFunc(env);
			const envArgs = 
				anArgs.map(function(arg){
					return arg(env);
				});

		if (isPrimitive(func))
			return applyPrimitive(envFunc, envArgs);
		else
			return apply(envFunc, envArgs);
		}
	}
}

/* APPLY */

function apply(func, args) { if (DEBUG) debugger;
	const params = getParams(func);
	const body = getBody(func);
	const env = getEnv(func);

	const appEnv = 
		extendEnv(params, args, env);

	return body(appEnv);
}

/* eval / apply helpers */

function analyzeSeq(exps) { if (DEBUG) debugger;
	const executeSeq = function(funcs, env) { 
		const car = funcs[0];
		const cdr = funcs.slice(1);

		if (cdr.length == 0)
			return car(env);
		else {
			car(env);
			return executeSeq(cdr, env);
		}
	};

	const funcs = exps.map(analyze);

	return function(env) {
		return executeSeq(funcs, env);
	};
}

function applyPrimitive(func, args) {
	const arglist = 
		Array.prototype.slice.call(arguments)[1];

	return func.apply(this, arglist);
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

function extendEnv(vars, vals, base) { 
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

	// list operations
	'nil' : [],
	'cons': cons,
	'car' : car,
	'cdr' : cdr,
	'list': list,

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

const _UNBOUND = 'UNBOUND';

function lookup(variable, env) { 
	if (isEmptyEnv(env)) 
		return `${_UNBOUND} : ${variable}`;

	const frame = getFrame(env);
	const enclosure = getEnclosure(env);

	if (variable in frame)
		return frame[variable];

	else return lookup(variable, enclosure);
}

/* environment modification */

function defineVar(variable, value, env) {
	const frame = getFrame(env); 
	return frame[variable] = value;
}

function setVar(variable, value, env) {  
	if (isEmptyEnv(env)) {
		return `${_UNBOUND} : ${variable}`;
	}

	const frame = getFrame(env);
	const enclosure = getEnclosure(env);

	if (variable in frame)
		return frame[variable] = value;

	else return setVar(variable, value, enclosure); 
}

function getFrame(env) {
	return env.frame;
}

function getEnclosure(env) {
	return env.enclosure;
}

/***************************************************/

/* low-level helpers */

function isOpenParen(char) {
	return openers.test(char);
}

function isCloseParen(char) {
	return closers.test(char);
}

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

function makeQuote(exp) {
	return [QUOTE_KEY, exp];
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
	return exp != false && 
		exp != Infinity;
}

/* booleans */

function isAnd(exp) {
	return hasTag(exp, AND_KEY);
}

function andExps(exp) { 
	return exp.slice(1);
}

function makeAnd(seq) { 
	if (seq.length == 0)
		return TRUE_KEY;

	else {
		const first = firstExp(seq);
		const rest = seq.slice(1); // restExps???
		const transform = makeAnd(rest);
		const result = 
			[IF_KEY, first, transform, FALSE_KEY];
		return result;
	}
}

function isOr(exp) {
	return hasTag(exp, OR_KEY);
}

function orExps(exp) {
	return exp.slice(1);
}

function makeOr(seq) {
	if (seq.length == 0)
		return FALSE_KEY;

	else {
		const first = firstExp(seq);
		const rest = seq.slice(1); // restExps???
		const transform = makeOr(rest);
		const result = 
			[IF_KEY, first, TRUE_KEY, transform];
		return result;
	}
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
	return exp.slice(2);
}

function makeFunc(params, body, env) { if (DEBUG) debugger;
	const taggedLambda = 
		[env, params, body];

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
	// return seq.slice(1);
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
	return func[2];
}

function getEnv(func) {
	return func[0];
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

/* basic arithmetic */

const add1 = 
	`(${DEF_KEY} add1 
		(${LAMBDA_KEY} (x) 
			(+ x 1)))`;

const sub1 = 
	`(${DEF_KEY} sub1 
		(${LAMBDA_KEY} (x) 
			(- x 1)))`;

const addn = 
	`(${DEF_KEY} addn 
		(${LAMBDA_KEY} (n) 
			(${LAMBDA_KEY} (z) 
				(+ z n))))`;

const arithmetic_library = [
	add1, sub1, addn
];

/* recursive functions of various kinds */

const fib_rec =
	`(${DEF_KEY} fib_rec 
		(${LAMBDA_KEY} (n) 
			(if (< n 2) 
				n 
				(+ (fib (- n 1)) 
					(fib (- n 2))))))`;

const fib_it = 
	`(${DEF_KEY} fib_it 
		(${LAMBDA_KEY} (n) 
			(${DEF_KEY} loop 
				(${LAMBDA_KEY} (a b count) 
					(if (= (add1 count) n) 
						b 
						(loop b 
							(+ a b) 
							(add1 count))))) 
			(loop 0 1 0)))`;

const triangular = 
	`(${DEF_KEY} triangular 
		(${LAMBDA_KEY} (n) 
			(if (< n 2) 
				n 
				(+ n 
					(triangular (sub1 n))))))`;

const Y = 
	`(${DEF_KEY} Y 
		(${LAMBDA_KEY} (y) 
			((${LAMBDA_KEY} (f) 
				(f f)) 
			(${LAMBDA_KEY} (g) 
				(y (${LAMBDA_KEY} (x) 
						((g g) x)))))))`;

const tri = 
	`(${DEF_KEY} tri 
		(${LAMBDA_KEY} (t) 
			(${LAMBDA_KEY} (n) 
				(if (< n 2) 
					n 
					(+ n 
						(t (sub1 n)))))))`;

const tri_tri = 
	`(${DEF_KEY} tri_tri 
		((${LAMBDA_KEY} (f) 
			(f f)) 
		(${LAMBDA_KEY} (t) 
			(${LAMBDA_KEY} (n) 
				(if (< n 2) 
					n 
					(+ n 
						((t t) (sub1 n))))))))`;

const recursive_library = [
	fib_rec, fib_it, triangular, Y, tri, tri_tri
];

/* church encodings */

const church = 
	`(${DEF_KEY} church
		(${LAMBDA_KEY} (n)
			((n add1) 0)))`;

const cons_ = 
	`(${DEF_KEY} cons_ 
		(${LAMBDA_KEY} (a b) 
			(${LAMBDA_KEY} (m) 
				(m a b))))`;

const car_ = 
	`(${DEF_KEY} car_ 
		(${LAMBDA_KEY} (p) 
			(p (${LAMBDA_KEY} (a b) 
					a))))`;

const cdr_ = 
	`(${DEF_KEY} cdr_ 
		(${LAMBDA_KEY} (p) 
			(p (${LAMBDA_KEY} (a b) 
					b))))`;

const zero_ = 
	`(${DEF_KEY} zero_
		(${LAMBDA_KEY} (f)
			(${LAMBDA_KEY} (x)
				x)))`;

const inc_ = 
	`(${DEF_KEY} inc
		(${LAMBDA_KEY} (n)_
			(${LAMBDA_KEY} (f)
				(${LAMBDA_KEY} (x)
					(f ((n f) x))))))`;

const church_library = [
	church, cons_, car_, cdr_, zero_, inc_
];

/* load library */

const LIBRARY = 
	arithmetic_library.
		concat(recursive_library).
			concat(church_library);

function load_library() {
	LIBRARY.forEach(function(entry){
		lisp(entry);
	});
}

load_library();


/* actual js functions for primitives (lazy? stupid?) */

function cons(x, y) {
	return [x, y];
}

function car(s) {
	return s[0];
}

function cdr(s) {
	return s[1];
}

function list() {
	args = Array.prototype.slice.call(arguments);
	if (args.length == 0)
		return [];
	else
		return [args[0],
				list.apply(this,args.slice(1))];
}