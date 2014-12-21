$.fn.log = function (msg) {
	if (typeof(console)!="undefined" && console)
		console.log("%s: %o", msg, this);
	return this;
};
$.extend({
	log : function(msg) {
		if (typeof(console)!="undefined" && console)
			console.log("%s", msg);
	}
});

ModelList = function(container, provider) {
	this.container = container;
	this.provider = provider;
	this.update = function(){
		
	}
	this.appendToList = function(graph){
		this.container.append(
			'<div class="model-list-entry">' +
				'<a class="remove" href="javascript:void(0)" id="graph_' + 
					graph.id + '">x</a>' +
				'<div class="marker" style="background-color:' + 
					this.getColor(graph.id)+'">&nbsp;</div>' +
				'<div class="label">y=' +
					(graph.input.length > 0 ? graph.input : '&nbsp;') +
				'</div>' +
				'<div class="clear"></div>' +
			'</div>');	
			$('.graph-list-entry').hover(function(){
				$(this).children('.remove').show();
			}, function(){
				$(this).children('.remove').hide();
			});
		this.graphListDisplay[0].scrollTop =
				this.graphListDisplay[0].scrollHeight;
	}
};

Notebook = function(pane, calculator, input){
	this.pane = pane;
	this.calculator = calculator;
	this.input = input;
	this.statementHistory = new Array(); 
	this.currentlyHovered = null;
	this.reserved = {
		"clear": function(notebook, statement){
			notebook.statementHistory = new Array();
			notebook.pane.empty();
			notebook.save();
			return false;
		},
		"env": function(notebook, statement){
			var output = "functions:\n";
			for (var fun in notebook.calculator.model['functions']){
				output += " " + fun + ";"
			}
			output = output + "\nvariables:\n";
			for (var v in notebook.calculator.model['variables']){
				output += " " + v + '=' + notebook.calculator.model['variables'][v].val + ";";
			}
			output = output + "\nbinary operators:\n"
			for (var v in notebook.calculator.expressionFactory.operators){
				output += " " + v + ";";
			}

			statement.output = output;
			statement.isInfo = true;
			return true;
		},
		//"pop": function(notebook, statement){
		//	statement.output = "remove last item";
		//	statement.hasError = true;
		//	return true;
		//},
		"help": function(notebook, statement){
			statement.output = 'enter an mathematical expression that you want to evaluate\n' +
				'such as "2^7-1" or "cos(3*pi/2)"';
			statement.isInfo = true;

			return true;
		}
	}
	this.init = function(){
		var self = this;
		$('.statement *').live('click',function(e){
			var clicked = $(this);
			if (clicked.hasClass('error')){
				self.input.val(clicked.prev().text());
			} else {
				self.input.val(clicked.text());
			}
			self.input.focus();
		});
		this.load();
	};
	this.add = function(input){
		var statement = new Statement(input);
		if (this.reserved[input] != null){
			var result = this.reserved[input](this, statement);
			console.log(statement);
			if (!result) {
				return;
			}
		} else {
			this.calculator.execute(statement);
		}
		var id = this.statementHistory.push(statement) - 1;
		this.pane.append(
			'<div class="statement" id="statement_'+id+'">' +
				'<div class="input">' + 
					(statement.input.length > 0 ? statement.input : '&nbsp;') +
				'</div>' +
				'<pre class="output' + (statement.hasError || statement.isInfo ? ' error' : '')+
				'">' +
					statement.output +
				'</pre>' +
			'</div>');

		window.scrollTo(0,document.body.scrollHeight);

		this.save();

		return statement.hasError;
	};
	this.localStorageKey = 'CALC_WORKBOOK_HISTORY';
	this.save = function(){
		// Put the object into storage
		localStorage.setItem(this.localStorageKey, this.serialize());

	};
	this.load = function(){
		// Retrieve the object from storage
		var retrievedString = localStorage.getItem(this.localStorageKey);
		if (typeof retrievedString !== "undefined"){
			var retrievedObject = JSON.parse(retrievedString);
			console.log("retrieved the following history from local storage", retrievedObject);
			for (var i = 0; i < retrievedObject.length; i++){
				console.log("adding " + retrievedObject[i])
				this.add(retrievedObject[i]);
			}
		}
	};
	this.serialize = function(){
		var inputs = [];
		for (var i = 0; i < this.statementHistory.length; i++) {
			inputs.push(this.statementHistory[i].input)
		}
		return JSON.stringify(inputs)
	};
}

