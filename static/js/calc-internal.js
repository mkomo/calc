FREE_VARIABLE_NAME='x';

Statement = function(input){
	this.input = input;
	this.output = null;
	this.hasError = false;
	
	this.isAssignment = function(){
		var eqIndex = this.input.indexOf('=');
		if (eqIndex >= 0){
			return true;
		}
	}
};

Graph = function(input, calc){
	this.input = input;
	this.calc = calc;
	this.expression = calc.parseExpression(input);
	this.hasError = false;
	this.value = function(x){
		return this.calc.evaluateGraph(this, {'x':x});
	} 
};

Plot = function(coords, plotArgs){
	this.coords = coords;
	this.color = plotArgs.color;
	this.pointSize = plotArgs.pointSize;
	this.line = plotArgs.line;
	this.getCoords = function(){
		return coords;
	}
};

Calculator = function(){
	this.expressionFactory = new ExpressionFactory();
	_model = new CalculatorModel();
	_model.init();
	this.model = _model;
	
	this.execute = function(statement){
		try {
			if (statement.isAssignment()){
				statement.output = this.assign(statement.input);
			} else {
				//the statement is assumed to be an expression to be evaluated
				statement.output = this.evaluate(statement.input);
				//console.log(this.parseExpression(statement.input).toString());
			}
		} catch (ex){
			statement.output = ex;
			statement.hasError = true;
		}
	}
	
	this.assign = function(input){
		var eqIndex = input.indexOf('=');
		var name = input.substring(0, eqIndex);
		if (!this.expressionFactory.isValidToken(name))
			throw '"'+name +'" is not a valid name';
		var stringExpression = input.substring(eqIndex+1);
		var value = this.evaluate(stringExpression);
		if (isFinite(value)){
			_model.variables[name] = new Variable(name, Number(value));
			return name + '=' + value
		} else {
			throw 'cannot assign a variable to ' + value;
		}
	}
	this.evaluate = function(stringExpression){
		return this.parseExpression(stringExpression).value();
	}
	this.evaluateGraph = function(graph, valueMap){
		var previousFreeVal = _model.variables[FREE_VARIABLE_NAME];
		try {
			_model.variables[FREE_VARIABLE_NAME] = 
				new Variable(FREE_VARIABLE_NAME,valueMap.x);
			return graph.expression.value();
		} finally {
			_model.variables[FREE_VARIABLE_NAME] = previousFreeVal;
		}
	}
	this.parseExpression = function(stringExpression){
		return this.expressionFactory.makeExpression(stringExpression);
	}
	this.addModelListener = function(){
		
	}
}

Operator = function(string, fun, precedence){
	this.string = string;
	this.fun = fun;
	this.precedence = precedence;
		
	this.toString = function(){
		return this.string;
	}
	this.apply = function(left,right){
		return this.fun(left, right);
	}
};
Value = function(val){
	this.val = val;
	this.value = function(){
		return this.val;
	}
	this.toString = function(){
		return this.val;
	}
};
Variable = function(name, val){
	this.val = val;
	this.name = name;
	this.toString = function(){
		return this.name;
	}
}
Funct = function(name, fun){
	this.fun = fun;
	this.name = name;
	this.toString = function(){
		return this.name;
	}
};
Token = function(name){
	this.name = name;
	this.apply = function(val){
		var funct = _model.functions[this.name]; 
		if (funct != null){
			return funct.fun(val);
		} else {
			throw 'function "' + this.name + '" is not defined';
		}
	}
	this.value = function(){
		var variable = _model.variables[this.name];
		if (variable != null){
			return variable.val;
		} else {
			throw 'unbound variable "' + this.name + '"';
		}
	}
	this.toString = function(){
		return this.name;
	}
}

CalculatorModel = function(){
	this.init = function(){
		this.functions = {};
		for (var i = 0; i < BUILT_IN_FUNCTIONS.length; i ++){
			var funct = BUILT_IN_FUNCTIONS[i];
			this.functions[funct.name] = funct;
		}
		this.variables = {}
		for (var i = 0; i < BUILT_IN_VARIABLES.length; i ++){
			var variable = BUILT_IN_VARIABLES[i];
			this.variables[variable.name] = variable;
		}
	}
}

