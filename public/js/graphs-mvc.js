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
        $.getJSON("/mut", function (mut) {
            data["mutations"] = mut;
            setup(data);
        });
    });
}


//debug vars
var a;

function setup(data) {
    //////MODEL//////

    data.features = data.features.slice(0,30); //keep only the top features

    data.features.sort(function (a,b) {
        if (a.importance > b.importance) return -1;
        else if (a.importance < b.importance) return 1;
        else return 0;
    });

    a = data; //for debugging purposes

    //add z-scores to each feature
    for (var i = 0; i < data.features.length; i++) {
        data.features[i]["zScores"] = zScore(data.features[i].values);
    };

    //initialize other model variables
    var indices = []; //for sorting and filtering
    for (var i = 0; i < data.cellline.length; i++) {
        indices.push(i);
    };

    var zoom = 1;
    var zScoreState = false;
    var backgroundState = false;

  



    //////CONTROLLER//////

    function filter(lineage) { // lineage = string from filterOptions, contained by some cell line names
        indices = []; //fresh start for filtering.

        for (var i = 0; i < data.cellline.length; i++) { //check each cell line name for lineage string
            if (data.cellline[i].indexOf(lineage) !== -1) {
                indices.push(i);
            }
        };
        updateGraph("target");
        for (var i = 0; i < data.features.length; i++) {
            updateGraph(i);
        };  
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
                    return data.predictions[a] - data.predictions[b];
                });
                break;

            case 2: //target
                indices.sort(function (a, b) {
                    return data.target[a] - data.target[b];
                });
                break;
        }
        updateGraph("target");
        for (var i = 0; i < data.features.length; i++) {
            updateGraph(i);
        };  
    }

    function toggleZScore() {
        zScoreState = !zScoreState;

        if (zScoreState) $("#zScoreButton").val("Click for values");
        else $("#zScoreButton").val("Click for z-scores");

        for (var i = 0; i < data.features.length; i++) {
            updateGraph(i);
            updateScatter(i);
        };          
    }

    function toggleBackground () {
        backgroundState = !backgroundState
        if (backgroundState) $("#background").val("Hide lineage colors");
        else $("#background").val("Show lineage colors");
        updateGraph("target");
        for (var i = 0; i < data.features.length; i++) {
            updateGraph(i);
        }; 

    }

    function updateZoom(change) {
        zoom = Math.max(1, Math.min(zoom + change, 20));
        updateGraph("target");
        for (var i = 0; i < data.features.length; i++) {
            updateGraph(i);
        };    
    }

    function initEventHandlers () {
        //Main UI Stuff
        $("#zoomIn").click(function () {
            return updateZoom(1);
        });

        $("#zoomOut").click(function () {
            return updateZoom(-1);
        });

        $("#zScoreButton").click(toggleZScore);

        $("#filter").change(function () {
            filter($("#filter option:selected").text());
        });

        $("#background").click(toggleBackground);

        $("#sortL").click(function () {
            return sort(0);
        });

        $("#sortP").click(function () {
            return sort(1);
        });

        $("#sortT").click(function () {
            return sort(2);
        });

        //Graph Mouseover Stuff
        $(".graph").on("mousemove", function () {
            var graphId = $(this).attr("id");
            var graph;

            if (graphId.slice(0, graphId.indexOf("Graph")) === "target") {
                graph = "target";
            }
            else {
                graph = graphId.slice(1, graphId.indexOf("Graph"));
            }

            updateGraphTooltip(graph, event.x);

        });


        $(".graph").on("mouseout", function () {
            $(".shadow").attr("fill","none");
            $("#tooltip").css("display","none");
        });

        //Scatter Mouseover Stuff: See code for circle creation in updateScatter()

        //Box Tooltip Stuff: See code for box plot creation in updateBoxPlot() 

        //Feature UI Stuff
        $(".detailButton").click(function () {
            $(this).parent().parent().parent().children(".details").toggle();
        });        

        //Annoying Graph View Resize Stuff
        $(window).on("resize", function () {
            $("#mainUI").css("width", ($(window).width() - leftWidth - 40) + "px");
            $(".graphWrapper").css("width", ($(window).width() - leftWidth - 40) + "px");
        });

        //Annoying Scrolling Alignment Stuff
        $(".graphWrapper").on("scroll", function () {
            var scrollX = $(this).scrollLeft();
            $(".graphWrapper").each(function () {
                $(this).scrollLeft(scrollX);
            });
        });     
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


    var graphHeight = 60;
    var leftWidth = 260;
    var graphLeftPadding = 40;
    var graphTopPadding = 5;
    var barWidth;
    var scatterHeight = 500; //Scatter dimensions also used for box plots.
    var scatterWidth = 500;
    var scatterLeftPadding = 50;
    var scatterTopPadding = 50;

    var filterOptions;

    function initWindow() {
        d3.select("body")
            .append("div")
            .attr("id","graphWindow")

        initFeatureWindows(); //add features first in order to prevent counting problem
        initTargetWindow();
        initTooltip();
        initBoxTooltip();
        updateGraph("target");
        for (var i = 0; i < data.features.length; i++) {
            updateGraph(i);
        };

        initEventHandlers();
    }

    function initTargetWindow() { //special: target/prediction graph as well as experimental information, UI controls
        var targetWindow = d3.select("#graphWindow")
            .insert("div","div")
            .attr("id", "target")
            .style("position","fixed")
            .style("background-color", "white")
            .style("margin-bottom", "10px")
            .style("border-bottom", "1px solid black");

        targetWindow.append("div")
            .style("width",leftWidth + "px")
            .style("display","inline-block")
            .style("margin", "4px")
            .style("font-family", "Arial")
            //.attr("class", "left")
            .attr("id", "targetLeft")
            .append("div")
            .attr("class", "title")
            .style("margin-bottom", "2px")
            .text("GS_SMARCA2 *not in JSON :( *");

        d3.select("#targetLeft").selectAll("div .summary")
            .data(data.report_summary)
            .enter()
            .append("div")
            .attr("class", "summary")
            .text(function (d) {
                return d;
            });

        var graphWrapper = targetWindow.append("div")
            .attr("class", "graphWrapper")
            .style("vertical-align", "top")
            .style("display", "inline-block")
            .style("width", ($(window).width() - leftWidth - 40) + "px")
            .style("overflow-x", "auto")

        graphWrapper.append("svg")
            .style("vertical-align", "top")
            .attr("class", "graph")
            .attr("id", "targetGraph")
            .attr("height", graphHeight);

        //////Main UI stuff//////

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

        var mainUI = targetWindow.append("div")
            .attr("id", "mainUI")
            .style("position","relative")
            .style("width", "700px")
            .style("height", "1px") //for some reason this gets rid of extra space on the target window
            .style("top", ($("#targetGraph").height() - $("#target").height() + 20) + "px")
            .style("left", ($("#targetLeft").width() + 20) + "px");

        var zoomDiv = mainUI.append("div")
            .style("display", "inline-block")            
            .style("margin", "6px");

        zoomDiv.append("span")
            .text("Zoom ");

        zoomDiv.append("input")
            .attr("type", "button")
            .attr("id", "zoomIn")
            .attr("value", "+");        

        zoomDiv.append("input")
            .attr("type", "button")
            .attr("id", "zoomOut")
            .attr("value", "-");  

        mainUI.append("input")
            .style("margin-right", "10px")        
            .attr("type", "button")
            .attr("id", "zScoreButton")
            .attr("value", "Show z-scores");

        var filterDiv = mainUI.append("div")
            .style("display", "inline-block")        
            .style("margin", "6px");

        filterDiv.append("span")
            .text("Filter ");

        var filter = filterDiv.append("select")
            .attr("id", "filter")
            .attr("value","NONE");

        filter.selectAll("option")
            .data(filterOptions)
            .enter()
            .append("option")
            .text(function (d) {
                return d;
            });

        filterDiv.append("input")
            .attr("type", "button")
            .attr("id", "background")
            .attr("value", "Show lineage colors")
            .style("margin-left", "4px");

        var sortDiv = mainUI.append("div")
            .style("display", "inline-block")
            .style("margin", "6px");

        sortDiv.append("span")
            .text("Sort ");

        sortDiv.append("input")
            .attr("type", "button")
            .attr("id", "sortL")
            .attr("value", "Lineage"); 

        sortDiv.append("input")
            .attr("type", "button")
            .attr("id", "sortP")
            .attr("value", "Prediction"); 

        sortDiv.append("input")
            .attr("type", "button")
            .attr("id", "sortT")
            .attr("value", "Target");                 
        
        //add foundation div to sit underneath target window
        d3.select("#graphWindow")
            .insert("div", ".featureWindow") //insert ahead of the feature windows
            .style("display","inline-block")
            .style("height", ($("#target").height() + 10) + "px");

    }

    function initFeatureWindows () { //reads data and adds in feature windows accordingly
        var featureWindows = d3.select("#graphWindow")
            .selectAll("div")
            .data(data.features)
            .enter()
            .append("div")
            .attr("class", "featureWindow"  )
            .attr("id", function (d, i) {
                return "f" + i;
            });

        //////Lefts//////

        function getGeneFromFeature(name) {
            name = name.slice(name.indexOf("_") + 1);
            if (name.indexOf(" ") !== -1) name = name.slice(0, name.indexOf(" "));
            return name;
        }

        var lefts = featureWindows.append("div")
            .style("width",leftWidth + "px")
            .style("display","inline-block")
            .style("margin", "4px")            
            .text(function (d) {
                return d.name;
            })
            .attr("class", "left")
            .attr("id", function (d, i) {
                return "f" + i + "Left";
            });

        lefts.append("div")
            .style("margin-top","6px")
            .style("font-size", "12px")
            .append("a")
            .text(function (d) {
                var name = getGeneFromFeature(d.name);
                return "TumorPortal entry for " + name                
            })
            .attr("target", "blank")
            .attr("href", function (d) {
                var name = getGeneFromFeature(d.name);
                return "http://www.tumorportal.org/view?geneSymbol=" + name
            });


        lefts.append("div") //importance
            .text(function (d) {
                return d.importance;
            })
            .style("padding-top", "4px")
            .style("padding-bottom", "4px")
            .style("margin-top", "4px")
            .style("margin-bottom", "6px")
            .style("width", function (d) {
                return Math.floor(leftWidth * d.importance) + "px";
            })
            .style("background-color", "red")
            .style("display", "inline-block");

        lefts.append("br");

        //////Feature UI stuff//////

        var uiFields = lefts.append("div")
            .attr("class","featureUI")
        
        uiFields.append("input")
            .attr("class", "detailButton")
            .attr("type","button")
            .attr("value","Show/hide scatter or box plot");

        //////Graphs//////

        var graphWrapper = featureWindows.append("div")
            .attr("class", "graphWrapper")
            .style("vertical-align", "top")
            .style("display", "inline-block")
            .style("width",($(window).width() - leftWidth - 40) + "px")
            .style("overflow-x", "auto");

        var graphs = graphWrapper.append("svg")
            .attr("class", "graph")
            .style("vertical-align", "top")
            .attr("id", function (d, i) {
                return "f" + i + "Graph";
            })
            .attr("width", 400)
            .attr("height", graphHeight);

        var predictionScatters = featureWindows.append("div")
            .attr("class", "details")
            .style("display","none")
            .append("svg")
            .attr("class", "prediction")
            .attr("class", function (d, i) {
                if (/^.MUT/.exec(data.features[i].name)) return "box"; //if it's a mutation, it's a box plot
                else return "scatter";
            })
            .attr("id", function (d, i) {
                return "f" + i + "p";
            })
            .attr("width", scatterHeight)
            .attr("height", scatterWidth);

        var targetScatters = d3.selectAll(".details")
            .append("svg")
            .attr("class", "target")
            .attr("class", function (d, i) {
                if (/^.MUT/.exec(data.features[i].name)) return "box"; //if it's a mutation, it's a box plot
                else return "scatter";                
            })
            .attr("id", function (d, i) {
                return "f" + i + "t";
            })
            .attr("width", scatterHeight)
            .attr("height", scatterWidth);

    }

    function initTooltip() {
        d3.select("body")
            .append("div")
            .attr("id","tooltip")
            .style("position","fixed")
            .style("background-color", "white")
            .style("padding","4px")
            .style("border", "2px solid red")
            .style("display", "none")
            .style("left", "100px")
            .style("top", "100px");
    }

    function initBoxTooltip() {
        d3.selectAll(".details")
            .insert("div","svg")
            .attr("class","boxTooltip")
            .style("left", "350px") //arbitrary positioning!
            .style("top", "0px")                     
            .style("position","absolute")
            .style("background-color", "white")
            .style("padding","4px")
            .style("border", "2px solid red")
            .style("display", "none")
            .style("z-index", "1")
    }

    function updateGraph (id) { //id = string or int used to access an svg graph. "target" for target/prediction graph, an int for feature
        var featureOutput; //control bar height, values or z-scores. FEATURES ONLY!

        if (id !== "target") {
            if (zScoreState && !(/^.MUT/.exec(data.features[id].name))) {
                featureOutput = data.features[id].zScores;
            }
            else {
                featureOutput = data.features[id].values;
            }
        }

        var min = 10000, max = -10000; //find extent of data
        for (var i = 0; i < indices.length; i++) {
            if (id === "target") { //if target, make sure to check both target & prediction value among indices
                min = Math.min(min, data.target[indices[i]], data.predictions[indices[i]]);
                max = Math.max(max, data.target[indices[i]], data.predictions[indices[i]]);
            }
            else {
                min = Math.min(min, featureOutput[indices[i]]);
                max = Math.max(max, featureOutput[indices[i]]);
            }
        };


        var graph = d3.select("#f" + id + "Graph");
        if (id === "target") { //special case :P
            graph = d3.select("#targetGraph");
        }

        graph.selectAll("*").remove(); //clear previous contents

        barWidth = Math.pow(zoom, 2) + 1;
        var graphWidth = barWidth * indices.length + graphLeftPadding; //zoom = width of bars in pixels

        graph.attr("width", graphWidth);

        var wrapWindow; //div that wraps all of the pertinent visuals, must be expanded 
        if (typeof id === "number") {
            wrapWindow = d3.select("#f" + id);
        }
        else {
            wrapWindow = d3.select("#target");
        }

        // wrapWindow.style("width", Math.max(graphWidth + 500, 1020) + "px" );

        var y;

        if (id === "target" || !(/^.MUT/.exec(data.features[id].name))) { //only add z-score label & values on y-axis if not mutation
            y = d3.scale.linear() //set up scale
                .domain([min,max])
                .range([graphHeight - graphTopPadding, graphTopPadding]);

            var yAxis = d3.svg.axis() //set up y-axis
                .scale(y)
                .orient("left")
                .ticks(5);

            graph.append("g") //add axis to svg
                .attr("transform", "translate(" + (graphLeftPadding-1) + ",0)")
                .call(yAxis)
                .selectAll("path")
                .style("stroke-width", "1px")
                .style("stroke","black")
                .style("fill","none");

            graph.append("text") //label
                .text(function () {
                    if (zScoreState) return "z-score";
                    else return "value";
                })
                .attr("text-anchor","middle")
                .attr("x", graphLeftPadding - 28)
                .attr("y", graphHeight/2)
                .attr("transform", "rotate(270 " + (graphLeftPadding - 28) + "," + (graphHeight/2) + ")")
                .style("font-family", "Arial")
                .style("font-size", "10px");
        }
        else { //add different y-axis and label for mutations
            y = d3.scale.linear() //set up scale
                .domain([0,2]) //all mutation values are b/w 0 and 2
                .range([graphHeight-graphTopPadding, graphTopPadding]);

            var yAxis = d3.svg.axis() //set up y-axis
                .scale(y)
                .orient("left")
                .tickValues([0,1,2]);

            graph.append("g") //add axis to svg
                .attr("transform", "translate(" + (graphLeftPadding-1) + ",0)")
                .call(yAxis)
                .selectAll("path")
                .style("stroke-width", "1px")
                .style("stroke","black")
                .style("fill","none");

            graph.append("text") //label
                .text("Mut. Alleles")
                .attr("text-anchor","middle")
                .attr("x", graphLeftPadding - 28)
                .attr("y", graphHeight/2)
                .attr("transform", "rotate(270 " + (graphLeftPadding - 28) + "," + (graphHeight/2) + ")")
                .style("font-family", "Arial")
                .style("font-size", "10px");                
        }

        var backgroundColors = ["burlywood", "darkolivegreen", "darkturquoise", "springgreen", "salmon", "yellowgreen", "plum", "navy",
                            "chartreuse", "chocolate", "khaki", "lightcoral", "olive", "firebrick", "teal", "yellow", "tan",
                            "saddlebrown", "violetred", "goldenrod", "darkgreen"];

        if (backgroundState) {
            graph.selectAll("rect .background") //add background color depending on origin
                .data(indices)
                .enter()
                .append("rect")
                .attr("class","background")
                .attr("x", function (d, i) {
                    return i * barWidth + graphLeftPadding;         
                })
                .attr("width", function () {
                    return barWidth;
                })
                .attr("y", function () {
                    return graphTopPadding;
                })
                .attr("height", function () {
                    return graphHeight - 2 * graphTopPadding;
                })
                .attr("fill-opacity", 0.2)
                .attr("fill", function (d) {
                    var celllineName = data.cellline[d];
                    for (var i = 1; i < filterOptions.length; i++) { //skip the first, empty option
                        if (celllineName.indexOf(filterOptions[i]) !== -1) {
                            return backgroundColors[i];
                        }
                    }
                });
        }

        if (id === "target") { 
            graph.selectAll("rect .data")
                .data(indices) //bind indices and use them to access pertinent values from data object
                .enter()
                .append("rect")
                .attr("class","data") //for mouseover
                .attr("fill", function (d) {
                    if (data.target[d] < -2) return "red";
                    else return "gray";
                })
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
            graph.selectAll("rect .data")
                .data(indices) //bind indices and use them to access pertinent values from data object
                .enter()
                .append("rect")
                .attr("class", "data")
                .attr("x", function (d, i) {
                    return i * barWidth + graphLeftPadding;
                })
                .attr("width", function (d, i) {
                    return barWidth;
                })
                .attr("y", function (d) {
                    if (featureOutput[d] == 0) return y(0) - 1; //draw 0 values, but not null values                    
                    return Math.min(y(Math.max(0, featureOutput[d])), 59);
                })
                .attr("height", function (d) {
                    if (data.features[id].values[d] === null) return 0; //make sure nulls don't get drawn in z-score mode
                    else if (featureOutput[d] == 0) return 1; //draw 0 values, but not null values
                    else return Math.ceil(Math.abs(y(0) - y(featureOutput[d])));
                })
                .attr("fill", function (d) {
                    var color;
                    if (data.features[id].zScores[d] < -2) {
                        color = "limegreen";
                    }
                    else if (data.features[id].zScores[d] > 2) {
                        color = "crimson";
                    }
                    else {
                        color = "gray";
                    }
                    d3.select(this).text(color);
                    return color;
                });
        }

        graph.append("rect") //mouseover rectangle
            .attr("class","shadow")
            .attr("y",0)
            .attr("height",graphHeight)
            .attr("fill","none")
            .attr("fill-opacity","0.3")

        graph.append("rect")
            .attr("class","mouseTrap") //detects mouse events, b/c svg window itself cannot
            .attr("pointer-events", "all") //make sure it catches events
            .attr("x", graphLeftPadding)
            .attr("y", 0)
            .attr("width", graphWidth)
            .attr("height", graphHeight)
            .attr("fill","none");

        if (id !== "target") {    
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
        var input; //either z-score or feature value

        if (zScoreState) {
            input = data.features[id].zScores;
        }
        else {
            input = data.features[id].values;
        }

        for (var i = 0; i < indices.length; i++) {
            xMin = Math.min(xMin, input[indices[i]]);
            xMax = Math.max(xMax, input[indices[i]]);
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

        var scatter = d3.select("#f" + id + type);

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
                return x(input[d]);
            })
            .attr("cy", function (d) {
                return y(output[d]);
            })
            .style("fill", "blue")
            .on("mouseover", function (d) {
                //console.log($(scatter[0]).attr("id") + " " + data.cellline[d] + " " + data.features[id].values[d] + " " + output[d]);
                updateScatterTooltip($(scatter[0]).attr("id"), data.cellline[d]);
                scatter.select(".mouseLineX")
                    .attr("stroke","black")
                    .attr("y1", y(output[d]))
                    .attr("y2", y(output[d]));

                scatter.select(".mouseLineY")
                    .attr("stroke","black")
                    .attr("x1", x(input[d]))
                    .attr("x2", x(input[d]));
            })
            .on("mouseout", function () {
                $("#tooltip").toggle();
                scatter.select(".mouseLineX")
                    .attr("stroke","none");

                scatter.select(".mouseLineY")
                    .attr("stroke","none")
            });

        scatter.append("line") //mouseover XY lines
            .attr("class", "mouseLineX")
            .attr("x1", scatterLeftPadding)
            .attr("y1", 0)
            .attr("x2", (scatterWidth - scatterLeftPadding))
            .attr("y2", 500)
            .attr("stroke", "none");

        scatter.append("line")
            .attr("class", "mouseLineY")
            .attr("x1", 0)
            .attr("y1", scatterLeftPadding)
            .attr("x2", 500)
            .attr("y2", (scatterWidth - scatterLeftPadding))
            .attr("stroke", "none");   


        scatter.append("text") //x-axis label
            .attr("x", scatterWidth/2)
            .attr("y", scatterHeight - scatterTopPadding + 32)
            .style("font", "14px Arial")
            .attr("text-anchor", "middle")
            .text(function () {
                if (zScoreState) return data.features[id].name + " z-scores";
                else return data.features[id].name + " Values";
            });

        scatter.append("text") //y-axis label
            .attr("x", scatterLeftPadding - 30)
            .attr("y", scatterHeight/2)
            .style("font-family", "Arial")
            .attr("transform", "rotate(270 " + (scatterLeftPadding - 30) + "," + (scatterHeight/2) + ")")
            .attr("text-anchor", "middle")
            .text(function () {
                switch (type) {
                    case "p": 
                        return "Predicted *gene name* Dependency";
                    case "t":
                        return "Target *gene name* Dependency";
                }
            });         
    }

    function updateBoxPlot(id, type) {  //groups the celllines by presence of mutation, and plots their prediction or target value    
        //id = int, index of feature. type = string, "p" = prediction, "t" = target        
        var yMin = Infinity, yMax = -Infinity; //find extent of data

        var buckets = [[], [], []]; //buckets[0] is for mutation values of 0, [1] for 1, [2] for 2
                                    //for each bucket member, [pred/targ val, index]

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
                buckets[data.features[id].values[indices[i]]].push([output[indices[i]], indices[i]]);
            }
        };
        //console.log([yMin,yMax]);

        for (var i = 0; i < buckets.length; i++) {
            buckets[i].sort(function (a, b) {
                return a[0] - b[0];
            });
        };

        var plot = d3.select("#f" + id + type);

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
            .domain(["None", "Heterozygous", "Homozygous"])
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

        plot.append("text") //y-axis label
            .attr("x", scatterLeftPadding - 30)
            .attr("y", scatterHeight/2)
            .style("font-family", "Arial")
            .attr("transform", "rotate(270 " + (scatterLeftPadding - 30) + "," + (scatterHeight/2) + ")")
            .attr("text-anchor", "middle")
            .text(function () {
                switch (type) {
                    case "p": 
                        return "Predicted *gene name* Dependency";
                    case "t":
                        return "Target *gene name* Dependency";
                }
            });     

        plot.append("text") //x-axis label
            .attr("x", scatterWidth/2)
            .attr("y", scatterHeight - scatterTopPadding + 32)
            .style("font", "14px Arial")
            .attr("text-anchor", "middle")
            .text(function () {
                return "Mutation in " + data.features[id].name;
            });       

        var boxes = plot.selectAll("g .boxPlot")
            .data(buckets)
            .enter()
            .append("g")
            .attr("class", "boxPlot");

        function getElement(bucket, n) { //because bucket elements are now arrays, return an array of the nth element of bucket elements (values)
            var values = [];
            bucket.forEach(function (x) {
                values.push(x[n]); //push the first element of the bucket element (value)
            });
            return values;
        }

        boxes.append("rect") //rectangles for interquartile range
            .attr("x", function (d, i) { //because we bound buckets, d is going to be the array of data values.
                return 125 + 100 * i; //tick marks are @ 150, 250, 350. Start 25 before that
            })
            .attr("y", function (d, i) {
                return y(d3.quantile(getElement(d,0), 0.75)); //top of box starts at third quartile (scaled)
            })
            .attr("width", 50)
            .attr("height", function (d) {
                return y(d3.quantile(getElement(d,0), 0.25)) - y(d3.quantile(getElement(d,0), 0.75));
            })
            .style("stroke", "blue")
            .style("fill", "none");

        boxes.append("line") //max line
            .attr("x1", function (d, i) {
                return 125 + 100 * i; 
            })
            .attr("x2", function (d, i) {
                return 125 + 100 * i + 50;
            })
            .attr("y1", function (d) {
                return y(d3.max(getElement(d,0)));
            })
            .attr("y2", function (d) {
                return y(d3.max(getElement(d,0)));
            })
            .style("stroke", "blue")
            .style("stroke-width", "2px");

        boxes.append("line") //min line
            .attr("x1", function (d, i) {
                return 125 + 100 * i; 
            })
            .attr("x2", function (d, i) {
                return 125 + 100 * i + 50;
            })
            .attr("y1", function (d) {
                return y(d3.min(getElement(d,0)));
            })
            .attr("y2", function (d) {
                return y(d3.min(getElement(d,0)));
            })
            .style("stroke","blue")            
            .style("stroke-width", "2px");   

        boxes.append("line") //median line
            .attr("x1", function (d, i) {
                return 125 + 100 * i; 
            })
            .attr("x2", function (d, i) {
                return 125 + 100 * i + 50;
            })
            .attr("y1", function (d) {
                return y(d3.median(getElement(d,0)));
            })
            .attr("y2", function (d) {
                return y(d3.median(getElement(d,0)));
            })
            .style("stroke", "blue")
            .style("stroke-width", "2px");

        boxes.append("line") //top whisker             
            .attr("x1", function (d, i) {
                return 150 + 100 * i;
            })
            .attr("x2", function (d, i) {
                return 150 + 100 * i;
            })
            .attr("y1", function (d) {
                return y(d3.max(getElement(d,0)));
            })
            .attr("y2", function (d) {
                return y(d3.quantile(getElement(d,0), 0.75));
            })
            .style("stroke", "blue")
            .style("stroke-width", "1px");

        boxes.append("line") //bottom whisker             
            .attr("x1", function (d, i) {
                return 150 + 100 * i;
            })
            .attr("x2", function (d, i) {
                return 150 + 100 * i;
            })
            .attr("y1", function (d) {
                return y(d3.min(getElement(d,0)));
            })
            .attr("y2", function (d) {
                return y(d3.quantile(getElement(d,0), 0.25));
            })
            .style("stroke", "blue")
            .style("stroke-width", "1px");

        boxes.append("rect")
            .attr("x", function (d, i) { 
                return 125 + 100 * i; 
            })
            .attr("y", scatterTopPadding)
            .attr("width", 50)
            .attr("height", scatterHeight - 2 * scatterTopPadding)
            .attr("fill", "gray")
            .attr("pointer-events", "all")
            .attr("fill-opacity", 0.0)
            .on("mouseover", function () {
                d3.select(this).attr("fill-opacity", 0.1);
            })
            .on("mouseout", function () {
                d3.select(this).attr("fill-opacity", 0.0);
            })
            .on("click", function (d) {
                var feature = $(boxes[0][0]).parent().parent().parent().attr("id"); //get id of the feature window
                var boxIndex = (parseInt($(this).attr("x")) - 125)/100; //working backwards to get the box's index :-/ 
                var bucketMemberIndices = getElement(d, 1); //get indices of bucket members

                var bucketMembers = [];

                bucketMemberIndices.sort(function (a, b) { //comparing two indices.
                    var aString = data.cellline[a];
                    var bString = data.cellline[b];

                    var aLineage = aString.substring(aString.indexOf("_") + 1); //to sort by lineage, chop off stuff up to first underscore
                    var bLineage = bString.substring(bString.indexOf("_") + 1); 

                    if (aLineage < bLineage) return -1;
                    else if (aLineage > bLineage) return 1;
                    else return 0;

                });

                bucketMemberIndices.forEach(function (x) {
                    bucketMembers.push(data.cellline[x]);
                });

                var bucketNumbers = [d3.min(getElement(d,0)), d3.quantile(getElement(d,0), 0.25), d3.median(getElement(d,0)),
                                     d3.quantile(getElement(d,0), 0.75), d3.max(getElement(d,0))];                

                updateBoxTooltip(feature, boxIndex, bucketMembers, bucketNumbers);
            });
    }

    function updateGraphTooltip(graph, xPos) { //Updates the main graph tooltip whenever mouse position shifts, also darkens the appropriate rect
        //graph = "target" or index of feature, xPos = mouse x coordinate 
        var index;
        var graphElement;
        var line1, line2, line3; //three lines to be printed, depends on what graph

        if (graph === "target") {
            graphElement = $("#targetGraph");
            index = Math.floor((xPos - graphElement.offset().left - graphLeftPadding) / barWidth); //pixels to right of svg / # of rects 
            if (index >= 0) {
                line1 = "Cell Line: " + data.cellline[indices[index]];            
                line2 = "Prediction: " + (data.predictions[indices[index]]).toFixed(4);
                line3 = "Target: " + (data.target[indices[index]]).toFixed(4);
            }
        }
        else {
            graphElement = $("#f" + graph + "Graph");
            index = Math.floor((xPos - graphElement.offset().left - graphLeftPadding) / barWidth);
            if (index >= 0) {
                line1 = "Cell Line: " + data.cellline[indices[index]];
                if (data.features[graph].values[indices[index]] !== null) line2 = "Value: " + (data.features[graph].values[indices[index]]).toFixed(4);
                else line2 = "Value: null";
                line3 = "z-score: " + (data.features[graph].zScores[indices[index]]).toFixed(4);
            }
        }

        //console.log(line1 + line2 + line3)

        // console.log(graphElement.offset().top + " " + $("body").scrollTop());

        var tooltip = d3.select("#tooltip")
            .style("display",function () {
                if ((xPos - graphElement.offset().left) > graphLeftPadding) return "block"; //only have the tooltip show up when it is on graph bars
                else return "none";
            })
            .style("left",(xPos-60) + "px")
            .style("top", (graphElement.offset().top + graphElement.height() - $("body").scrollTop()) + "px")
            .style("width", "auto")
            .style("height", "auto");

        tooltip.selectAll("*").remove();

        tooltip.selectAll("div")
            .data([line1, line2, line3])
            .enter()
            .append("div")
            .style("font","12px Arial")
            .text(function (d) {
                return d;
            });

        //darken moused-over cell line in all graphs
        d3.select(".graph") //get all the graphs
            .selectAll(".data")
            .each(function (d, i) {
                if (i === index) {
                    d3.selectAll(".shadow")
                        .attr("x", $(this).attr("x"))
                        .attr("width",$(this).attr("width"))
                        .attr("fill","slateblue");
                }
            });

    }

    function updateBoxTooltip (feature, boxIndex, bucketMembers, bucketNumbers) { 
        //feature = string, id of feature window, boxIndex = int, 0,1,2, bucketMembers = array of strings, celllines in the bucket
        //bucketNumbers = array of ints, [min, 1st quartile, median, 3rd quartile, max]

        var featureName = data.features[parseInt(feature.slice(1))].name; //get name of feature
        var geneName = "GS" + featureName.slice(featureName.indexOf("_")); //Chop the mutation type, replace with "GS", to yield "GS_SMARCA2"
        console.log(geneName);

        var bucketDetails = []; //array of objects with celllines and mutation info if any

        for (var i = 0; i < bucketMembers.length; i++) {
            var detailObject = { //create an object with name only first
                name: bucketMembers[i],
                mutations: []
            };

            for (var j = 0; j < data.mutations.length; j++) {
                if (bucketMembers[i] === data.mutations[j].cellline && featureName === data.mutations[j].feature) {
                    detailObject.mutations = data.mutations[j].mutations; //if we find mutations, add them to object
                }
            }
            bucketDetails.push(detailObject); //push no matter what

        };

        console.log(bucketDetails);

        var detailDiv = $("#" + feature + " .details");

        var tooltip = d3.select("#" + feature + " .boxTooltip")
            .style("display","inline-block")
            .style("left", (detailDiv.width()/2 - scatterLeftPadding * 2 - 20) + "px") //arbitrary positioning!
            .style("top", (detailDiv.offset().top + scatterTopPadding) + "px")
            .style("overflow-y", "auto")            
            .style("width", "220px")
            .style("height", "400px");

        tooltip.selectAll("*").remove();

        tooltip.append("div")
            .attr("class", "tooltipExit")
            .style("text-align", "center")
            .style("font", "10px Arial")
            .style("margin-bottom","5px")
            .style("background-color", "silver")
            .text("Click to hide")
            .on("click", function () {
                $("#" + feature + " .boxTooltip").toggle();
            });            

        tooltip.append("div")
            .attr("id", "bucketTitle")
            .style("text-align", "center")
            .style("font", "bold 14px Arial")
            .text(function () {
                return boxIndex + " Muts (" + bucketMembers.length + " lines)";
            })

        var detailTable = tooltip.append("table")
            .style("width", "100%")
            .style("margin-bottom", "8px")

        detailTable.append("tr")
            .selectAll("td")
            .data(["Min","1Q", "Med", "3Q", "Max"])
            .enter()
            .append("td")
            .style("font", "13px Arial")
            .style("text-align", "center")
            .text(function (d) {
                return d;
            });

        detailTable.append("tr")
            .selectAll("td")
            .data(bucketNumbers)
            .enter()
            .append("td")
            .style("font", "13px Arial")
            .style("text-align", "center")
            .text(function (d) {
                return d.toFixed(3);
            });  

        tooltip.append("div")
            .text("Click an entry to show mutation areas")
            .style("font", "10px Arial")
            .style("text-align", "center");


        var bucketMemberDivs = tooltip.selectAll("div .bucketMembers")
            .data(bucketDetails)
            .enter()
            .append("div")
            .attr("class", "bucketMembers");

        bucketMemberDivs.append("div")
            .style("word-wrap","break-word")
            .style("margin-top", "4px")            
            .style("font", "12px Arial")
            .text(function (d, i) {
                return d.name;                    
            })
            .on("mouseover", function () {
                d3.select(this).style("background-color","silver");
            })
            .on("mouseout", function () {
                d3.select(this).style("background-color","white");
            })            
            .on("click", function () {
                $(this).parent().find(".mutations").toggle();
            });

        bucketMemberDivs.each(function (d, i) { //bind mutation array to each bucket member div
            d3.select(this)
                .selectAll("div .mutations")
                .data(d.mutations)
                .enter()
                .append("div")
                .attr("class", "mutations")
                .style("font","11px Arial")
                .style("margin-left", "10px")
                .style("margin-top", "2px")
                .style("display","none")
                .text(function (d, i) {
                    return d.mut;
                });                
        });

        console.log(bucketMemberDivs);


    }

    function updateScatterTooltip(graph, cellline) { //Updates the scatterplot tooltip whenever mouse is over a circle
        //graph = string, id of the graph, cellline = string, name of cellline
        var graphElement = $("#" + graph);
        console.log(graph + " " + graphElement.offset().left);

        var tooltip = d3.select("#tooltip")
            .style("display","block")
            .style("left",(graphElement.offset().left) + "px")
            .style("top", (graphElement.offset().top - $("body").scrollTop()) + "px")
            .style("width", "auto")
            .style("height", "auto");

        tooltip.selectAll("*").remove();

        tooltip.append("div") 
            .style("font","12px Arial")
            .text(cellline);
    }

    //for testing & debugging
    initWindow();

    // sort(0);
    // updateGraph("target");
    // for (var i = 0; i < data.features.length; i++) {
    //     updateGraph(i);
    // };

}