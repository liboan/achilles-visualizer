//setup function, checks for load
(function () {
    if (window.addEventListener) {
        window.addEventListener('DOMContentLoaded', setup, false);
    } else {
        window.attachEvent('onload', setup);
    }
} ());

var a;

var scale;

function setup() {
	sort = 0;
	zoom = 2;
	$.getJSON("/json", function (data) {
		//cut down data to top few features
		var slice = Math.min(30, data.cellline.length);
		data.features = data.features.slice(0, slice);


		//get filtering options
		filterOptions = [""];
		for (var i = 0; i < data.cellline.length; i++) {
			entry = data.cellline[i];
			option = entry.substring(entry.indexOf("_") + 1);
			if (filterOptions.indexOf(option) == -1) {
				filterOptions.push(option);
			}
		}
		filterOptions.sort();


		//setup UI 
		d3.select("body")
			.append("div")
			.attr("id", "UI")
			.style("left", "0px")
			.style("top", "0px")
			.style("padding","10px")
			.style("width", "100%")
			.style("background-color", "white")
			.style("z-index", 2)
			.style("position","fixed");

		var ui = d3.select("#UI");

		ui.append("input")
			.attr("type", "button")
			.attr("value", "Zoom in")
			.on("click", function () {
				zoom = Math.min(zoom+1,20);
				loadGraphs(data,sort,zoom,filterOptions[selectMenu.property("selectedIndex")]);
			});

		ui.append("input")
			.attr("type", "button")
			.attr("value", "Zoom out")
			.on("click", function () {
				zoom = Math.max(zoom-1,2);
				loadGraphs(data,sort,zoom,filterOptions[selectMenu.property("selectedIndex")]);
			});

		ui.append("span")
			.style("font-family", "Arial")
			.text("  Filter by cell lineage: ")

		var selectMenu = ui.append("select")
			.attr("id", "filter")
			.attr("value","NONE")
			.on("change", function () {
				loadGraphs(data, 0, zoom, filterOptions[selectMenu.property("selectedIndex")]);
			});

		d3.select("#filter")
			.selectAll("option")
			.data(filterOptions)
			.enter()
			.append("option")
			.text(function (d) {
				return d;
			});


		loadGraphs(data, 0, zoom, "");
		a = data;

		
	});

}

function loadGraphs(data, sort, zoom, filter) {
	
	include = [];
	for (var i = 0; i < data.cellline.length; i++) {
		// console.log(data.cellline[i] + " " + data.cellline[i].indexOf(filter));
		if (data.cellline[i].indexOf(filter) !== -1) {
			include.push(i);			
		}
	}

	d3.select("#graphWindow").remove();

	d3.select("body") //add area for cell line graphs
		.append("div")
		.attr("id", "graphWindow")

	
	targetGraph(data, sort, zoom, include);
	for (var i = 0; i < 30; i++) {
		//data.features[i].values = zScore(data.features[i].values);
		featureGraph(data, i, sort, zoom, include);
	}
	mutationHist(data, 14, include);
}