GraphCanvas = function(canvas, calculator, input){
	this.canvas = canvas;
	this.calculator = calculator;
	this.input = input;

	this.graphList = new Array();
	this.plotList = new Array();

	this.context = canvas.getContext('2d');
	this.graphListDisplay = $('#graph-list');

	this.pixelWidth = $(canvas).width();
	this.pixelHeight = $(canvas).height();

	this.xStep = function(){
		return (this.xMax - this.xMin) / (this.pixelWidth - 1)
	}
	this.yStep = function(){
		return (this.yMax - this.yMin) / (this.pixelHeight - 1)
	}

	this.init = function(config){
		var originalWidth = $("#canvas").width();

		var hammertime = new Hammer($("#canvas")[0]);
		var panCount = 0;

		if (config.drag){
			hammertime.get('pan').set({ direction: Hammer.DIRECTION_ALL });
			hammertime.on('pan', function(ev) {
				if (panCount > 2) {
					console.log("pan");
					$("#canvas").css({
						top: ev.deltaY+'px',
						left: ev.deltaX+'px'
					});
					ev.preventDefault();
				}
				panCount++;
			});
			hammertime.on('panend', function(ev) {
				if (panCount > 2) {
					console.log("panend");
					var pixel = new Pixel(canvas.offsetLeft, canvas.offsetTop);
					$("#canvas").css({
						top: '0px',
						left: '0px'
					});
					_output.translate(pixel);
				}
				panCount = 0;
			});//*/
		}
		if (config.zoom){
			hammertime.get('pinch').set({ enable: true });
			hammertime.on('pinch', function(ev) {
				console.log("pinch");
				var offset = $('#canvas-container').offset();
				var pixel0 = new Pixel(ev.pointers[0].pageX - offset.left,
						ev.pointers[0].pageY - offset.top);
				var pixel1 = new Pixel(ev.pointers[1].pageX - offset.left,
						ev.pointers[1].pageY - offset.top);
				var m = new Pixel((pixel0.x + pixel1.x)/2, (pixel0.y + pixel1.y)/2)
				$("#canvas").css({
					top: (m.y + ev.scale*(ev.deltaY - m.y))+'px',
					left: (m.x + ev.scale*(ev.deltaX - m.x))+'px'
				});
				$("#canvas").width(originalWidth*ev.scale);
			});
			hammertime.on('pinchend', function(ev) {
				console.log("pinchend");

				var top = parseInt($('#canvas').css('top'), 10);
				var left = parseInt($('#canvas').css('left'), 10);
				var width = $('#canvas').width();
				var originalHeight = $('#canvas-container').height();

				var upperLeftPixel = new Pixel(-1*left*(originalWidth/width),
						-1*top*(originalWidth/width))
				var lowerRightPixel = new Pixel((originalWidth - left)*(originalWidth/width),
						(originalHeight - top)*(originalWidth/width));

				var upperLeftCoord = _output.getCoordinate(upperLeftPixel);
				var lowerRightCoord = _output.getCoordinate(lowerRightPixel);

				//reset things
				$("#canvas").width(originalWidth);
				$("#canvas").css({
					top: '0px',
					left: '0px'
				});//*/

				_output.updateBoundingBox({
					xMin : upperLeftCoord.x,
					xMax : lowerRightCoord.x,
					yMin : lowerRightCoord.y,
					yMax : upperLeftCoord.y
				});

				panCount = 0;
			});

			$("#canvas").mousewheel(function(e, delta) {
				var offset = $('#canvas').offset();
				var pixel = new Pixel(e.pageX - offset.left, e.pageY - offset.top);
				var factor = (delta > 0) ? 1/1.5 : 1.5;
				_output.zoom(factor, pixel);
				return false; // prevent default
			});
			//*/
		}
		$("#canvas").mouseout(function(){
			$('#coordinate-tracker').text('');
		}).mousemove(function(e){
			var offset = $('#canvas').offset();
			var coord = _output.getCoordinate(
					new Pixel(e.pageX - offset.left, e.pageY - offset.top)) 
			$('#coordinate-tracker').text(coord.toString());
		});
		this.redraw();
		$('#graph-list a').live('click',function(e){
			var index = Number(this.id.substring(6));
			_output.graphList.splice(index, 1);
			_output.redraw();
			_output.updateGraphList();
			_output.save();
			return false;
		});
		$('#extrema-update').click(function(e){
			_output.updateBoundingBox({
				xMin : Number($('#xMin').val()),
				xMax : Number($('#xMax').val()),
				yMin : Number($('#yMin').val()),
				yMax : Number($('#yMax').val())
			});
			return false;
		});

		if (!this.load()){
			this.updateBoundingBox(config.boundingBox);
			return false;
		} else {
			return true;
		}
	}

	this.redraw = function(){
		//clear the canvas
		this.canvas.width = this.canvas.width;
		
		this.drawAxes();
		this.drawHashes();
		for (var i=0; i < this.plotList.length; i++){
			this.drawPlot(this.plotList[i]);
		}
		for (var i = 0; i < this.graphList.length; i++) {
			var graph = this.graphList[i];
			this.draw(graph, i);
		}
	}

	this.updateGraphList = function(){
		//clear the graph list
		this.graphListDisplay.html('');
		
		for (var i = 0; i < this.graphList.length; i++) {
			var graph = this.graphList[i];
			this.appendToList(graph, i);
		}
	}

	this.updateExtremaInput = function(){
		$('#xMin').val(this.xMin);
		$('#xMax').val(this.xMax);
		$('#yMin').val(this.yMin);
		$('#yMax').val(this.yMax);
	}

	this.translate = function(pixel){
		var newTopLeft = this.getCoordinate(pixel);
		var offsetH = newTopLeft.x - this.xMin;
		var offsetV = newTopLeft.y - this.yMax;
		console.log('translating by ',
				new Coordinate(offsetH, offsetV));
		this.updateBoundingBox({
			xMin : this.xMin - offsetH,
			xMax : this.xMax - offsetH,
			yMin : this.yMin - offsetV,
			yMax : this.yMax - offsetV
		});
	}

	this.zoom = function(factor, pixel){
		var coord = this.getCoordinate(pixel);
		console.log('zooming factor and coord ', 1/factor, coord);
		this.updateBoundingBox({
			xMin : coord.x - factor * (coord.x - this.xMin),
			xMax : coord.x + factor * (this.xMax - coord.x),
			yMin : coord.y - factor * (coord.y - this.yMin),
			yMax : coord.y + factor * (this.yMax - coord.y)
		});
	}

	this.getCoordinate = function(pixel){
		var x = this.xMin + pixel.x * this.xStep();
		var y = this.yMax - pixel.y * this.yStep();
		return new Coordinate(x,y);	
	}

	this.getPixel = function(coord){
		var x = Math.round((coord.x - this.xMin)/this.xStep());
		var y = this.pixelHeight - 
					Math.round((coord.y - this.yMin)/this.yStep());
		return new Pixel(x,y);
	}

	this.updateBoundingBox = function(bb){
		this.xMin = bb.xMin;
		this.xMax = bb.xMax;
		this.yMin = bb.yMin;
		this.yMax = bb.yMax;

		this.save();

		this.redraw();
		this.updateExtremaInput();
	}
	this.axisColor = 'rgb(120,120,120)';
	this.drawAxes = function(){
		var origin = this.getPixel(new Coordinate(0,0));
		this.drawLine(
			new Pixel(0,origin.y), 
			new Pixel(this.pixelWidth, origin.y),
			this.axisColor);
		this.drawLine(
			new Pixel(origin.x, 0), 
			new Pixel(origin.x, this.pixelHeight),
			this.axisColor);
	}

	this.drawHashes = function(){
		if (this.xMin < 0 && this.xMax > 0){
			if (this.yMax - this.yMin < this.pixelHeight){
				var center;
				for (var i = Math.ceil(this.yMin); i <= Math.floor(this.yMax); i++){
					center = this.getPixel(new Coordinate(0, i));
					this.drawLine(
						new Pixel(center.x - 2, center.y),
						new Pixel(center.x + 2, center.y),
						this.axisColor)
				}
			}
		} 
		if (this.yMin < 0 && this.yMax > 0){
			if (this.xMax - this.xMin < this.pixelWidth){
				var center;
				for (var i = Math.ceil(this.xMin); i <= Math.floor(this.xMax); i++){
					center = this.getPixel(new Coordinate(i, 0));
					this.drawLine(
						new Pixel(center.x, center.y - 2),
						new Pixel(center.x, center.y + 2),
						this.axisColor);
				}
			}
		}
	}

	this.drawLine = function(p1, p2, color){
		this.context.strokeStyle = color;
		this.context.beginPath();
		this.context.moveTo(p1.x + 0.5,p1.y - 0.5);
		this.context.lineTo(p2.x + 0.5,p2.y - 0.5);
		this.context.stroke();
	}

	this.drawRect = function(pTopLeft, w, h, color){
		this.context.fillStyle = color;
		this.context.fillRect(pTopLeft.x, pTopLeft.y, w, h);
	}

	this.drawCircle = function(pCenter, r, color){
		this.context.fillStyle = color;
		this.context.beginPath();
		this.context.arc(pCenter.x, pCenter.y, r, 0, Math.PI*2, true);
		this.context.closePath();
		this.context.fill();
	}

	this.add = function(input, skipSave){
		var graph = new Graph(input, calculator);
		var id = this.graphList.push(graph) - 1;
		graph.id = id
		try {
			this.draw(graph);
			this.appendToList(graph);
			if (typeof skipSave === "undefined" || !skipSave) {
				this.save();
			}
		} catch(ex){
			this.graphList.splice(id, 1);
			return true;
		}
		return false;
	}
	this.addPlot = function(plotArgs){
		var coords = new Array();
		for (var i = 0; i < plotArgs.coordArray.length; i++){
			var pair = plotArgs.coordArray[i];
			coords.push(new Coordinate(pair[0],pair[1]));
		}
		var plot = new Plot(coords, plotArgs);
		var id = this.plotList.push(plot);
		plot.id = id;
		this.drawPlot(plot);
		this.save();
	}
	this.getColor = function(id){
		var num = id % 6 + 1;
		return 'rgb(' + 225*(num & 4) + ',' +
		 				225*(num & 2) + ',' +
						225*(num & 1) + ')';
	}
	this.appendToList = function(graph){
		this.graphListDisplay.append(
			'<div class="graph-list-entry">' +
				'<a class="remove" href="javascript:void(0)" id="graph_' +
					graph.id + '">x</a>' +
				'<div class="marker" style="background-color:' +
					this.getColor(graph.id)+'">&nbsp;</div>' +
				'<div class="label">y=' +
					(graph.input.length > 0 ? graph.input : '&nbsp;') +
				'</div>' +
				'<div class="clear"></div>' +
			'</div>');	
			$('.graph-list-entry').hover(function(){
				$(this).children('.remove').show();
			}, function(){
				$(this).children('.remove').hide();
			});
		this.graphListDisplay[0].scrollTop = 
				this.graphListDisplay[0].scrollHeight;
	}
	this.draw = function(graph){
		var coord = new Coordinate(this.xMin, graph.value(this.xMin));
		var pixel = this.getPixel(coord);
		var lastPixel = pixel;
		var yMax = this.pixelHeight;
		var lastY;
		this.context.strokeStyle = this.getColor(graph.id);
		this.context.beginPath();
		this.context.moveTo(pixel.x,pixel.y);
		var MAX_DIST = 1000;
		for (var xCurr = this.xMin; xCurr <= this.xMax; xCurr += this.xStep()){
			coord = new Coordinate(xCurr, graph.value(xCurr));
			pixel = this.getPixel(coord);

			if (pixel.y < 0) {
				if (lastPixel.y < 0 || lastPixel.y > yMax) {
					// either the line from last pixel is entirely above screen or it transits
					// screen, which indicates assymptote
					this.context.moveTo(pixel.x + 0.5,Math.max(0-MAX_DIST,pixel.y));
				} else {
					// the line from last pixel starts within the screen
					this.context.lineTo(pixel.x + 0.5,Math.max(0-MAX_DIST,pixel.y));
				}
			} else if (pixel.y > yMax) {
				if (lastPixel.y < 0 || lastPixel.y > yMax) {
					this.context.moveTo(pixel.x + 0.5,Math.max(yMax+MAX_DIST,pixel.y));
				} else {
					this.context.lineTo(pixel.x + 0.5,Math.max(yMax+MAX_DIST,pixel.y));
				}
			} else {
				this.context.lineTo(pixel.x + 0.5,pixel.y - 0.5);
			}
			lastPixel = pixel;
		}
		this.context.stroke();
	}
	this.drawPlot = function(plot){
		var coords = plot.getCoords();
		var size = plot.pointSize;
		var color = plot.color;
		var p, pTopLeft, pPrev, coord;
		for (var i = 0; i < coords.length; i++){
			coord = coords[i];
			p = this.getPixel(coord);
			this.drawCircle(p, size, color);
			if (plot.line){
				if(pPrev){
					this.drawLine(pPrev, p, color);
				}
				pPrev = p;
			}
		}
	}

	this.localStorageKey = 'CALC_GRAPH_MODEL';
	this.save = function(){
		console.log("saving graph model", this.serialize())
		// Put the object into storage
		localStorage.setItem(this.localStorageKey, JSON.stringify(this.serialize()));
	};
	this.load = function(){
		// Retrieve the object from storage
		var retrievedString = localStorage.getItem(this.localStorageKey);
		if (typeof retrievedString != "undefined" && retrievedString != null){
			var retrievedObject = JSON.parse(retrievedString);
			console.log("retrieved the following history from local storage", retrievedObject);
			if (retrievedObject != null) {
				if (typeof retrievedObject['graphList'] != 'undefined'){
					for (var i = 0; i < retrievedObject['graphList'].length; i++){
						console.log("adding " + retrievedObject.graphList[i])
						this.add(retrievedObject.graphList[i], true);
					}
				}

				if (typeof retrievedObject['graphList'] != 'undefined'){
					this.updateBoundingBox(retrievedObject.boundingBox);
				}

				this.redraw();
				return true;
			}
		} else {
			console.log("no graph data found in local storage");
			return false;
		}
	};
	this.serialize = function(){
		var model = {};
		var graphs = [];
		for (var i = 0; i < this.graphList.length; i++) {
			graphs.push(this.graphList[i].input)
		}
		model['graphList'] = graphs;

		var plots = [];
		for (var i = 0; i < this.plotList.length; i++) {
			plots.push(this.plotList[i].input)
		}
		model['plotList'] = plots;

		model['boundingBox'] = {
			xMin : this.xMin,
			xMax : this.xMax,
			yMin : this.yMin,
			yMax : this.yMax
		};

		return model
	};
}