BINARY_OPERATORS = [
	new Operator('+',function(x,y){ return x+y; }, 0),
	new Operator('-',function(x,y){ return x-y; }, 1),
	new Operator('*',function(x,y){ return x*y; }, 2),
	new Operator('/',function(x,y){ return x/y; }, 3),
	new Operator('^',function(x,y){ return Math.pow(x,y); }, 4)
];
BUILT_IN_VARIABLES = [
	new Variable('pi', Math.PI),
	new Variable('e', Math.E)
];

var ROUNDING_PRECISION = 1000000000000;
var round = function(x){ return Math.round(x * ROUNDING_PRECISION)/ROUNDING_PRECISION };

BUILT_IN_FUNCTIONS = [
	new Funct('round',round),
	new Funct('sin',function(x){ return round(Math.sin(x)); }),
	new Funct('cos',function(x){ return round(Math.cos(x)); }),
	new Funct('tan',function(x){ return round(Math.tan(x)); }),
	new Funct('arcsin',function(x){ return round(Math.asin(x)); }),
	new Funct('arccos',function(x){ return round(Math.acos(x)); }),
	new Funct('arctan',function(x){ return round(Math.atan(x)); }),
	new Funct('ln',function(x){ return round(Math.log(x)); }),
	new Funct('log',function(x){ return round(Math.log(x)/Math.log(10)); }),
	new Funct('log2',function(x){ return round(Math.log(x)/Math.log(2)); }),
	new Funct('sqrt',function(x){ return round(Math.sqrt(x)); }),
	new Funct('abs',function(x){ return round(Math.abs(x)); })
];

ExpressionFactory = function(){
	this.operators = {}
	for (var i = 0; i < BINARY_OPERATORS.length; i ++){
		var operator = BINARY_OPERATORS[i];
		this.operators[operator.toString()] = operator;
	}
	
	this.makeExpression = function(string){
		var tokens = this.tokenize(string);
		//console.log(tokens);
		var root = new Expression();
		var current = root;
		var funct;
		while (tokens.length > 0){
			var token = tokens.shift();
			if (token == '('){
				var expr = new Expression(current);
				if (funct != null){
					expr.funct = new Token(funct);
					funct = null;
				}
				current.append(expr);
				current = expr;
				continue;
			} else if (token == ')'){
				current.validate();
				current = current.parent;
				if (current == null){
					throw 'closed an unopen parenthesis';
				}
			} else if (this.operators[token] != null){
				//either the token is intended as a binary operator or
				//it is a negation. let the expression pass it to the grouping
				//to figure it out.
				current.append(this.operators[token]);
			} else if (isFinite(token)){
				current.append(new Value(Number(token)));
			} else if (this.isValidToken(token)){
				if (tokens.length == 0 || tokens[0] != '('){
					current.append(new Token(token));
				} else {
					funct = token;
				}
			} else {
				throw 'invalid token "' + token + '"';
			}
		}
		//console.log(root.toString());
		if (current != root)
			throw 'unclosed parenthesis';
		return root;
	}
	
	this.tokenize = function(string){
		var tokens = [], buffer = '';
		for (i=0; i < string.length; i++){
			var ch = string.charAt(i); 
			var next = i < string.length-1 ? string.charAt(i+1) : '$';
			if (this.isReserved(ch)){
				tokens.push(ch);
			} else { 
				buffer+=ch;
			}
			if (buffer.length > 0 && (this.isReserved(next) || next == '$')){
				tokens.push(buffer);
				buffer = '';
			}
		}
		return tokens;
	}
	
	this.isReserved = function(ch){
		return ch  == '(' || ch == ')' || ch in this.operators;
	}
	
	this.isValidToken = function(name){
		return /^[a-zA-Z][a-zA-Z_0-9]*$/.test(name);
	}
}

/**
 * Grouping is a flat arithmetic expression, i.e. one containing no parentheses.
 * A grouping is constructed in such a way that it knows the order in which to 
 * execute it's operations based on standard arithmetic rules (think PEMDAS).
 */
