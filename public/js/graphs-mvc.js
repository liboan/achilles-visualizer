//setup function, checks for load
(function () {
    if (window.addEventListener) {
        window.addEventListener('DOMContentLoaded', getData, false);
    } else {
        window.attachEvent('onload', getData);
    }
} ());

function getData() {
    $.getJSON("/json", function (data) {
        setup(data);
    });
}


//debug vars
var a;

function setup(data) {
    //////MODEL//////

    data.features = data.features.slice(0,30); //keep only the top features

    a = data; //for debugging purposes

    //initialize other model variables
    var indices = []; //for sorting and filtering
    for (var i = 0; i < data.cellline.length; i++) {
        indices.push(i);
    };

    var zoom = 1;
    var zScoreState = false;

  



    //////CONTROLLER//////

    function filter(lineage) { // lineage = string from filterOptions, contained by some cell line names
        indices = []; //fresh start for filtering.

        for (var i = 0; i < data.cellline.length; i++) { //check each cell line name for lineage string
            if (data.cellline[i].indexOf(lineage) !== -1) {
                indices.push(i);
            }
        };
        return indices; //problem with side effects- modifying indices in big scope while returning it at the same time
    }

    function sort(item) { //item = int specifying what to sort by. 0 = cell line lineage, 1 = predictions, 2 = target
        switch (item) {
            case 0: //cell line lineage
                indices.sort(function (a, b) { //comparing two indices.
                    var aString = data.cellline[a];
                    var bString = data.cellline[b];

                    var aLineage = aString.substring(aString.indexOf("_") + 1); //to sort by lineage, chop off stuff up to first underscore
                    var bLineage = bString.substring(bString.indexOf("_") + 1); 

                    if (aLineage < bLineage) return -1;
                    else if (aLineage > bLineage) return 1;
                    else return 0;

                });
                break;

            case 1: //predictions
                indices.sort(function (a, b) {
                    if (data.predictions[a] < data.predictions[b]) return -1;
                    else if (data.predictions[a] > data.predictions[b]) return 1;
                    else return 0; 
                });
                break;

            case 2: //target
                indices.sort(function (a, b) {
                    if (data.target[a] < data.target[b]) return -1;
                    else if (data.target[a] > data.target[b]) return 1;
                    else return 0; 
                });
                break;
        }
        return indices;
    }

    //for testing & debugging
    // sort(2);
    // filter("BREAST");
    // sort(1);


    //////VIEW//////

    /*  Terminology:
        Graphs = bar/line graphs of cell lines vs. values
        Scatters = scatterplots of feature values vs. prediction/target values
    */


    var graphHeight = 80;
    var leftWidth = 300;
    var graphLeftPadding = 30;
    var scatterHeight = 500;
    var scatterWidth = 500;
    var scatterLeftPadding = 50;
    var scatterTopPadding = 50;

    //get filtering options. 
    filterOptions = [""];
    for (var i = 0; i < data.cellline.length; i++) {
        entry = data.cellline[i];
        option = entry.substring(entry.indexOf("_") + 1);
        if (filterOptions.indexOf(option) == -1) {
            filterOptions.push(option);
        }
    }
    filterOptions.sort();

    function initWindow() {
        d3.select("body")
            .append("div")
            .attr("id","graphWindow")
            .style("overflow-x","auto");

        initFeatureWindows(); //add features first in order to prevent counting problem
        initTargetWindow();

        updateGraph("target");
        for (var i = 0; i < data.features.length; i++) {
            updateGraph(i);
        };
    }

    function initTargetWindow() { //special: target/prediction graph as well as experimental information, UI controls
        var targetWindow = d3.select("#graphWindow")
            .insert("div","div")
            .attr("id", "target");

        targetWindow.append("div")
            .style("width",leftWidth + "px")
            .style("display","inline-block")
            .style("margin-bottom", "10px")
            .style("font-family", "Arial")
            //.attr("class", "left")
            .attr("id", "targetLeft")
            .append("div")
            .attr("class", "title")
            .style("margin-bottom", "2px")
            .text("GS_SMARCA2");

        d3.select("#targetLeft").selectAll("div .summary")
            .data(data.report_summary)
            .enter()
            .append("div")
            .attr("class", "summary")
            .text(function (d) {
                return d;
            });

        targetWindow.append("svg")
            .style("vertical-align", "top")
            .attr("id", "targetGraph")
            .attr("height", graphHeight);

    }

    function initFeatureWindows () { //reads data and adds in feature windows accordingly
        var featureWindows = d3.select("#graphWindow")
            .selectAll("div")
            .data(data.features)
            .enter()
            .append("div")
            .attr("id", function (d, i) {
                return "f" + i;
            });

        var lefts = featureWindows.append("div")
            .style("width",leftWidth + "px")
            .style("display","inline-block")
            .style("margin-bottom", "10px")            
            .text(function (d) {
                return d.name;
            })
            .attr("class", "left")
            .attr("id", function (d, i) {
                return "f" + i + "Left";
            });

        lefts.append("br");

        lefts.append("div") //importance
            .text(function (d) {
                return d.importance;
            })
            .style("padding-top", "10px")
            .style("padding-bottom", "10px")
            .style("margin", "8px")
            .style("width", function (d) {
                console.log(leftWidth * d.importance);
                return Math.floor(leftWidth * d.importance) + "px";
            })
            .style("background-color", "red")
            .style("display", "inline-block");

        lefts.append("br");

        var graphs = featureWindows.append("svg")
            .style("vertical-align", "top")
            .attr("id", function (d, i) {
                return "f" + i + "Graph";
            })
            .attr("width", 400)
            .attr("height", graphHeight);

        var predictionScatters = featureWindows.append("div")
            .attr("class", "details")
            .append("svg")
            .attr("class", "predictionScatter")
            .attr("id", function (d, i) {
                return "f" + i + "pScatter";
            })
            .attr("width", scatterHeight)
            .attr("height", scatterWidth);

        var targetScatters = d3.selectAll(".details")
            .append("svg")
            .attr("class", "targetScatter")
            .attr("id", function (d, i) {
                return "f" + i + "tScatter";
            })
            .attr("width", scatterHeight)
            .attr("height", scatterWidth);

    }

    function updateGraph (id) { //id = string or int used to access an svg graph. "target" for target/prediction graph, an int for feature
        var min = 10000, max = -10000; //find extent of data
        for (var i = 0; i < indices.length; i++) {
            if (id === "target") { //if target, make sure to check both target & prediction value among indices
                min = Math.min(min, data.target[indices[i]], data.predictions[indices[i]]);
                max = Math.max(max, data.target[indices[i]], data.predictions[indices[i]]);
            }
            else {
                min = Math.min(min, data.features[id].values[indices[i]]);
                max = Math.max(max, data.features[id].values[indices[i]]);
            }
        };


        var graph = d3.select("#f" + id + "Graph");
        if (id === "target") { //special case :P
            graph = d3.select("#targetGraph");
        }

        graph.selectAll("*").remove(); //clear previous contents

        var barWidth = Math.pow(zoom, 2) + 1;
        var graphWidth = barWidth * indices.length + graphLeftPadding; //zoom = width of bars in pixels

        graph.attr("width", graphWidth);

        var wrapWindow; //div that wraps all of the pertinent visuals, must be expanded 
        if (typeof id === "number") {
            wrapWindow = d3.select("#f" + id);
        }
        else {
            wrapWindow = d3.select("#target");
        }

        wrapWindow.style("width", (graphWidth + 500) + "px" );

        var y = d3.scale.linear() //set up scale
            .domain([min,max])
            .range([graphHeight, 0]);

        var yAxis = d3.svg.axis() //set up y-axis
            .scale(y)
            .orient("left")
            .ticks(5);

        graph.append("g") //add axis to svg
            .attr("transform", "translate(" + graphLeftPadding + ",0)")
            .call(yAxis)
            .selectAll("path")
            .style("stroke-width", "1px")
            .style("stroke","black")
            .style("fill","none");


        if (id === "target") { 
            graph.selectAll("rect")
                .data(indices) //bind indices and use them to access pertinent values from data object
                .enter()
                .append("rect")
                .attr("fill", "red")
                .attr("x", function (d, i) {
                    return i * barWidth + graphLeftPadding;
                })
                .attr("width", function (d, i) {
                    return barWidth;
                })
                .attr("y", function (d) {
                    return y(Math.max(0, data.target[d]));
                })
                .attr("height", function (d) {
                    return Math.abs(y(0) - y(data.target[d]));
                });

            var line = d3.svg.line()
                .x(function (d, i) {
                    return i * barWidth + barWidth/2 + graphLeftPadding
                })
                .y(function (d, i) {
                    return y(data.predictions[d]);
                })
                .interpolate("linear");

            graph.append("path")
                .attr("d", line(indices))
                .attr("stroke","darkgreen")
                .attr("stroke-width",2)
                .attr("fill", "none");                

        }
        else {
            graph.selectAll("rect")
                .data(indices) //bind indices and use them to access pertinent values from data object
                .enter()
                .append("rect")
                .attr("fill", "lightgray")
                .attr("x", function (d, i) {
                    return i * barWidth + graphLeftPadding;
                })
                .attr("width", function (d, i) {
                    return barWidth;
                })
                .attr("y", function (d) {
                    return y(Math.max(0, data.features[id].values[d]));
                })
                .attr("height", function (d) {
                    return Math.abs(y(0) - y(data.features[id].values[d]));
                });
        }

        if (typeof id === "number") {    
            if (/^.MUT/.exec(data.features[id].name)) { //if it's a mutation, draw box plot instead
                    updateBoxPlot(id, "p");
                    updateBoxPlot(id, "t");
                }
                else {
                    updateScatter(id, "p");
                    updateScatter(id, "t");
                }
    
            }
    }

    function updateScatter(id, type) {  //fill in scatter of feature value (x) vs. prediction & target (y)
                                        //id = int, index of feature. type = string, "p" = prediction, "t" = target    
        var xMin = Infinity, xMax = -Infinity; //find extent of data
        var yMin = Infinity, yMax = -Infinity;

        var output; //depending on type, either data.predictions or data.target. Makes stuff simpler.

        for (var i = 0; i < indices.length; i++) {
            xMin = Math.min(xMin, data.features[id].values[indices[i]]);
            xMax = Math.max(xMax, data.features[id].values[indices[i]]);
            yMin = Math.min(yMin, data.predictions[indices[i]], data.target[indices[i]]);
            yMax = Math.max(yMax, data.predictions[indices[i]], data.target[indices[i]]);
        };

        switch (type) {
            case "p":
                output = data.predictions;
                break;
            case "t":
                output = data.target;
                break;
            default:
                output = data.predictions;
        }

        var scatter = d3.select("#f" + id + type + "Scatter");

        scatter.selectAll("*").remove(); //clean up graph

        var y = d3.scale.linear() //set up scale
            .domain([yMin,yMax])
            .range([scatterHeight - scatterTopPadding, scatterTopPadding]);

        var yAxis = d3.svg.axis() //set up y-axis
            .scale(y)
            .orient("left")
            .ticks(5);

        scatter.append("g") //add axis to svg
            .attr("transform", "translate(" + scatterLeftPadding + ",0)")
            .call(yAxis)
            .selectAll("path")
            .style("stroke-width", "1px")
            .style("stroke","black")
            .style("fill","none");

        var x = d3.scale.linear()
            .domain([xMin, xMax])
            .range([scatterLeftPadding, scatterWidth - scatterLeftPadding]);

        var xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom")
            .ticks(5);

        scatter.append("g") //add x-axis
            .attr("transform", "translate(0," + (scatterHeight - scatterTopPadding) + ")")
            .call(xAxis)
            .selectAll("path")
            .style("stroke-width", "1px")
            .style("stroke","black")
            .style("fill","none");

        scatter.selectAll("circle")
            .data(indices)
            .enter()
            .append("circle")
            .attr("r", 3)
            .attr("cx", function (d) {
                return x(data.features[id].values[d]);
            })
            .attr("cy", function (d) {
                return y(output[d]);
            })
            .style("fill", function () {
                switch (type) {
                    case "p": 
                        return "darkgreen";
                    case "t":
                        return "red";
                }
            });
    }

    function updateBoxPlot(id, type) {  //groups the celllines by presence of mutation, and plots their target value
                                        //id = int, index of feature. type = string, "p" = prediction, "t" = target        
        var yMin = Infinity, yMax = -Infinity; //find extent of data

        var buckets = [[], [], []]; //buckets[0] is for mutation values of 0, [1] for 1, [2] for 2

        var output; //depending on type, either data.predictions or data.target. Makes stuff simpler.

        switch (type) {
            case "p":
                output = data.predictions;
                break;
            case "t":
                output = data.target;
                break;
            default:
                output = data.predictions;
        }        

        for (var i = 0; i < indices.length; i++) { //while doing so, sort data into three bins
            yMin = Math.min(yMin, data.predictions[indices[i]], data.target[indices[i]]);
            yMax = Math.max(yMax, data.predictions[indices[i]], data.target[indices[i]]);

            //console.log(data.features[id].values[indices[i]]);

            if (data.features[id].values[indices[i]] !== null) {
                buckets[data.features[id].values[indices[i]]].push(output[indices[i]]);
            }
        };
        //console.log([yMin,yMax]);

        for (var i = 0; i < buckets.length; i++) {
            buckets[i].sort(d3.ascending);
        };

        console.log(buckets);

        var plot = d3.select("#f" + id + type + "Scatter");

        plot.selectAll("*").remove();


        var y = d3.scale.linear() //set up scale
            .domain([yMin,yMax])
            .range([scatterHeight - scatterTopPadding, scatterTopPadding]);

        var yAxis = d3.svg.axis() //set up y-axis
            .scale(y)
            .orient("left")
            .ticks(5);

        plot.append("g") //add axis to svg
            .attr("transform", "translate(" + scatterLeftPadding + ",0)")
            .call(yAxis)
            .selectAll("path")
            .style("stroke-width", "1px")
            .style("stroke","black")
            .style("fill","none");

        var x = d3.scale.ordinal() //set up scale
            .domain([0, 1, 2])
            .rangeRoundBands([scatterLeftPadding, scatterWidth - scatterLeftPadding],1)

        var xAxis = d3.svg.axis() //set up x-axis
            .scale(x)
            .orient("bottom")

        plot.append("g") //add axis to svg
            .attr("transform", "translate(0," + (scatterHeight - scatterTopPadding) + ")")
            .call(xAxis)
            .selectAll("path")
            .style("stroke-width", "1px")
            .style("stroke","black")
            .style("fill","none");

        var boxes = plot.selectAll("g .boxPlot")
            .data(buckets)
            .enter()
            .append("g")
            .attr("class", "boxPlot");

        boxes.append("rect") //rectangles for interquartile range
            .attr("x", function (d, i) { //because we bound buckets, d is going to be the array of data values.
                return 125 + 100 * i; //tick marks are @ 150, 250, 350. Start 25 before that
            })
            .attr("y", function (d, i) {
                return y(d3.quantile(d, 0.75)); //top of box starts at third quartile (scaled)
            })
            .attr("width", 50)
            .attr("height", function (d) {
                return y(d3.quantile(d, 0.25)) - y(d3.quantile(d, 0.75));
            })
            .style("stroke", "black")
            .style("fill", "none");

        boxes.append("line") //max line
            .attr("x1", function (d, i) {
                return 125 + 100 * i; 
            })
            .attr("x2", function (d, i) {
                return 125 + 100 * i + 50;
            })
            .attr("y1", function (d) {
                return y(d3.max(d));
            })
            .attr("y2", function (d) {
                return y(d3.max(d));
            })
            .style("stroke", function () {
                switch (type) {
                    case "p": 
                        return "darkgreen";
                    case "t":
                        return "red";
                }
            })
            .style("stroke-width", "2px");

        boxes.append("line") //min line
            .attr("x1", function (d, i) {
                return 125 + 100 * i; 
            })
            .attr("x2", function (d, i) {
                return 125 + 100 * i + 50;
            })
            .attr("y1", function (d) {
                return y(d3.min(d));
            })
            .attr("y2", function (d) {
                return y(d3.min(d));
            })
            .style("stroke", function () {
                switch (type) {
                    case "p": 
                        return "darkgreen";
                    case "t":
                        return "red";
                }
            })            
            .style("stroke-width", "2px");   

        boxes.append("line") //median line
            .attr("x1", function (d, i) {
                return 125 + 100 * i; 
            })
            .attr("x2", function (d, i) {
                return 125 + 100 * i + 50;
            })
            .attr("y1", function (d) {
                return y(d3.median(d));
            })
            .attr("y2", function (d) {
                return y(d3.median(d));
            })
            .style("stroke", function () {
                switch (type) {
                    case "p": 
                        return "darkgreen";
                    case "t":
                        return "red";
                }
            })
            .style("stroke-width", "2px");

        boxes.append("line") //top whisker             
            .attr("x1", function (d, i) {
                return 150 + 100 * i;
            })
            .attr("x2", function (d, i) {
                return 150 + 100 * i;
            })
            .attr("y1", function (d) {
                return y(d3.max(d));
            })
            .attr("y2", function (d) {
                return y(d3.quantile(d, 0.75));
            })
            .style("stroke", function () {
                switch (type) {
                    case "p": 
                        return "darkgreen";
                    case "t":
                        return "red";
                }
            })
            .style("stroke-width", "1px");

        boxes.append("line") //bottom whisker             
            .attr("x1", function (d, i) {
                return 150 + 100 * i;
            })
            .attr("x2", function (d, i) {
                return 150 + 100 * i;
            })
            .attr("y1", function (d) {
                return y(d3.min(d));
            })
            .attr("y2", function (d) {
                return y(d3.quantile(d, 0.25));
            })
            .style("stroke", function () {
                switch (type) {
                    case "p": 
                        return "darkgreen";
                    case "t":
                        return "red";
                }
            })
            .style("stroke-width", "1px");

        // console.log(boxes);

    }

    //for testing & debugging
    initWindow();

    // sort(0);
    // updateGraph("target");
    // for (var i = 0; i < data.features.length; i++) {
    //     updateGraph(i);
    // };

}