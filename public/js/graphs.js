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
	$.getJSON("/json", function (data) {
		console.log(data);
		loadGraphs(data);
		a = data;
	});

}

function loadGraphs(data) {
	targetGraph([data.cellline, data.predictions, data.target],0,2);
}

function targetGraph(arrays, sort, zoom) { //graph of targets & predictions. sort controls what index to sort by, zoom controls width of graph
	zoom = Math.max(2, Math.min(zoom, 20));

	//graph size
	var width = arrays[0].length * zoom;
	var height = 200;
	//merge three arrays into one
	var data = []; //empty matrix. 0 = names, 1 = predictions, 2 = targets
	for (var i = 0; i < arrays[0].length; i++) {
		data.push([arrays[0][i],arrays[1][i],arrays[2][i]]); 
	};

	//sorting data
	if (sort == 0) { //sorting by cell line names: do nothing
		
	}
	else {
		data.sort(function (a, b) {
			return a[sort] - b[sort];
		});
	}

	d3.select("#targetGraph").remove(); //clear contents first

	d3.select("body") //add graph body
		.append("div")
		.attr("id","targetGraph")
		.append("div")
		.attr("id", "targetGraphWrapper")
		.style("overflow-x","auto")
		.append("svg")
		.attr("width", width)
		.attr("height", height);

	//add UI stuff

	d3.select("#targetGraph")
		.append("input")
		.attr("type", "button")
		.attr("value", "Zoom in")
		.on("click", function () {
			targetGraph(arrays, sort, zoom+1);
		});

	d3.select("#targetGraph")
		.append("input")
		.attr("type", "button")
		.attr("value", "Zoom out")
		.on("click", function () {
			targetGraph(arrays, sort, zoom-1);
		});

	d3.select("#targetGraph")
		.append("input")
		.attr("type", "button")
		.attr("value", "Sort by name")
		.on("click", function () {
			targetGraph(arrays, 0, zoom);
		});

	d3.select("#targetGraph")
		.append("input")
		.attr("type", "button")
		.attr("value", "Sort by prediction")
		.on("click", function () {
			targetGraph(arrays, 1, zoom);
		});

	d3.select("#targetGraph")
		.append("input")
		.attr("type", "button")
		.attr("value", "Sort by target")
		.on("click", function () {
			targetGraph(arrays, 2, zoom);
		});

	var chart = d3.select("#targetGraph svg");

	var extent = [Math.min(d3.extent(arrays[1])[0], d3.extent(arrays[2])[0]),
				  Math.max(d3.extent(arrays[1])[1], d3.extent(arrays[2])[1])]; //find the minimum and maximum in combined targets & predictions

	var y = d3.scale.linear() //set up scale
		.domain(d3.extent(extent))
		.range([height, 0]);

	var yAxis = d3.svg.axis() //set up y-axis
		.scale(y)
		.orient("left")
		.ticks(5);

	chart.append("g")
		.call(yAxis);


	scale = y;

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
		});

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
		.style("visibility", "hidden");


	chart.on("mouseover", function() { //display tooltip upon mouseover
		var index = Math.floor(event.pageX / barWidth);

		tooltip.style("visibility", "visible");

			
		tooltip.selectAll("*").remove(); //clean up tooltip

		var scrollX = $("#targetGraphWrapper").scrollLeft();

		var cornerX = event.pageX + scrollX;
		var cornerY = event.pageY;

		var width = 0;

		tooltip.append("text")
			.attr("x", cornerX + 10)
			.attr("y", cornerY + 20)
			.text("Cell Line: " + data[index][0])
			.each(function() {
				width = this.getBBox().width;
			});

		tooltip.append("text")
			.attr("x", cornerX + 10)
			.attr("y", cornerY + 40)
			.text("Prediction: " + data[index][1]);

		tooltip.append("text")
			.attr("x", cornerX + 10)
			.attr("y", cornerY + 60)
			.text("Target: " + data[index][2]);

		tooltip.selectAll("text")
			.style("font-family", "arial");

		tooltip.insert("rect", "text")
			.attr("width", Math.max(240, width + 40))
			.attr("height", 70)
			.attr("x", cornerX)
			.attr("y", cornerY)
			.style("stroke", "red")
			.style("fill", "white");

	})
	.on("mouseout", function () {
		tooltip.style("visibility", "hidden");
	});

	//y = 0 at svg y-coordinate 100
	//for now, have chart y-axis range from -10 to +10


}