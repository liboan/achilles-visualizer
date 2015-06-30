var width = 3000;
var height = 200;

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
		loadTables(data);
		a = data;
	});

}

function loadTables(data) {
	predictGraph(data.predictions);
}

function predictGraph(data) { //graph of predictions
	data.sort(function(a,b) {
		return a-b;
	});

	d3.select("body")
		.append("svg")
		.attr("id", "predictGraph")
		.attr("width", width)
		.attr("height", height);

	var chart = d3.select("#predictGraph");

	var y = d3.scale.linear()
		.domain(d3.extent(data))
		.range([height, 0]);

	scale = y;

	var barWidth = width / data.length;

	console.log(barWidth);

	chart.selectAll("rect")
		.data(data)
		.enter()
		.append("rect")
		.attr("x", function (d, i) {
			console.log(d);
			return i * barWidth;
		})
		.attr("width", function () {
			return barWidth-2;
		})
		.attr("y", function (d) {
			return y(Math.max(0, d)); //return lesser of two values- negative values start at y = 0.
		})
		.attr("height", function (d) {
			return Math.abs(y(d) - y(0)); //distance from zero
		});

	//y = 0 at svg y-coordinate 100
	//for now, have chart y-axis range from -10 to +10


}