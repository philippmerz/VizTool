//source : https://www.d3-graph-gallery.com/graph/ridgeline_basic.html

function ridgeplot(data, dimensions) {
  // set the dimensions and margins of the graph
  var margin = {
      top: 100,
      right: 30,
      bottom: 30,
      left: 200
    },
    width = 600 - margin.left - margin.right,
    height = 370 - margin.top - margin.bottom;

  // append the svg object to the body of the page
  var svg = d3.select("#main")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform",
      "translate(" + margin.left + "," + margin.top + ")");


  // Get the different categories and count them
  var categories = dimensions
  var n = categories.length

  // Add X axis
  var x = d3.scaleLinear()
    .domain([-10, 20])
    .range([0, width]);
  svg.append("g")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(x));


  // Create a Y scale for densities
  var y = d3.scaleLinear()
    .domain([0, 0.4])
    .range([height, 0]);

  // Create the Y axis for names
  var yName = d3.scaleBand()
    .domain(categories)
    .range([0, height])
    .paddingInner(1)
  svg.append("g")
    .call(d3.axisLeft(yName));
  // Add X axis label:
  svg.append("text")
    .attr("text-anchor", "end")
    .attr("x", width - 20)
    .attr("y", height + 30)
    .text("Unit : 0.1");

  allDensity = []
  numOfGroups = data.map(p => p['gr']).filter((value, index, self) => self.indexOf(value) === index).length;
  colors = ['#1f77b4', '#ff7f0e', '#2ca02c'];
  for (let i = 0; i < numOfGroups; i++) {
    var kde = kernelDensityEstimator(kernelEpanechnikov(7), x.ticks(40)) // increase this 40 for more accurate density.
    allDensity[i] = [];
    for (j = 0; j < n; j++) {
      key = categories[j]
      density = kde(data
        .filter(function (d) {
          return d["gr"] === "Group " + (i + 1);
        })
        .map(function (d) {
          return d[key];
        }))
      allDensity[i].push({
        key: key,
        density: density
      })
    }
    svg.selectAll("areas")
      .data(allDensity[i])
      .enter()
      .append("path")
      .attr("transform", function (d) {
        return ("translate(0," + (yName(d.key) - height) + ")")
      })
      .datum(function (d) {
        return (d.density)
      })
      .attr("fill", colors[i])
      .attr("opacity", ".6")
      .attr("stroke", "#000")
      .attr("stroke-width", 1)
      .attr("d", d3.line()
        .curve(d3.curveBasis)
        .x(function (d) {
          return x(d[0]);
        })
        .y(function (d) {
          return y(d[1]);
        })
      )
  svg.append("circle").attr("cx", 320).attr("cy", 20 + (i * 30)).attr("r", 6).style("fill", colors[i])
  svg.append("text").attr("x", 330).attr("y", 20 + (i * 30)).text("Group " + (i + 1)).style("font-size", "15px").attr("alignment-baseline", "middle")
  }

  // Compute kernel density estimation
  function kernelDensityEstimator(kernel, X) {
    return function (V) {
      return X.map(function (x) {
        return [x, d3.mean(V, function (v) {
          return kernel(x - v);
        })];
      });
    };
  }

  function kernelEpanechnikov(k) {
    return function (v) {
      return Math.abs(v /= k) <= 1 ? 0.75 * (1 - v * v) / k : 0;
    };
  }

}