Grouping = function(operator, left, right, parent){
	this.operator = operator;
	this.left = left;
	this.right = right;
	this.parent = parent;
	this.leftIsNegative = false;
	this.rightIsNegative = false;
	
	this.value = function(){
		this.validate()
		if (this.operator){
			if (this.operator.toString() == '^'){
				return (this.leftIsNegative ? -1 : 1) * 
							this.operator.apply(this.left.value(),
											(this.rightIsNegative ? -1 : 1) *
											this.right.value());
			} else {
				return this.operator.apply(
					(this.leftIsNegative ? -1 : 1)*this.left.value(),
					(this.rightIsNegative ? -1 : 1)*this.right.value());
			}
		} else { 
			return (this.leftIsNegative ? -1 : 1) * this.left.value();
		}
	}

	this.validate = function(){
		if (this.left == null)
			throw 'quantity or variable expected';
		if (this.left.value == null) 
			throw 'unexpected token "' + this.left + '"';
		if (this.operator){
			if (this.operator.apply == null)
				throw 'invalid function "' + this.operator + '"';
			if (this.right == null || this.right.value == null) 
				throw 'quantity or variable expected after "' 
						+ this.operator + '"';
		}
	}
	
	this.toString = function(){
		return  '('+(this.left != null
					? (this.leftIsNegative ? '-' : '') + this.left 
					: '') +
				(this.operator != null 
					? this.operator 
					: '') +
				(this.right != null 
					? ((this.rightIsNegative ? '-' : '') + this.right)
					: '') + ')';
	}
}
/**
 * Expression is a syntactically meaningful collection of tokens which yields
 * a definite result when evaluated according to the rules of mathematics.
 */
Expression = function(parent){
	this.rootGrouping = new Grouping()
	this.currentGrouping = this.rootGrouping
	this.rightmostOperator = null;
	this.funct = null;

	if (parent == null){
		this.parent = null;
		this.root = this;
	} else {
		this.parent = parent;
		this.root = parent.root;
	}
	
	this.toString = function(){
		if (this.root == this && this.funct == null){
			return this.rootGrouping.toString();
		} else {
			return (this.funct != null ? this.funct : '') +
				'('+this.rootGrouping.toString()+')';
		}
	}

	this.append = function(token){
		//console.log("token: " + token);
		//console.log("current grouping at beginning of append: " + this.currentGrouping);
		//console.log("root grouping at beginning of append: " + this.rootGrouping);
		var negationOrSubtraction = token.toString() == '-';
		if (this.currentGrouping.left == null){
			if (negationOrSubtraction) {
				this.currentGrouping.leftIsNegative = 
					!this.currentGrouping.leftIsNegative;
			} else {
				this.currentGrouping.left = token;
				this.currentGrouping.validate();
			}
		} else if (this.currentGrouping.operator == null){
			this.currentGrouping.operator = token; 
			this.rightmostOperator = token;
		} else if (this.currentGrouping.right == null){
			if (negationOrSubtraction) {
				this.currentGrouping.rightIsNegative = 
					!this.currentGrouping.rightIsNegative;
			} else {
				this.currentGrouping.right = token;
				this.currentGrouping.validate();
			}

		} else {
			var diff = token.precedence - this.rightmostOperator.precedence;
			if (diff > 0 || (diff == 0 && token.string == '^')){
				//either the precedence of this operator is greater than the 
				//previously handled operator or it is equal and '^'. in either
				//case, we compute right first, then left.
				var g = new Grouping(token, this.currentGrouping.right, null, this.currentGrouping);
				this.currentGrouping.right = g;
				this.currentGrouping = this.currentGrouping.right;
			} else {
				//the precedence of this operator is lower than the previous. the new left is the
				//oldest ancestor of the current grouping with a higher-precedence operator than token.
				var newLeftGrouping = this.currentGrouping;
				while (newLeftGrouping.parent != null &&
						newLeftGrouping.parent.operator != null &&
						newLeftGrouping.parent.operator.precedence > token.precedence) {
					newLeftGrouping = newLeftGrouping.parent;
				}
				if (newLeftGrouping.parent == null){
					this.rootGrouping = new Grouping(token, newLeftGrouping, null, null)
					this.currentGrouping = this.rootGrouping;
				} else {
					newLeftGrouping.left = new Grouping(newLeftGrouping.operator, newLeftGrouping.left,
							newLeftGrouping.right, newLeftGrouping);
					newLeftGrouping.operator = token;
					newLeftGrouping.right = null;
					this.currentGrouping = newLeftGrouping;
				}
			}
			this.rightmostOperator = token;
		}
		//console.log("current grouping at end: " + this.currentGrouping);
		//console.log("root grouping at end: " + this.rootGrouping);
	}

	this.validate = function(){
		this.rootGrouping.validate();
	}
	this.value = function(){
		if (this.funct != null){
			return this.funct.apply(this.rootGrouping.value());
		} else {
			return this.rootGrouping.value();
		}
	}
}