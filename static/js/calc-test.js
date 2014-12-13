run = function(){
	var t = new Tests();
	return t.run();
}
Tests = function(){

    this.exprs = [
        ["6^2",36],
        ["64",64],
        ["(64)",64],
        ["64+25",89],
        ["64+25+24-23",90],
        ["6*(4+2)",36],
        ["(6+(8*3.25))/4",8],
        ["2*3*4",24],
        ["1+2+3+4+5",15],
        ["3+2^2/1",7],//bug: the 3 is dropped when interpreting the /
        ["3+2/2-1",3],//bug: the 3 is dropped when interpreting the -
        ["1+2/2*2",3],//bug: the multiplication is performed last
        ["1+2^2/2",3],//bug: division is performed last
        ["1+1/2+1/2^2+1",2.75],//bug: group last + with 2^2 instead of 1/2^2
        ["1+2^3/2",5],
        //correct evaluation with increasing and decreasing precedence
        ["6*4+2",26],['2+6*4',26],
        ['2^3-3^2',-1],
        ['2^1^2',2],//important: repeated exponetiation evaluated from r to l
        ['7-3-2',2],//important: repeated subtraction evaluated from l to r
        ['15/3/5',1],//important: repeated division evaluated from l to r

        //expressions with negation
        ["-64",-64],
        ["-(64)",-64],
        ["-(-64)",64],
        ["--64",64],
        ["---64",-64],
        ["7--2",9],
        ["64+-24",40],
        ["(6+10)*-2",-32],
        ["(6+10)*(-2+2)",0],
        ["6^-2",1.0/36],
        ["-6^2",-36]];//important: negation attatches to outside of exponent

    this.invalid_exprs = [
        '-',
        "6+","6*4-","*7",'6*+4',
        '6.2.3','6..35',
        '()',')','35)','(3','(3*4)^2)','((3*4)^2'
        ];

    this.run = function(){
        var c = new Calculator();
        for (var i = 0; i < this.exprs.length; i++){
        	var expr = this.exprs[i][0];
        	var expected = this.exprs[i][1];   
            try {
            	var stmt = new Statement(expr)
                c.execute(stmt);
                var val = stmt.output;
                if (val != expected){
                	throw 'evaluated to '+val;
                }
            } catch (e) {
                throw 'expression "' + expr + '" threw error "' + e + '"';
            }
        }
        for (var i = 0; i < this.invalid_exprs.length; i++){
        	var stmt = new Statement(this.invalid_exprs[i]);
            c.execute(stmt);
            if (!stmt.hasError)
            	return "failed at invalid expression " + expr;
        }
        return "success";
    }
}