function targetGraph(input, sort, zoom, include) { //graph of targets & predictions. sort controls what index to sort by, zoom controls width of graph
												   //include lists indexes of things that are not filtered out	
	arrays = [[],[],[]]; //array of three arrays, cellline, predictions, and targets 
	for (var i = 0; i < include.length; i++) {
		arrays[0].push(input.cellline[include[i]]);
		arrays[1].push(input.predictions[include[i]]);
		arrays[2].push(input.target[include[i]]);
	}
	//arrays = [input.cellline, input.predictions, input.target]; //the only ones we care about. 

	
	//graph size
	var zoom = Math.max(2, Math.min(zoom, 20));

	zoom = zoom * Math.min(10, Math.floor(430/include.length));  //increase zoom effect if fewer elements are displayed

	var width = arrays[0].length * zoom;
	var height = 200;
	var topPadding = 40;
	var leftPadding = 50;

	//merge three arrays into one
	var data = []; //empty matrix. 0 = lineages, 1 = predictions, 2 = targets
	for (var i = 0; i < arrays[0].length; i++) {
		data.push([arrays[0][i],arrays[1][i],arrays[2][i]]); 
	};

	//sorting data
	if (sort !== "ALL") { //sorting by cell line lineage: chop off the first part of the string
		data.sort(function (a, b) {
			a1 = a[0].substring(a[0].indexOf("_") + 1);
			b1 = b[0].substring(b[0].indexOf("_") + 1);
			
			if (a1 < b1) return -1;
			else if (a1 === b1) return 0;
			else return 1;

		});
	}
	else {
		data.sort(function (a, b) {
			return a[sort] - b[sort];
		});
	}

	d3.select("#targetGraph").remove(); //clear contents first

	d3.select("#graphWindow") //add graph body
		.append("div")
		.attr("id","targetGraph")
		.style("border-bottom", "2px solid black")
		.style("padding-top", "40px")
		.style("z-index",1)
		//.style("position", "fixed") //broken at the moment, targetGraph can't scroll 
		.style("background-color", "white")
		.append("div")
		.attr("id", "targetGraphWrapper")
		.append("svg")
		.style("pointer-events", "all")
		.attr("width", width + 300)
		.attr("height", height);

	// d3.select("#graphWindow") //broken at the moment, targetGraph can't scroll 
	// 	.append("div")
	// 	.attr("id", "underneath")
	// 	.style("height", ($("#UI").height() + $("#targetGraph").height() + 40) + "px")

	var chart = d3.select("#targetGraph svg");

	var extent = [Math.min(d3.extent(arrays[1])[0], d3.extent(arrays[2])[0]),
				  Math.max(d3.extent(arrays[1])[1], d3.extent(arrays[2])[1])]; //find the minimum and maximum in combined targets & predictions

	var y = d3.scale.linear() //set up scale
		.domain(extent)
		.range([height, topPadding]);

	var yAxis = d3.svg.axis() //set up y-axis
		.scale(y)
		.orient("left")
		.ticks(5);

	chart.append("g")
		.attr("transform", "translate(" + leftPadding + ",0)")
		.call(yAxis)
		.selectAll("path")
		.style("stroke-width", "1px")
		.style("stroke","black")
		.style("fill","none")
		.selectAll("line")
		.style("stroke","black");

	chart.append("text") //set up title
		.attr("x", width/2)
		.attr("y", 20)
		.text("Targets & Predictions")
		.style("font-family", "Arial")
		.attr("text-anchor", "middle");

	var barWidth = Math.floor(width / data.length);

	chart.selectAll("rect") // targets in rectangles
		.data(data)
		.enter()
		.append("rect")
		.attr("x", function (d, i) {
			return i * barWidth + leftPadding;
		})
		.attr("width", function () {
			return barWidth-1;
		})
		.attr("y", function (d) {
			return y(Math.max(0, d[2])); //return lesser of two values- negative values start at y = 0.
		})
		.attr("height", function (d) {
			return Math.abs(y(d[2]) - y(0)); //distance from zero
		})
		.style("fill", "gray");

	var line = d3.svg.line() // predictions in line
		.x(function (d, i) {
			return barWidth/2 + barWidth * i + leftPadding;
		})
		.y(function (d) {
			return y(d[1]);
		})
		.interpolate("linear");
	var lineGraph = chart.append("path")
		.attr("d", line(data))
		.attr("stroke","blue")
		.attr("stroke-width",2)
		.attr("fill", "none");

	var tooltip = chart.append("g")
		.attr("class", "tooltip")
		.style("visibility", "hidden");

	d3.select("#targetGraph").on("mouseover", function() { //display tooltip upon mouseover
		var index = Math.floor((event.pageX - leftPadding) / barWidth);

		tooltip.style("visibility", "visible");

			
		tooltip.selectAll("*").remove(); //clean up tooltip


		//var mouseX = event.pageX - boundingRect.left; 

		var scrollX = $("#graphWindow").scrollLeft();

		var cornerX = event.pageX + scrollX;
		var cornerY = topPadding;

		var width = 0;

		d3.selectAll("#targetGraph" + " rect") //darken rectangle only when moused over
			.each(function (d, i) {
				if (i === index) {
					d3.select(this).style("fill", "black");
				}
			});

		tooltip.append("text")
			.attr("x", cornerX + 10)
			.attr("y", cornerY + 15)
			.text("Cell Line: " + data[index][0])
			.each(function() {
				width = this.getBBox().width;
			});

		tooltip.append("text")
			.attr("x", cornerX + 10)
			.attr("y", cornerY + 30)
			.text("Prediction: " + data[index][1]);

		tooltip.append("text")
			.attr("x", cornerX + 10)
			.attr("y", cornerY + 45)
			.text("Target: " + data[index][2]);

		tooltip.selectAll("text")
			.style("font-size", "12px")
			.style("font-family", "arial");

		tooltip.insert("rect", "text")
			.attr("width", Math.max(240, width))
			.attr("height", 55)
			.attr("x", cornerX)
			.attr("y", cornerY)
			.style("stroke", "red")
			.style("fill", "white");

	})
	.on("mouseout", function () {
		tooltip.style("visibility", "hidden");
		d3.selectAll("#targetGraph" + " rect") //darken rectangle only when moused over
			.each(function (d, i) {
				d3.select(this).style("fill", "gray");
			});
	});

}

