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
    var sortIndex = 0;
    var zScoreState = false;
    var backgroundState = false;

    var filterOptions;
    var sortOptions;

    var colorList = ["#ad0000", "#614100", "#006134", "#0000ba", "#ba8cab", "#a15b50", "#e0d970", "#38e0a8", "#1b1b6e", "#e070ac", "#e0b0a8", 
                     "#576130", "#49615f", "#7070e0", "#543f4a", "#6e1d00", "#96e000", "#00d1e0", "#9f9fd4", "#6e002c", "#a18978", "#609425", 
                     "#2b82ad", "#d538e0", "#e03865", "#c76a00", "#95c79c", "#004887", "#763d7a", "#e0ac70", "#00c750", "#0000e0", "#a1006b"];

    var lociColorList = ["red","orange","blue","seagreen","violet","brown"]

    var lociColors = {}; //prepare list of loci colors
    var lociColorIndex = 0;

    a.features.forEach(function (x) { //for every loci with duplicates, choose a color other than black
        if (!lociColors.hasOwnProperty(x.loci)) lociColors[x.loci] = "black";
        else if (lociColors[x.loci] === "black") {
            lociColors[x.loci] = lociColorList[lociColorIndex];
            lociColorIndex++;            
        } 
    });

    //////CONTROLLER//////

    function filterCellLines(lineage) { // lineage = string from filterOptions, contained by some cell line names
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

        sortGraphValues();
    }

    function sortGraphValues() { 
        switch (sortIndex) {
            case 0: //target
                indices.sort(function (a, b) {
                    return data.target[a] - data.target[b];
                });
                break;

            case 1: //predictions
                indices.sort(function (a, b) {
                    return data.predictions[a] - data.predictions[b];
                });
                break;

            case 2: //lineage
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

            default: //sortIndex >= 3: sort by value of selected feature
                indices.sort(function (a, b) {
                    var aVal = data.features[sortIndex - 3].values[a]; //features start at 3 in the options list, so subtract three
                    var bVal = data.features[sortIndex - 3].values[b];

                    if (aVal === null) aVal = Infinity; //stick nulls at the end, after largets
                    if (bVal === null) bVal = Infinity;

                    if (aVal < bVal) return -1;
                    else if (aVal > bVal) return 1;
                    else return 0;
                });

        }
        updateGraph("target");
        for (var i = 0; i < data.features.length; i++) {
            updateGraph(i);
        };  
    }

    function toggleZScore() { //checks the checkbox, sets state var accordingly

        zScoreState = $("#zScoreCheck").is(":checked");

        for (var i = 0; i < data.features.length; i++) {
            updateGraph(i);
            updateScatter(i);
        };          
    }

    function toggleBackground () {
        backgroundState = $("#background").is(":checked");
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

        $("#zScoreCheck").click(toggleZScore);

        $("#filter").change(function () {
            filterCellLines($("#filter option:selected").text());
        });

        $("#background").click(toggleBackground);

        $("#sort").change(function () {
            sortIndex = sortOptions.indexOf($("#sort option:selected").text());
            sortGraphValues();
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

        $(".featureInfo").click(function () {
            $(this).parent().parent().children(".moreInfo").toggle();
        })

        //Annoying Graph View Resize Stuff
        $(window).on("resize", function () {
            $("#mainUI").css("width", ($(window).width() - leftWidth - 40) + "px");
            $(".graphWrapper").css("width", (Math.min(900, $(window).width() - leftWidth - 40)) + "px");
        });

        //Annoying Scrolling Alignment Stuff
        $(".graphWrapper").on("scroll", function () {
            var scrollX = $(this).scrollLeft();
            $(".graphWrapper").each(function () {
                $(this).scrollLeft(scrollX);
            });
        });     
    }

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
    var scatterHeight = 450; //Scatter dimensions also used for box plots.
    var scatterWidth = 450;
    var scatterLeftPadding = 50;
    var scatterTopPadding = 50;


    function initWindow() {
        d3.select("body")
            .insert("div","div")
            .attr("id","graphWindow")
            .style("padding-bottom", "10px")
            .style("margin-bottom", "10px")
            .style("border-bottom", "2px solid black")

        initFeatureWindows(); //add features first in order to prevent counting problem
        initTargetWindow();
        initTooltip();
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
            .style("z-index", "1")
            .style("position","fixed")
            .style("background-color", "white")
            .style("margin-bottom", "10px")
            .style("margin-top", "-8px")
            .style("padding-top", "8px")
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
            .text(data.target_name);

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
            .style("width", (Math.min(900, $(window).width() - leftWidth - 40))+ "px")
            .style("overflow-x", "scroll")

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

        //get sorting options.
        sortOptions = ["TARGET", "PREDICTION", "LINEAGE"]

        data.features.forEach(function (x) {
            sortOptions.push(x.name)
        });


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

        var zScoreDiv = mainUI.append("div")
            .style("display", "inline-block")            
            .style("margin", "6px");        

        zScoreDiv.append("span")
            .text("Show feature z-scores ")    

        zScoreDiv.append("input")
            .style("margin-right", "10px")        
            .attr("type", "checkbox")
            .attr("id", "zScoreCheck")

        var colorDiv = mainUI.append("div")
            .style("display", "inline-block")            
            .style("margin", "6px");  

        colorDiv.append("span")
            .text("Show lineage colors")

        colorDiv.append("input")
            .attr("type", "checkbox")
            .attr("id", "background")
            .style("margin-left", "4px");

        var filterDiv = mainUI.append("div")
            .style("display", "inline-block")        
            .style("margin", "6px");            

        filterDiv.append("span")
            .text("   Filter by lineage: ");

        var filterSelect = filterDiv.append("select")
            .attr("id", "filter")
            .attr("value","NONE");

        filterSelect.selectAll("option")
            .data(filterOptions)
            .enter()
            .append("option")
            .text(function (d) {
                return d;
            });

        var sortDiv = mainUI.append("div")
            .style("display", "inline-block")
            .style("margin", "6px");

        sortDiv.append("span")
            .text("Sort by value: ");

        var sortSelect = sortDiv.append("select")
            .attr("id", "sort");

        sortSelect.selectAll("option")
            .data(sortOptions.slice(0,3)) //first three- target, prediction, lineage
            .enter()
            .append("option")
            .text(function (d) {
                return d;
            });

        sortSelect.append("optgroup") //stuff feature options under an optgroup
            .attr("label","Features")
            .selectAll("option .feature")
            .data(sortOptions.slice(3))
            .enter()
            .append("option")
            .attr("class", "feature")
            .text(function (d) {
                return d;
            })



        targetWindow.append("div")
            .attr("id","about")
            .style("background-color","lightgray")
            .style("display","inline-block")
            .style("font", "12px Arial")
            .style("float", "right")
            .on("mouseover", function() {
                $("#acknowledgement").toggle();
            })
            .on("mouseout", function() {
                $("#acknowledgement").toggle();
            })
            .append("div")
            .text("About");              
        
        $("#acknowledgement").detach().appendTo("#about");
        $("#acknowledgement").css("display","none");

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

        var lefts = featureWindows.append("div")
            .style("width",leftWidth + "px")
            .style("display","inline-block")
            .style("margin", "4px")            
            .attr("class", "left")
            .attr("id", function (d, i) {
                return "f" + i + "Left";
            });

        lefts.append("div")
            .attr("class","featureTitle")
            .style("display", "inline")
            .text(function (d) {
                return d.name;
            });

        lefts.append("div")
            .style("font-size", "12px")
            .style("margin-top", "4px")
            .style("color", function (d) {
                if (lociColors.hasOwnProperty(d.loci)) return lociColors[d.loci];
            })
            .text(function (d) {
                return "Loci: " + d.loci;
            });            

        lefts.append("div") //importance
            .text(function (d) {
                return d.importance;
            })
            .style("font-size", "13px")
            .style("padding-top", "2px")
            .style("padding-bottom", "2px")
            .style("margin-top", "4px")            
            .style("margin-bottom", "4px")
            .style("width", function (d) {
                return Math.floor(leftWidth * d.importance) + "px";
            })
            .style("background-color", "red")
            .style("display", "inline-block");      

        //////Feature UI stuff//////

        var uiFields = lefts.append("div")
            .attr("class","featureUI")
        
        uiFields.append("input")
            .attr("type", "button")
            .attr("value", "Info")
            .style("display","inline")
            .style("margin-right","10px")
            .attr("class", "featureInfo");

        uiFields.append("input")
            .attr("class", "detailButton")
            .attr("type","button")
            .attr("value","Show/hide scatter or box plot");

        //////Extra Feature Info//////

        var moreInfo = lefts.append("div")
            .attr("class","moreInfo")
            .style("font-size", "12px")
            .style("margin","4px")
            .style("position","relative")
            .style("display","none")
            .style("left","0px")
            .style("top","0px")
            .style("width", (leftWidth - 10) + "px")

        moreInfo.append("div")
            .style("margin-top", "2px")
            .text(function (d) {
                return d.gene_symbol + " " + d.description;
            });

        moreInfo.append("div")
            .style("margin-top","2px")
            .append("a")
            .text(function (d) {
                return "TumorPortal entry for " + d.gene_symbol;
            })
            .attr("target", "blank")
            .attr("href", function (d) {
                return "http://www.tumorportal.org/view?geneSymbol=" + d.gene_symbol;
            });

        //////Graphs//////

        var graphWrapper = featureWindows.append("div")
            .attr("class", "graphWrapper")
            .style("vertical-align", "top")
            .style("display", "inline-block")
            .style("width",(Math.min(900, $(window).width() - leftWidth - 40)) + "px")
            .style("overflow-x", "hidden");

        var graphs = graphWrapper.append("svg")
            .attr("class", "graph")
            .style("vertical-align", "top")
            .attr("id", function (d, i) {
                return "f" + i + "Graph";
            })
            .attr("width", 400)
            .attr("height", graphHeight);

        var detailDivs = featureWindows.append("div")
            .attr("class", "details")
            .style("position", "relative")
            .style("z-index","0")
            .style("left", "0px")
            .style("width", (2 * scatterWidth + leftWidth + 20) + "px")
            .style("display","none");


        detailDivs.append("div")
            .attr("class","boxTooltip")
            .style("display", "inline-block")
            .style("position", "relative")
            .style("left", "0px")
            .style("top", "50px")
            .style("width", leftWidth + "px")
            .style("vertical-align", "top")
            .style("margin", "8px")
            .style("border", "2px solid red")
            .style("visibility","hidden")

        var predictionScatters = detailDivs.append("svg")
            .attr("class", "prediction")
            .attr("class", function (d, i) {
                if (data.features[i].type === "mut") return "box"; //if it's a mutation, it's a box plot
                else return "scatter";
            })
            .attr("id", function (d, i) {
                return "f" + i + "p";
            })
            .attr("width", scatterHeight)
            .attr("height", scatterWidth);

        var targetScatters = detailDivs.append("svg")
            .attr("class", "target")
            .attr("class", function (d, i) {
                if (data.features[i].type === "mut") return "box"; //if it's a mutation, it's a box plot
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
            .style("z-index","10")
            .style("position","fixed")
            .style("background-color", "white")
            .style("padding","4px")
            .style("border", "2px solid red")
            .style("display", "none")
            .style("left", "100px")
            .style("top", "100px");
    }

    function updateGraph(id) { //id = string or int used to access an svg graph. "target" for target/prediction graph, an int for feature
        var featureOutput; //control bar height, values or z-scores. FEATURES ONLY!

        if (id !== "target") {
            if (zScoreState && !(data.features[id].type === "mut")) {
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

        if (id === "target" || !(data.features[id].type === "mut")) { //only add z-score label & values on y-axis if not mutation
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
                    if (zScoreState && id !== "target") return "z-score";
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
                .attr("fill-opacity", 0.25)
                .attr("fill", function (d) {
                    var celllineName = data.cellline[d];
                    for (var i = 1; i < filterOptions.length; i++) { //skip the first, empty option
                        if (celllineName.indexOf(filterOptions[i]) !== -1) {
                            return colorList[i];
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
            if (data.features[id].type === "mut") { //if it's a mutation, draw box plot instead
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
        var other; //the other graph
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
                other = data.target
                break;
            case "t":
                output = data.target;
                other = data.predictions;
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
            .style("fill", "black")
            .on("mouseover", function (d) {
                updateScatterTooltip($(scatter[0]).attr("id"), data.cellline[d], event);

                d3.selectAll("#f" + id + " .scatter") //crappy workaround- have to select both scatterplots
                    .each(function (dud, i) { //preserve d from outside- the index of the value
                        var drawData;
                        switch (i) {
                            case 0: //first svg is predictions
                                drawData = data.predictions;
                                break;
                            case 1: //second is targets
                                drawData = data.target;
                                break;
                        }

                        d3.select(this).select(".mouseLineX")
                            .attr("stroke","gray")
                            .attr("stroke-width", "2px")
                            .attr("y1", y(drawData[d]))
                            .attr("y2", y(drawData[d]));

                        d3.select(this).select(".mouseLineY")
                            .attr("stroke","gray")
                            .attr("stroke-width", "2px")
                            .attr("x1", x(input[d]))
                            .attr("x2", x(input[d]));                        
                    });


            })
            .on("mouseout", function () {
                $("#tooltip").toggle();
                d3.selectAll("#f" + id + " .scatter")
                    .select(".mouseLineX")
                    .attr("stroke","none");

                d3.selectAll("#f" + id + " .scatter")
                    .select(".mouseLineY")
                    .attr("stroke","none");
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
                        return data.target_name + " Predicted Dependency";
                    case "t":
                        return data.target_name + " Target Dependency";
                }
            });         
    }

    function updateBoxPlot(id, type) { //groups the celllines by presence of mutation, and plots their prediction or target value    
        //id = int, index of feature. type = string, "p" = prediction, "t" = target        
        var yMin = Infinity, yMax = -Infinity; 

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

        // Group dependency scores into buckets (each feature score gets a bucket)
        var buckets = {}; //keys are the feature values, values are arrays of target/pred values

        for (var i = 0; i < indices.length; i++) {
            var featureVal = data.features[id].values[indices[i]];

            // iterate over all predictions and targets and sort into buckets

            yMin = Math.min(yMin, data.predictions[indices[i]], data.target[indices[i]]);
            yMax = Math.max(yMax, data.predictions[indices[i]], data.target[indices[i]]);

            // if key is in buckets, add to the array, if not than start a new one
            if (featureVal !== null) {
                if (featureVal in buckets) {
                    // access the property value in buckets by its key and push the pred/target value
                    buckets[featureVal.toString()].push(output[indices[i]]); 
                } else {
                    // create an array with the pred/target value as the first member
                    buckets[featureVal.toString()] = [output[indices[i]]];
                }
            }

        }

        // now sort each array
        for (i in buckets) {
            buckets[i].sort(function (a,b) {
                return b - a;
            });
        }

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

        // create ordinal scale, each key gets a band
        var x = d3.scale.ordinal()
            .domain(Object.keys(buckets))
            .rangeRoundBands([scatterLeftPadding, scatterWidth - scatterLeftPadding], 0.5, 0.5);

        var xAxis = d3.svg.axis() //set up x-axis
            .scale(x)
            .orient("bottom");

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
                        return data.target_name + " Predicted Dependency";
                    case "t":
                        return data.target_name + " Target Dependency";
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

        plot.append("text")
            .attr("x", scatterWidth/2)
            .attr("y", 40)
            .style("font", "14px Arial")
            .attr("text-anchor", "middle")
            .text("Click box plots to show list of cell lines & mutations")

        // now we transform the buckets object into an array of arrays
        bucketArray = Object.keys(buckets).map(function(key) { return buckets[key]; });

        var boxes = plot.selectAll("g .boxPlot")
            .data(bucketArray)
            .enter()
            .append("g")
            .attr("class", "boxPlot");   

        // box from Q1 to Q3
        boxes.append("rect")
            .attr("x", function (d, i) { //d: the array of data values. i: the index
                return x.range()[i]; // i-th band on the axis
            })
            .attr("y", function (d, i) {
                return y(d3.quantile(d, 0.25));
            })
            .attr("height", function (d, i) {
                return Math.max(1, y(d3.quantile(d, 0.75)) - y(d3.quantile(d, 0.25)));
            })
            .attr("width", function (d, i) {
                return x.rangeBand();
            })
            .style("stroke", "black")
            .style("fill", "none");

        // lines at min and max
        boxes.append("line")
            .attr("x1", function (d, i) {
                return x.range()[i];
            })
            .attr("y1", function (d, i) {
                return y(d3.min(d));
            })
            .attr("x2", function (d, i) {
                return x.range()[i] + x.rangeBand();
            })
            .attr("y2", function (d, i) {
                return y(d3.min(d));
            })
            .style("stroke", "black")
            .style("stroke-width", "2px");

        boxes.append("line")
            .attr("x1", function (d, i) {
                return x.range()[i];
            })
            .attr("y1", function (d, i) {
                return y(d3.max(d));
            })
            .attr("x2", function (d, i) {
                return x.range()[i] + x.rangeBand();
            })
            .attr("y2", function (d, i) {
                return y(d3.max(d));
            })
            .style("stroke", "black")
            .style("stroke-width", "2px");

        // median
        boxes.append("line")
            .attr("x1", function (d, i) {
                return x.range()[i];
            })
            .attr("y1", function (d, i) {
                return y(d3.median(d));
            })
            .attr("x2", function (d, i) {
                return x.range()[i] + x.rangeBand();
            })
            .attr("y2", function (d, i) {
                return y(d3.median(d));
            })
            .style("stroke", "black")
            .style("stroke-width", "2px");

        // Whiskers
        boxes.append("line")
            .attr("x1", function (d, i) {
                return x.range()[i] + x.rangeBand()/2;
            })
            .attr("y1", function (d, i) {
                return y(d3.max(d));
            })
            .attr("x2", function (d, i) {
                return x.range()[i] + x.rangeBand()/2;
            })
            .attr("y2", function (d, i) {
                return y(d3.quantile(d, 0.25));
            })
            .style("stroke", "black")
            .style("stroke-width", "2px");

        boxes.append("line")
            .attr("x1", function (d, i) {
                return x.range()[i] + x.rangeBand()/2;
            })
            .attr("y1", function (d, i) {
                return y(d3.min(d));
            })
            .attr("x2", function (d, i) {
                return x.range()[i] + x.rangeBand()/2;
            })
            .attr("y2", function (d, i) {
                return y(d3.quantile(d, 0.75));
            })
            .style("stroke", "black")
            .style("stroke-width", "2px");



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
                if (data.features[graph].type === "mut") line3 = "";
                else line3 = "z-score: " + (data.features[graph].zScores[indices[index]]).toFixed(4);
            }
        }

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

        if (graph !== "target" && data.features[graph].type === "mut") { //add mutations to tooltip if it's a mut feature
            for (var i = 0; i < a.mutations.length; i++) {
                if (a.mutations[i].feature === data.features[graph].name && a.mutations[i].cellline === data.cellline[indices[index]]) {
                    tooltip.append("div")
                        .text("Mutations:")
                        .style("font","12px Arial")                        
                        .selectAll("div")
                        .data(a.mutations[i].mutations)
                        .enter()
                        .append("div")
                        .style("margin-left","10px")
                        .style("font", "11px Arial")
                        .text(function (d) {
                            return d.mut;
                        });
                }
            }

        }

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

    function updateBoxTooltip(feature, boxIndex, bucketMembers, bucketNumbers) { 
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

        var tooltip = d3.select("#" + feature + " .boxTooltip")
            .style("visibility", "visible");

        tooltip.selectAll("*").remove();

        tooltip.append("div")
            .attr("class", "tooltipExit")
            .style("text-align", "center")
            .style("font", "10px Arial")
            .style("margin-bottom","5px")
            .style("background-color", "silver")
            .text("Click to hide")
            .on("click", function () {
                $("#" + feature + " .boxTooltip").css("visibility","hidden");
            });            

        tooltip.append("div")
            .attr("id", "bucketTitle")
            .style("text-align", "center")
            .style("font", "bold 14px Arial")
            .text(function () {
                var mutText;
                return boxIndex + " Mutant Alleles (" + bucketMembers.length + " lines)";
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
            .text("Mutations, if any, are listed under cell line entries")
            .style("font", "10px Arial")
            .style("margin-bottom", "4px")
            .style("text-align", "center");

        var bucketMemberWrapper = tooltip.append("div")
            .style("background-color", "rgb(240,240,240)")
            .style("display", "inline-block")
            .style("width", "inherit")
            .style("height", (scatterHeight - 190) + "px") //hardcoded
            .style("overflow-y", "auto");


        var bucketMemberDivs = bucketMemberWrapper.selectAll("div .bucketMembers")
            .data(bucketDetails)
            .enter()
            .append("div")
            .attr("class", "bucketMembers");

        bucketMemberDivs.append("div")
            .style("margin-left", "4px")
            .style("word-wrap","break-word")
            .style("margin-top", "4px")            
            .style("font", "12px Arial")
            .text(function (d, i) {
                return d.name;                    
            });

        bucketMemberDivs.each(function (d, i) { //bind mutation array to each bucket member div
            d3.select(this)
                .selectAll("div .mutations")
                .data(d.mutations)
                .enter()
                .append("div")
                .attr("class", "mutations")
                .style("font","11px Arial")
                .style("margin-left", "20px")
                .style("margin-top", "2px")
                .text(function (d, i) {
                    return d.mut;
                });                
        });

        console.log(bucketMemberDivs);

    }

    function updateScatterTooltip(graph, cellline, e) { //Updates the scatterplot tooltip whenever mouse is over a circle
        //graph = string, id of the graph, cellline = string, name of cellline, e = emitted mouse event
        var graphElement = $("#" + graph);

        var tooltip = d3.select("#tooltip")
            .style("display","block")
            .style("left",(e.x + 1) + "px")
            .style("top", (e.y + 1) + "px")
            .style("width", "auto")
            .style("height", "auto");

        tooltip.selectAll("*").remove();

        tooltip.append("div") 
            .style("font","12px Arial")
            .text(cellline);

    }

    initWindow();
    sortGraphValues();


}