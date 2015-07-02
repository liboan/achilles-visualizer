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
		//get filtering options
		filterOptions = ["ALL"];
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

		d3.select("#UI")
			.append("input")
			.attr("type", "button")
			.attr("value", "Zoom in")
			.on("click", function () {
				zoom = Math.min(zoom+1,20);
				loadGraphs(data,sort,zoom,0);
			});

		d3.select("#UI")
			.append("input")
			.attr("type", "button")
			.attr("value", "Zoom out")
			.on("click", function () {
				zoom = Math.max(zoom-1,2);
				loadGraphs(data,sort,zoom,0);
			});

		var selectMenu = d3.select("#UI")
			.append("select")
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

		var featureMenu = d3.select("#UI")
			.append("select")
			.attr("id", "features")
			.attr("Value", "NONE");

		d3.select("#features")
			.selectAll("option")
			.data(data.features)
			.enter()
			.append("option")
			.text(function (d) {
				return d.name;
			});



		loadGraphs(data, 0, zoom, 0);
		a = data;

		
	});

}

function loadGraphs(data, sort, zoom, filter) {
	

	if (filter !== 0) {
		for (var i = 0; i < data.cellline.length; i++) {
			// console.log(data.cellline[i] + " " + data.cellline[i].indexOf(filter));
			if (data.cellline[i].indexOf(filter) === -1) {
				
			}
		}
	}


	d3.select("#graphWindow").remove();

	d3.select("body")
		.append("div")
		.attr("id", "graphWindow")
		.attr("overflow-x", "auto");
	
	targetGraph(data, sort, zoom, 0);
	for (var i = 0; i < 100; i++) {
		featureGraph(data, i, sort, zoom, 0);
	}
}

function targetGraph(input, sort, zoom, exclude) { //graph of targets & predictions. sort controls what index to sort by, zoom controls width of graph
												   //exclude lists indexes of things that are filtered out	
	arrays = [input.cellline, input.predictions, input.target]; //the only ones we care about. 

	//graph size
	var zoom = Math.max(2, Math.min(zoom, 20));
	var width = input.cellline.length * zoom;
	var height = 200;
	var topPadding = 40;

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
		.append("div")
		.attr("id", "targetGraphWrapper")
		.append("svg")
		.style("pointer-events", "all")
		.attr("width", width + 200)
		.attr("height", height);

	//add UI stuff



	var chart = d3.select("#targetGraph svg");

	var extent = [Math.min(d3.extent(arrays[1])[0], d3.extent(arrays[2])[0]),
				  Math.max(d3.extent(arrays[1])[1], d3.extent(arrays[2])[1])]; //find the minimum and maximum in combined targets & predictions

	var y = d3.scale.linear() //set up scale
		.domain(d3.extent(extent))
		.range([height, topPadding-15]);

	var yAxis = d3.svg.axis() //set up y-axis
		.scale(y)
		.orient("left")
		.ticks(5);

	chart.append("g")
		.call(yAxis);

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
			return i * barWidth;
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
			return barWidth/2 + barWidth * i;
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

	d3.select("#targetGraphWrapper").on("mouseover", function() { //display tooltip upon mouseover
		var index = Math.floor(event.pageX / barWidth);

		tooltip.style("visibility", "visible");

			
		tooltip.selectAll("*").remove(); //clean up tooltip


		//var mouseX = event.pageX - boundingRect.left; 

		var scrollX = $("#graphWindow").scrollLeft();

		var cornerX = event.pageX + scrollX;
		var cornerY = event.pageY;

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

function featureGraph(input, featureIndex, sort, zoom, filter) { //exclude lists indexes of things that are filtered out	
	arrays = [input.cellline, input.features[featureIndex].values]; //the only ones we care about. 
	//featureName = input.features[featureIndex].name;
	//console.log(arrays[1].length + " " + featureName);
	//graph size
	var zoom = Math.max(2, Math.min(zoom, 20));
	var width = input.cellline.length * zoom;
	var height = 200;
	var topPadding = 40;

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
		.attr("id","f" + featureIndex.toString())
		.append("div")
		.attr("id","f" + featureIndex+ "Wrapper")
		.append("svg")
		.attr("width", width + 200)
		.attr("height", height);

	var chart = d3.select("#f" + featureIndex + " svg");

	var y = d3.scale.linear() //set up scale
		.domain(d3.extent(arrays[1]))
		.range([height, topPadding-15]);

	var yAxis = d3.svg.axis() //set up y-axis
		.scale(y)
		.orient("left")
		.ticks(5);

	chart.append("g")
		.call(yAxis);

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
			return i * barWidth;
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
		var index = Math.floor(event.pageX / barWidth);

		//console.log(featureIndex);
		//	console.log(tooltip);

		tooltip.style("visibility", "visible");

			
		tooltip.selectAll("*").remove(); //clean up tooltip


		var scrollX = $("#graphWindow").scrollLeft();
		var scrollY = $(document).scrollTop();

		var cornerX = event.pageX + scrollX;
		var cornerY = (event.pageY + scrollY) % 200;

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

}