function featureGraph(input, featureIndex, sort, zoom, include) { //include lists indexes of things that are filtered out	
	//arrays = [input.cellline, input.features[featureIndex].values]; //the only ones we care about. 
	featureName = input.features[featureIndex].name;
	//console.log(arrays[1].length + " " + featureName);

	arrays = [[],[]]; //array of two arrays, cellline, VALUE 
	for (var i = 0; i < include.length; i++) {
		arrays[0].push(input.cellline[include[i]]);
		arrays[1].push(input.features[featureIndex].values[include[i]]);
	}

	//graph size
	var zoom = Math.max(2, Math.min(zoom, 20));

	zoom = zoom * Math.min(10, Math.floor(430/include.length));  //increase zoom effect if fewer elements are displayed

	var width = arrays[0].length * zoom;
	var height = 200;
	var topPadding = 40;
	var leftPadding = 50;



	//merge two arrays into one
	var data = []; //empty matrix. 0 = lineages, 1 = predictions, 2 = targets
	for (var i = 0; i < arrays[0].length; i++) {
		data.push([arrays[0][i],arrays[1][i]]); 
	};

	//sorting data
	if (sort == 0) { //sorting by cell line lineage: chop off the first part of the string
		data.sort(function (a, b) {
			a1 = a[0].substring(a[0].indexOf("_") + 1);
			b1 = b[0].substring(b[0].indexOf("_") + 1);
			
			if (a1 < b1) return -1;
			else if (a1 === b1) return 0;
			else return 1;

		});
	}
	else {
		data.sort(function (a, b) {
			return a[sort] - b[sort];
		});
	}

	d3.select("#f" + featureIndex).remove(); //clear contents first

	d3.select("#graphWindow") //add graph body
		.append("div")
		.attr("id","f" + featureIndex)
		.append("div")
		.attr("id","f" + featureIndex + "Wrapper")
		.append("svg")
		.attr("width", width + 300)
		.attr("height", height);

	d3.select("#f" + featureIndex)
		.append("input")
		.attr("type","button")
		.attr("value","Show/hide scatter plot or mutation plot")
		.on("click", function () {
			$("#f" + featureIndex + "scatter").toggle();
		});

	var chart = d3.select("#f" + featureIndex + " svg");

	var extent = d3.extent(arrays[1]);

	var y = d3.scale.linear() //set up scale
		.domain(extent)
		.range([height, topPadding]);

	var yAxis = d3.svg.axis() //set up y-axis
		.scale(y)
		.orient("left")
		.ticks(5);

	chart.append("g")
		.attr("transform", "translate(" + leftPadding + ",0)")
		.call(yAxis)
		.selectAll("path")
		.style("stroke-width", "1px")
		.style("stroke","black")
		.style("fill","none");

	chart.append("text") //set up title
		.attr("x", width/2)
		.attr("y", 20)
		.text(input.features[featureIndex].name)
		.style("font-family", "Arial")
		.attr("text-anchor", "middle");

	var barWidth = Math.floor(width / data.length);

	chart.selectAll("rect") // targets in rectangles
		.data(data)
		.enter()
		.append("rect")
		.attr("x", function (d, i) {
			return i * barWidth + leftPadding;
		})
		.attr("width", function () {
			return barWidth-1;
		})
		.attr("y", function (d) {
			return y(Math.max(0, d[1])); //return lesser of two values- negative values start at y = 0.
		})
		.attr("height", function (d) {
			return Math.abs(y(d[1]) - y(0)); //distance from zero
		})
		.style("fill", "gray");

	//tooltip
	var tooltip = chart.append("g")
		.attr("class", "tooltip")
		.style("visibility", "hidden");


	//console.log(chart.select(".tooltip"));


	chart.on("mouseover", function() { //display tooltip upon mouseover
		//console.log(featureIndex);
		var index = Math.floor((event.pageX - leftPadding) / barWidth);

		//console.log(featureIndex);
		//	console.log(tooltip);

		tooltip.style("visibility", "visible");

			
		tooltip.selectAll("*").remove(); //clean up tooltip


		var scrollX = $("#graphWindow").scrollLeft();
		var scrollY = $(document).scrollTop();

		var cornerX = event.pageX + scrollX;
		var cornerY = topPadding;

		var width = 0;	

		d3.selectAll("#f" + featureIndex + " rect") //darken rectangle only when moused over
			.each(function (d, i) {
				if (i === index) {
					d3.select(this).style("fill", "black");
				}
			});

		tooltip.append("text")
			.attr("x", cornerX + 10)
			.attr("y", cornerY + 15)
			.text("Cell Line: " + data[index][0])
			.each(function() {
				width = this.getBBox().width;
			});

		tooltip.append("text")
			.attr("x", cornerX + 10)
			.attr("y", cornerY + 30)
			.text("Value: " + data[index][1]);

		tooltip.selectAll("text")
			.style("font-size", "12px")
			.style("font-family", "arial");

		tooltip.insert("rect", "text")
			.attr("width", Math.max(200, width))
			.attr("height", 40)
			.attr("x", cornerX)
			.attr("y", cornerY)
			.style("stroke", "red")
			.style("fill", "white");

	})
	.on("mouseout", function () {
		tooltip.style("visibility", "hidden");
		d3.selectAll("#f" + featureIndex + " rect") //darken rectangle only when moused over
			.each(function (d, i) {
				d3.select(this).style("fill", "gray");
			});
	});

	if (/^.MUT/.exec(featureName)) { //check if feature is a mutation
		mutationHist(input, featureIndex, include);
	}
	else {	
		featureScatter(input, featureIndex, include); //finally, call the scatter
	}
}