Pixel = function(x,y){
	this.x = x;
	this.y = y;
	this.toString = function(){
		return '(' + x + ',' + y + ')';
	}
}
Coordinate = function(x,y){
	this.x = x;
	this.y = y;
	this.toString = function(){
		var strX = ('' + x).substring(0,6 + (x < 0 ? 1 : 0));
		var strY = ('' + y).substring(0,6 + (y < 0 ? 1 : 0));
		return '(' + strX + ',' + strY + ')';
	}
} 

Input = function(){ 
	this.init = function(){
		var self = this;
		$('#expression-input').keypress(function(e){
			var keyCode = e.keyCode;
			if (keyCode == 13){
				return self.submit();
			} else if (keyCode == 27){
				return false;
			}
		}).keyup(function(e){
			if (e.keyCode == 27){
				$('#expression-input').val('');
			}
		}).focus(function(e){
			$('#input-container').addClass('input-container-hover');
		}).blur(function(e){
			$('#input-container').removeClass('input-container-hover');
		});
		$('#enter-button').click(function(){
			return self.submit();
		});
	};
	this.submit = function(){
		var hasError = _output.add($('#expression-input').val());
		if (!hasError){
			$('#expression-input').val('');
		}
		return false;
	}
	this.focus = function(){
		$('#expression-input').focus();
	}
	this.blur = function(){
		$('#expression-input').blur();
	}
	this.val = function(value){
		$('#expression-input').val(value);
	}
}