function featureScatter(input, featureIndex, include) { //scatterplot of feature values (x) vs. predictions (y)
	featureName = input.features[featureIndex].name;

	arrays = [[],[], []]; //array of two arrays, feature values, predictions, targets
	for (var i = 0; i < include.length; i++) {
		arrays[0].push(input.features[featureIndex].values[include[i]]);
		arrays[1].push(input.predictions[include[i]]);
		arrays[2].push(input.target[include[i]]);
	}

	//merge two arrays into one
	var data = []; //empty matrix. 0 = feature values, 1 = predictions
	for (var i = 0; i < arrays[0].length; i++) {
		data.push([arrays[0][i],arrays[1][i]]); 
	};

	var width = 500;
	var height = 500;

	var leftPadding = 50;
	var topPadding = 50;

	d3.select("#f" + featureIndex + "scatter").remove();

	d3.select("#f" + featureIndex)
		.append("div")
		.style("display","none")
		.attr("id", "f" + featureIndex + "scatter")
		.append("svg") //add graph window
		.attr("width", width)
		.attr("height", height);

	var scatter = d3.select("#f" + featureIndex + "scatter svg");

	var x = d3.scale.linear()
		.domain(d3.extent(arrays[0]))
		.range([leftPadding, width - leftPadding]);

	var xAxis = d3.svg.axis() //set up x-axis
		.scale(x)
		.orient("bottom")
		.ticks(5);

	scatter.append("g") //add x-axis
		.attr("transform", "translate(0," + (height - topPadding) + ")")
		.call(xAxis)
		.selectAll("path")
		.style("stroke-width", "1px")
		.style("stroke","black")
		.style("fill","none");

	var y = d3.scale.linear() //set up Y scale
		.domain(d3.extent(arrays[1]))
		.range([height - topPadding, topPadding]);

	var yAxis = d3.svg.axis() //set up y-axis
		.scale(y)
		.orient("left")
		.ticks(5);

	scatter.append("g") //add y-axis
		.attr("transform", "translate(" + leftPadding + ",0)")
		.call(yAxis)
		.selectAll("path")
		.style("stroke-width", "1px")
		.style("stroke","black")
		.style("fill","none");

	scatter.append("text") //x-axis label
		.attr("x", width/2)
		.attr("y", height - topPadding + 40)
		.style("font-family", "Arial")
		.attr("text-anchor", "middle")
		.text(featureName);

	scatter.append("text") //y-axis label
		.attr("x", leftPadding - 30)
		.attr("y", height/2)
		.style("font-family", "Arial")
		.attr("transform", "rotate(270 " + (leftPadding - 30) + "," + (height/2) + ")")
		.attr("text-anchor", "middle")
		.text("Predictions");

	scatter.selectAll("circle")
		.data(data)
		.enter()
		.append("circle")
		.attr("r", 2)
		.attr("cx", function (d) {
			return x(d[0]);
		})
		.attr("cy", function (d) {
			return y(d[1]);
		})
		.style("fill", "none")
		.style("stroke", "red");
}

function mutationHist(input, featureIndex, include) { //box & whisker histogram of present mutations
	var data = []; //empty matrix. 0 = cellline, 1 = mutation value, 2 = prediction value, 3 = mutation locations (to be filled later)
	for (var i = 0; i < include.length; i++) { 
		data.push([input.cellline[include[i]], input.features[featureIndex].values[include[i]], input.predictions[include[i]], []]);
		for (var j = 0; j < input.mutations.length; j++) {
			//console.log(data[i][0] + " " + input.mutations[j].cellline);
			if (data[i][0] === input.mutations[j].cellline) { //check to see if cell line has a mutation, and if so, add location
				//console.log(j + " " + input.mutations[j].mutations);
				data[i][3] = data[i][3].concat(input.mutations[j].mutations);
				//console.log(data[i][3]);
			}
		};
		//console.log(data[i]);

	};
	console.log(data);

	var buckets = [[],[],[]]; //prediction values fall into either 0, 1, or 2, depending on cell line mutation

	for (var i = 0; i < data.length; i++) {
		buckets[data[i][1]].push(data[i][2]);
	};

	console.log(buckets);

	var width = 500;
	var height = 500;

	var leftPadding = 50;
	var topPadding = 50;

	d3.select("#f" + featureIndex + "scatter").remove(); //clear div and set up

	d3.select("#f" + featureIndex)
		.append("div")
		.style("display","none")
		.attr("id", "f" + featureIndex + "scatter")
		.append("svg") //add graph window
		.attr("width", width)
		.attr("height", height);

	var scatter = d3.select("#f" + featureIndex + "scatter svg");



}