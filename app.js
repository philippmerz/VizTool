$(document).ready(function () {
  fetch("./data/data.json")
    .then(response => response.json())
    .then(d => {
      fetch('./data/attrInfo.json')
        .then(response => {
          return response.json();
        })
        .then(attrInfo => initialize(d, attrInfo)); //entrypoint
    });

  function initialize(ds, attrInfo) {
    //Initialize vital vars
    setupModal();
    let genericGroup = document.querySelector('.group').cloneNode(true);
    let attributes = Object.keys(ds[0]);

    startSelect2(attributes, document.querySelector('.attributes-select2'));
    autocomplete(document.querySelector('.autocomplete > input'), attributes, attrInfo);

    //Add event listeners to toggle visibility of remove button on first group and first crit
    eventToggleVisibility(document.querySelector('.group'));
    eventToggleVisibility(document.querySelector('.criterion'));

    //Add eventlistener for the 'add criterion' buttons 
    document.querySelector('.add-criterion').addEventListener('click', e => {
      addCritForm(e.target, attributes, genericGroup.querySelector('.criterion').cloneNode(true), attrInfo);
    });

    //Add eventlistener for 'add group' buttons
    document.querySelector('#add-group').addEventListener('click', e => {
      addGroup(e.target, attributes, genericGroup.cloneNode(true), attrInfo);
    });

    //Add eventlistener for remove buttons
    let removes = Array.from(document.querySelectorAll('.remove'));
    removes.forEach((el) => el.addEventListener('click', e => removeSafely(e.target.parentNode.parentNode)));

    // Add eventlistener to criterion inputs
    let attrCrit = Array.from(document.querySelectorAll('.autocomplete > input'));
    attrCrit.forEach(el => el.addEventListener('input',
      (e) => updateDataType(e.target.value, e.target, attributes, attrInfo)));

    // Add eventlistener for showing visualizations
    document.querySelector('#show').addEventListener('click', () => showVisualizations(ds, attrInfo));
  }

  function updateDataType(maybeAttribute, inputEl, attributes, attrInfo) {
    // only proceed if input (maybeAttribute) is valid attribute name
    if (attributes.includes(maybeAttribute)) {
      // If attr is categorical, autocomplete value field with all possible categories
      evenSpacing = inputEl.parentNode.parentNode.querySelector(".even-spacing");
      if (attrInfo[maybeAttribute]['type'] == 'categorical') {
        if (evenSpacing.querySelector('.continuous')) evenSpacing.removeChild(evenSpacing.querySelector('.continuous'));
        if (evenSpacing.querySelector('.select2')) evenSpacing.removeChild(evenSpacing.querySelector('.select2'));
        categoricalInput = document.querySelector('#cat-attr').content.cloneNode(true);
        inputEl.parentNode.parentNode.querySelector(".even-spacing").prepend(categoricalInput);
        startSelect2(attrInfo[maybeAttribute]['values'], inputEl.parentNode.parentNode.querySelector(".even-spacing > select"));
      } else {
        // Remove any existing input
        if (evenSpacing.querySelector('.continuous')) evenSpacing.removeChild(evenSpacing.querySelector('.continuous'));
        if (evenSpacing.querySelector('.select2')) evenSpacing.removeChild(evenSpacing.querySelector('.select2'));
        continuousInput = document.querySelector('#cont-attr').content.cloneNode(true);
        Array.from(continuousInput.querySelectorAll('input')).forEach(el => {
          el.setAttribute('min', attrInfo[maybeAttribute]['min']);
          el.setAttribute('max', attrInfo[maybeAttribute]['max']);
        });
        inputEl.parentNode.parentNode.querySelector(".even-spacing").prepend(continuousInput);
      }
    }
  }

  function showVisualizations(data, attrInfo) {
    document.querySelector('#main').innerHTML = '';

    criteria = getCriteria();
    patientGroups = getPatientGroups(data, criteria, attrInfo);
    // TODO: add info to output panel
    attrToCompare = getAttributesToCompare();
    input = [patientGroups, attrToCompare];

    updateOutput(input);

    SPM(patientGroups.flat(5), attrToCompare);
    ridgeplot(patientGroups.flat(5), attrToCompare);

    HealthFigure(patientGroups, 800, 'main', attrToCompare).plotAt(0);
    dims = ['0 0 900 900', '-100 -250 1000 1100', '0 -300 625 625'];
    Array.from(document.querySelectorAll('#main svg')).forEach((e, i) => {
      e.setAttribute('viewBox', dims[i]);
    });
  }

  function updateOutput(input) {
    output = document.querySelector('#output');
    output.innerHTML = '';
    nulls = [];
    for (const group of input[0]) {
      nullsOfGroup = {};
      input[1].forEach(attr => nullsOfGroup[attr] = 0);
      for (const patient of group) {
        for (const attribute of input[1]) {
          if (patient[attribute] === null) nullsOfGroup[attribute]++;
        }
      }
      nulls.push(nullsOfGroup);
    }
    patientsPerGroup = input[0].map(el => el.length)
    outputString = '';
    for (const group in nulls) {
      console.log(group);
      outputString += `<p>Out of ${patientsPerGroup[group]} patients in Group ${parseInt(group) + 1}:\n</p><ul>`;
      for (const attribute in nulls[group]) {
        console.log(attribute);
        outputString += `<li><strong>${nulls[group][attribute]}</strong> don't have a value recorded for <strong>${attribute}</strong></li>`;
      }
      outputString += '</ul>';
    }
    if (patientsPerGroup.reduce((acc, len) => acc && (len == 0), true)) outputString = '<p style="color: darkred">There are no patients matching these criteria. Double check and try again.</p>';
    output.innerHTML += outputString;
  }

  function getPatientGroups(data, criteria, attrInfo) {
    patientGroups = [];
    for (const group of criteria) {
      patientGroups.push(data.filter(patient => isCritsMet(patient, group, attrInfo)));
    }

    // Add group number as parameter to each patient
    let groupNum = 1;
    for (const group of patientGroups) {
      for (const patient of group) {
        patient['gr'] = 'Group ' + groupNum;
      }
      groupNum++;
    }
    return patientGroups;
  }

  function isCritsMet(patient, crits, attrInfo) {
    isMet = true;
    for (const crit in crits) {
      if (!isMet) break;
      (patient[crit] === null)
      if (attrInfo[crit] == 'categorical') isMet = isMet && crits[crit] == patient[crit] && crits[crit];
      else isMet = isMet && patient[crit] > crits[crit][0] && patient[crit] < crits[crit][1] && !(patient[crit] === null);
    }
    return isMet;
  }

  function addCritForm(button, attr, copiedCrit, attrInfo) {
    //copy first criterion form and adjust relevant details 
    let input = copiedCrit.querySelector('.autocomplete > input');

    //add autocomplete to new input fields
    autocomplete(input, attr, attrInfo);

    //Insert cloned and altered form element at correct pos before 'add crit' button
    button.parentNode.insertBefore(copiedCrit, button);

    //hide button if max number of crit reached
    let critNum = getCritNum(copiedCrit.parentNode);
    if (critNum > 4) button.style.display = 'none';

    eventToggleVisibility(copiedCrit);

    input.addEventListener('input', (e) => updateDataType(e.target.value, e.target, attr, attrInfo));
    copiedCrit.querySelector('.remove').addEventListener('click', (e) => removeSafely(e.target.parentNode.parentNode));
  }

  function addGroup(button, attr, copiedGroup, attrInfo) {
    let groupNum = getGroupNum();
    let clonedCrit = copiedGroup.querySelector('.criterion').cloneNode(true);
    //adjust relevant details
    copiedGroup.querySelector('.group-h').innerHTML = "Group " + (groupNum + 1);
    let input = copiedGroup.querySelector('.autocomplete > input');
    autocomplete(input, attr, attrInfo);
    input.addEventListener('input', (e) => updateDataType(e.target.value, e.target.parentNode.querySelector('.even-spacing > input')));
    copiedGroup.querySelector('.add-criterion').addEventListener('click', (e) => addCritForm(
      e.target,
      attr,
      clonedCrit.cloneNode(true),
      attrInfo));

    button.parentNode.insertBefore(copiedGroup, button);

    if (groupNum > 1) button.style.display = 'none';

    Array.from(copiedGroup.querySelectorAll('.remove')).forEach((el, i) => el.addEventListener('click', (e) => removeSafely(e.target.parentNode.parentNode)));
    eventToggleVisibility(copiedGroup);
    eventToggleVisibility(copiedGroup.querySelector('.criterion'));
  }

  function eventToggleVisibility(node) {
    //Display remove button only when the corresponding crit / group is hovered over
    //and only if group / crit isnt the last element
    node.addEventListener('mouseover', (e) => {
      let isCrit = node.className.includes('criterion');
      let num;
      if (isCrit) {
        num = getCritNum(node.parentNode);
      } else {
        num = getGroupNum();
      }
      if (num > 1) {
        e.currentTarget.querySelector('.remove').style.display = 'initial';
      }
    });

    node.addEventListener('mouseleave', (e) => {
      e.currentTarget.querySelector('.remove').style.display = 'none';
    });
  }

  function getAttributesToCompare() {
    selector = '.select2-container--default .select2-selection--multiple .select2-selection__choice__display';
    attrElements = Array.from(document.querySelectorAll(selector));
    return attrElements.map(el => el.innerHTML);
  }

  function getCriteria() {
    // returns list of criteria grouped by group into lists
    // Example: [{attr1: crit1, attr2: crit2}, {attr1: crit1, attr2: crit2, attr3: crit3}]
    criteria = [];
    let i = 0;

    // loop over every group
    for (const group of document.querySelectorAll('.group')) {
      criteria.push({});

      // loop over every criterion in a group
      for (const crit of group.querySelectorAll('.criterion')) {
        let value = 0;

        // get value of criterion depending on whether its continuous or categorical
        let existsCont = crit.querySelector('.continuous');
        if (existsCont) value = Array.from(existsCont.querySelectorAll('input')).map((i) => i.value);
        else value = crit.querySelector('.select2-selection__rendered').innerHTML;

        // add value to dict with attribute name as key
        criteria[i][crit.querySelector('.autocomplete > input').value] = value;
      }
      i++;
    }

    return criteria;
  }

  function removeSafely(node) {
    let isCrit = node.className.includes('criterion');

    //Make add button visible again if it is invisible 
    if (isCrit) toggleVsibility(node.parentNode.querySelector('.add-criterion'), true);
    else toggleVsibility(document.querySelector('#add-group'), true);

    node.remove();

    //update header of group
    groups = Array.from(getChildrenOfClass('group'));
    groups.forEach((el, i) => el.querySelector('.group-h').innerHTML = 'Group ' + (i + 1));
  }

  function setupModal() {
    var modal = document.getElementById("myModal");

    // Get the button that opens the modal
    var btn = document.getElementById("myBtn");

    // Get the <span> element that closes the modal
    var span = document.getElementsByClassName("close")[0];

    // When the user clicks the button, open the modal 
    btn.onclick = function () {
      modal.style.display = "block";
    }

    // When the user clicks on <span> (x), close the modal
    span.onclick = function () {
      modal.style.display = "none";
    }

    // When the user clicks anywhere outside of the modal, close it
    window.onclick = function (event) {
      if (event.target == modal) {
        modal.style.display = "none";
      }
    }
  }

  //Helper functions
  function getGroupNum() {
    return getChildrenOfClass('group').length;
  }

  function getCritNum(node) {
    return getChildrenOfClass('criterion', node).length;
  }

  function getChildrenOfClass(className, node = document) {
    return node.querySelectorAll('.' + className);
  }

  function toggleVsibility(node, onlyIfHidden = false) {
    toggle = (!onlyIfHidden || node.style.display == 'none');
    if (toggle) node.style.display = (node.style.display == 'none') ? 'initial' : 'none';
  }

  function startSelect2(attr, select) {
    // select2 is a library used here for the tokenized textarea, under 'compare' section
    $(select).select2();
    for (i = 0; i < attr.length; i++) {
      el = document.createElement("option");
      el.innerHTML = attr[i];
      select.appendChild(el)
    }
  }

  //uses https://d3js.org/d3.v5.min.js
  //creds to https://github.com/zhangyu94/d3-scatterplot-matrix
  function SPM(grlist, attributes) {

    (function (root, factory) {
      "use strict";

      const libName = "scatterplotMatrix"
      if (typeof define === "function" && define.amd) {
        // AMD 
        define(libName, ["d3"], factory);
      } else if (typeof exports === "object") {
        // Node, CommonJS
        module.exports = factory(require("d3"))
      } else {
        // Browser globals (root is window)
        // register scatterplotMatrix to d3
        root.d3 = root.d3 || {};
        root.d3[libName] = factory(root.d3)
      }
    })(this, function (d3) {
      let scatterplotMatrix = function () {
        let width = 800,
          height = 800,
          padding = 20,
          margin = {
            top: 0,
            right: 100,
            bottom: 0,
            left: 10
          },
          duration = 500,
          traits = null, // the traits used in scatter plots
          colorValueMapper = d => d.label,
          rMapper = _ => 3.5,
          strokeMapper = _ => "black",
          drawLegend = true,
          enableBrush = true,
          enableZoom = false,
          zoomMode = "filterAxis",
          labelMode = "diagonal",
          tickLabelMode = "side"

        const cross = function (a, b) {
          let c = []
          for (let i = 0; i < a.length; ++i) {
            for (let j = 0; j < b.length; ++j) {
              c.push({
                x: a[i],
                i: i,
                y: b[j],
                j: j
              });
            }
          }
          return c;
        }

        const createClass = function (name, rules) {
          let style = document.createElement("style");
          style.type = "text/css";
          document.getElementsByTagName("head")[0].appendChild(style);
          if (!(style.sheet || {}).insertRule)
            (style.styleSheet || style.sheet).addRule(name, rules);
          else
            style.sheet.insertRule(name + "{" + rules + "}", 0);
        }

        const hiddenClass = "hidden-" + Math.floor(Math.random() * 100000000)
        const cellClass = "cell-" + Math.floor(Math.random() * 100000000)
        createClass("." + hiddenClass, "fill: #ccc !important;");
        createClass(".axis line", "stroke: #ddd")
        createClass(".axis path", "display: none")

        function chart(selection) {
          console.assert((enableBrush && enableZoom) !== true, "brush and zoom cannot be used together")
          console.assert(["filterAxis", "filterData"].includes(zoomMode), "invalid zoomMode: ", zoomMode)
          console.assert(["diagonal", "all"].includes(labelMode), "invalid labelMode: ", labelMode)
          console.assert(["side", "all"].includes(tickLabelMode), "invalid tickLabelMode: ", tickLabelMode)

          selection.each(function (data) {
            let n = traits.length

            // size of each cell
            let widthCell = Math.floor((width - padding - margin.left - margin.right) / n)
            let heightCell = Math.floor((height - padding - margin.top - margin.bottom) / n)

            // for each trait
            let domainByTrait = {} // the value range
            let xByTrait = {} // x value mapping
            let yByTrait = {} // y value mapping
            let xAxisByTrait = {} // xAxis renderer
            let yAxisByTrait = {} // yAxis renderer
            traits.forEach(trait => {
              domainByTrait[trait] = d3.extent(data, d => d[trait])
              xByTrait[trait] = d3.scaleLinear()
                .range([padding / 2, widthCell - padding / 2])
              yByTrait[trait] = d3.scaleLinear()
                .range([heightCell - padding / 2, padding / 2])
              xAxisByTrait[trait] = d3.axisBottom()
                .scale(xByTrait[trait])
                .ticks(6)
                .tickSize(heightCell * n)
              yAxisByTrait[trait] = d3.axisLeft()
                .scale(yByTrait[trait])
                .ticks(6)
                .tickSize(-widthCell * n)
            });

            let color = d3.scaleOrdinal(d3.schemeCategory10);

            d3.select(this).selectAll("*").remove()

            let svg = d3.select(this)
              .attr("width", width)
              .attr("height", height)
              .append("g")
              .attr("transform", "translate(" +
                (margin.left + padding / 2) + "," +
                (margin.top + padding / 2) + ")");

            let xAxisData = null
            let yAxisData = null
            if (labelMode === "diagonal") {
              xAxisData = cross(traits, traits).filter(d => d.j === 0)
              yAxisData = cross(traits, traits).filter(d => d.i === 0)
            } else if (labelMode === "all") {
              xAxisData = cross(traits, traits)
              yAxisData = cross(traits, traits)
            }

            svg.selectAll(".x.axis")
              .data(xAxisData)
              .enter().append("g")
              .attr("class", "x axis")
              .attr("transform", (d, _) => "translate(" + (n - d.i - 1) * widthCell + "," + (-d.j * heightCell) + ")")
              .each(function (d) {
                xByTrait[d.x].domain(domainByTrait[d.x]);
                d3.select(this).call(xAxisByTrait[d.x]);
              });
            svg.selectAll(".y.axis")
              .data(yAxisData)
              .enter().append("g")
              .attr("class", "y axis")
              .attr("transform", (d, _) => "translate(" + d.i * widthCell + "," + d.j * heightCell + ")")
              .each(function (d) {
                yByTrait[d.y].domain(domainByTrait[d.y]);
                d3.select(this).call(yAxisByTrait[d.y]);
              });

            const plot = function (p) {
              let cell = d3.select(this);

              xByTrait[p.x].domain(domainByTrait[p.x]);
              yByTrait[p.y].domain(domainByTrait[p.y]);

              cell.append("rect")
                .attr("class", "frame")
                .attr("fill", "none")
                .attr("stroke", "#aaa")
                .attr("shape-rendering", "crispEdges")
                .attr("x", padding / 2)
                .attr("y", padding / 2)
                .attr("width", widthCell - padding)
                .attr("height", heightCell - padding);

              cell.selectAll("circle")
                .data(data)
                .enter().append("circle")
                .attr("fill-opacity", 0.7)
                .attr("cx", d => xByTrait[p.x](d[p.x]))
                .attr("cy", d => yByTrait[p.y](d[p.y]))
                .attr("r", rMapper)
                .style("stroke", strokeMapper)
                .style("stroke-width", "1px")
                .style("fill", d => color(colorValueMapper(d)));
            }

            let cell = svg.selectAll("." + cellClass)
              .data(cross(traits, traits))
              .enter().append("g")
              .attr("class", cellClass)
              .attr("transform", d => "translate(" + (n - d.i - 1) * widthCell + "," + d.j * heightCell + ")")
              .each(plot);

            // titles for the diagonal / all
            let cellText = null
            if (labelMode === "diagonal") {
              cellText = cell.filter(d => d.i === d.j)
                .append("text")
                .text(d => d.x)
            } else if (labelMode === "all") {
              cellText = cell.append("text")
                .text(d => d.y + '/' + d.x)
            }
            cellText.attr("x", padding)
              .attr("y", padding)
              .attr("dy", ".71em")
              .attr("fill", "black")
              .style("font", "10px sans-serif")

            if (drawLegend) {
              let legend = svg.selectAll(".legend")
                .data(color.domain())
              let legendG = legend.enter().append("g")
                .attr("class", "legend")
              legendG.append("rect")
                .attr("width", 18)
                .attr("height", 18)
              legendG.append("text")
                .attr("y", 9)
                .attr("dy", ".35em")
                .style("text-anchor", "end")
              legend.exit().remove()

              legend = svg.selectAll(".legend")
                .attr("transform", (_, i) => "translate(" + (-margin.left - 18 - padding) + "," + i * 20 + ")")
              legend.select("rect")
                .attr("x", width)
                .style("fill", color);

              legend.select("text")
                .attr("x", width - 6)
                .attr("fill", "black")
                .text(d => d);
            }

            if (enableBrush) {
              let brushCell;

              // Clear the previously-active brush, if any.
              const brushStarted = function (p) {
                if (brushCell !== this) {
                  d3.select(brushCell).call(brush.move, null);
                  brushCell = this;
                  xByTrait[p.x].domain(domainByTrait[p.x]);
                  yByTrait[p.y].domain(domainByTrait[p.y]);
                }
              }

              // Highlight the selected circles.
              const brushMoved = function (p) {
                let e = d3.brushSelection(this);
                svg.selectAll("circle").classed(hiddenClass, function (d) {
                  return !e ?
                    false :
                    (
                      e[0][0] > xByTrait[p.x](+d[p.x]) || xByTrait[p.x](+d[p.x]) > e[1][0] ||
                      e[0][1] > yByTrait[p.y](+d[p.y]) || yByTrait[p.y](+d[p.y]) > e[1][1]
                    );
                });
              }

              // If the brush is empty, select all circles.
              const brushEnded = function () {
                let e = d3.brushSelection(this);
                if (e === null) svg.selectAll("." + hiddenClass).classed(hiddenClass, false);
              }

              let brush = d3.brush()
                .on("start", brushStarted)
                .on("brush", brushMoved)
                .on("end", brushEnded)
                .extent([
                  [0, 0],
                  [widthCell, heightCell]
                ]);

              cell.call(brush)
            }

            if (enableZoom) {
              let zoom = function () {
                let t = svg.transition().duration(duration);

                svg.selectAll(".x.axis").each(function (d) {
                  d3.select(this).transition(t).call(xAxisByTrait[d.x])
                });
                svg.selectAll(".y.axis").each(function (d) {
                  d3.select(this).transition(t).call(yAxisByTrait[d.y])
                });

                cell.each(function (p) {
                  d3.select(this).selectAll("circle")
                    .transition(t)
                    .attr("cx", d => xByTrait[p.x](d[p.x]))
                    .attr("cy", d => yByTrait[p.y](d[p.y]))
                    .attr("display", function (d) {
                      // hide dots not inside their own cell
                      if (d[p.x] < xByTrait[p.x].domain()[0] || d[p.x] > xByTrait[p.x].domain()[1])
                        return "none"
                      if (d[p.y] < yByTrait[p.y].domain()[0] || d[p.y] > yByTrait[p.y].domain()[1])
                        return "none"
                    })
                })
              }

              let brushEnded = function (d) {
                if (d3.event.sourceEvent.type === "end")
                  return

                let extent = d3.event.selection

                if (zoomMode == "filterAxis") {
                  if (!extent) {
                    xByTrait[d.x].domain(domainByTrait[d.x]);
                    yByTrait[d.y].domain(domainByTrait[d.y]);
                  } else {
                    xByTrait[d.x].domain([extent[0][0], extent[1][0]].map(xByTrait[d.x].invert, xByTrait[d.x]));
                    yByTrait[d.y].domain([extent[1][1], extent[0][1]].map(yByTrait[d.y].invert, yByTrait[d.y]));
                    cell.call(brush.move, null);
                  }
                } else if (zoomMode == "filterData") {
                  if (!extent) {
                    traits.forEach(trait => {
                      domainByTrait[trait] = d3.extent(data, d => d[trait])
                      xByTrait[trait].domain(domainByTrait[trait]);
                      yByTrait[trait].domain(domainByTrait[trait]);
                    })
                  } else {
                    let xMin = xByTrait[d.x].invert(extent[0][0])
                    let xMax = xByTrait[d.x].invert(extent[1][0])
                    let yMin = yByTrait[d.y].invert(extent[1][1])
                    let yMax = yByTrait[d.y].invert(extent[0][1])

                    let dataFiltered = data.filter(item => {
                      let xCondition = (item[d.x] >= xMin) && (item[d.x] <= xMax)
                      let yCondition = (item[d.y] >= yMin) && (item[d.y] <= yMax)
                      return xCondition && yCondition
                    })

                    traits.forEach(trait => {
                      domainByTrait[trait] = d3.extent(dataFiltered, d => d[trait])
                      xByTrait[trait].domain(domainByTrait[trait]);
                      yByTrait[trait].domain(domainByTrait[trait]);
                    })
                    cell.call(brush.move, null);
                  }
                }
                zoom()
              }

              let brush = d3.brush()
                .extent([
                  [0, 0],
                  [widthCell, heightCell]
                ])
                .on("end", brushEnded)
              cell.call(brush)
            }
          })
        }

        chart.width = function (value) {
          if (!arguments.length) return width
          console.assert(typeof (value) === "number", "invalid width", value)
          width = value
          return chart
        }

        chart.height = function (value) {
          if (!arguments.length) return height
          console.assert(typeof (value) === "number", "invalid height", value)
          height = value
          return chart
        }

        chart.padding = function (value) {
          if (!arguments.length) return padding
          console.assert(typeof (value) === "number", "invalid padding", value)
          padding = value
          return chart
        }

        chart.margin = function (value) {
          if (!arguments.length) return margin
          console.assert(typeof (value) === "object", "invalid margin", value)
          if (typeof (value.top) === "number")
            margin.top = value.top
          if (typeof (value.right) === "number")
            margin.right = value.right
          if (typeof (value.bottom) === "number")
            margin.bottom = value.bottom
          if (typeof (value.left) === "number")
            margin.left = value.left
          return chart
        }

        chart.duration = function (value) {
          if (!arguments.length) return duration
          console.assert(typeof (value) === "number", "invalid duration", value)
          duration = value
          return chart
        }

        chart.traits = function (value) {
          if (!arguments.length) return traits
          console.assert(typeof (value) === "object", "invalid traits", value)
          traits = value
          return chart
        }

        chart.colorValueMapper = function (value) {
          if (!arguments.length) return colorValueMapper
          console.assert(typeof (value) === "function", "invalid colorValueMapper", value)
          colorValueMapper = value
          return chart
        }

        chart.rMapper = function (value) {
          if (!arguments.length) return rMapper
          console.assert(typeof (value) === "function", "invalid rMapper", value)
          rMapper = value
          return chart
        }

        chart.strokeMapper = function (value) {
          if (!arguments.length) return strokeMapper
          console.assert(typeof (value) === "function", "invalid strokeMapper", value)
          strokeMapper = value
          return chart
        }

        chart.drawLegend = function (value) {
          if (!arguments.length) return drawLegend
          console.assert(typeof (value) === "boolean", "invalid drawLegend", value)
          drawLegend = value
          return chart
        }

        chart.enableBrush = function (value) {
          if (!arguments.length) return enableBrush
          console.assert(typeof (value) === "boolean", "invalid enableBrush", value)
          enableBrush = value
          return chart
        }

        chart.enableZoom = function (value) {
          if (!arguments.length) return enableZoom
          console.assert(typeof (value) === "boolean", "invalid enableZoom", value)
          enableZoom = value
          return chart
        }

        chart.zoomMode = function (value) {
          if (!arguments.length) return zoomMode
          console.assert(typeof (value) === "string", "invalid zoomMode", value)
          zoomMode = value
          return chart
        }

        chart.labelMode = function (value) {
          if (!arguments.length) return labelMode
          console.assert(typeof (value) === "string", "invalid labelMode", value)
          labelMode = value
          return chart
        }

        chart.tickLabelMode = function (value) {
          if (!arguments.length) return tickLabelMode
          console.assert(typeof (value) === "string", "invalid tickLabelMode", value)
          tickLabelMode = value
          return chart
        }

        return chart
      }
      return scatterplotMatrix
    })


    let chart = d3.scatterplotMatrix()
      .traits(attributes)
      .colorValueMapper(d => d.gr)


    let svg = d3.select('#main').append('svg')
      .datum(grlist)
      .call(chart)
  }

  //The following code is taken from https://www.w3schools.com/howto/howto_js_autocomplete.asp
  //Autocompletes text in an input field where the autocoplete options are taken from an array
  function autocomplete(inp, arr, attrInfo) {
    /*the autocomplete function takes two arguments,
    the text field element and an array of possible autocompleted values:*/
    var currentFocus;
    /*execute a function when someone writes in the text field:*/
    inp.addEventListener("input", function (e) {
      var a, b, i, val = this.value;
      /*close any already open lists of autocompleted values*/
      closeAllLists();
      if (!val) {
        return false;
      }
      currentFocus = -1;
      /*create a DIV element that will contain the items (values):*/
      a = document.createElement("DIV");
      a.setAttribute("id", this.id + "autocomplete-list");
      a.setAttribute("class", "autocomplete-items");
      /*append the DIV element as a child of the autocomplete container:*/
      this.parentNode.appendChild(a);
      /*for each item in the array...*/
      for (i = 0; i < arr.length; i++) {
        /*check if the item starts with the same letters as the text field value:*/
        if (arr[i].substr(0, val.length).toUpperCase() == val.toUpperCase()) {
          /*create a DIV element for each matching element:*/
          b = document.createElement("DIV");
          /*make the matching letters bold:*/
          b.innerHTML = "<strong>" + arr[i].substr(0, val.length) + "</strong>";
          b.innerHTML += arr[i].substr(val.length);
          /*insert a input field that will hold the current array item's value:*/
          b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
          /*execute a function when someone clicks on the item value (DIV element):*/
          b.addEventListener("click", function (e) {
            /*insert the value for the autocomplete text field:*/
            inp.value = this.getElementsByTagName("input")[0].value;

            //modified by group: also change type of criterion input to match attribute data type
            updateDataType(inp.value, inp, arr, attrInfo);
            /*close the list of autocompleted values,
            (or any other open lists of autocompleted values:*/
            closeAllLists();
          });
          a.appendChild(b);
        }
      }
    });
    /*execute a function presses a key on the keyboard:*/
    inp.addEventListener("keydown", function (e) {
      var x = document.getElementById(this.id + "autocomplete-list");
      if (x) x = x.getElementsByTagName("div");
      if (e.keyCode == 40) {
        /*If the arrow DOWN key is pressed,
        increase the currentFocus variable:*/
        currentFocus++;
        /*and and make the current item more visible:*/
        addActive(x);
      } else if (e.keyCode == 38) { //up
        /*If the arrow UP key is pressed,
        decrease the currentFocus variable:*/
        currentFocus--;
        /*and and make the current item more visible:*/
        addActive(x);
      } else if (e.keyCode == 13) {
        /*If the ENTER key is pressed, prevent the form from being submitted,*/
        e.preventDefault();
        if (currentFocus > -1) {
          /*and simulate a click on the "active" item:*/
          if (x) x[currentFocus].click();
        }
      }
    });

    function addActive(x) {
      /*a function to classify an item as "active":*/
      if (!x) return false;
      /*start by removing the "active" class on all items:*/
      removeActive(x);
      if (currentFocus >= x.length) currentFocus = 0;
      if (currentFocus < 0) currentFocus = (x.length - 1);
      /*add class "autocomplete-active":*/
      x[currentFocus].classList.add("autocomplete-active");
    }

    function removeActive(x) {
      /*a function to remove the "active" class from all autocomplete items:*/
      for (var i = 0; i < x.length; i++) {
        x[i].classList.remove("autocomplete-active");
      }
    }

    function closeAllLists(elmnt) {
      /*close all autocomplete lists in the document,
      except the one passed as an argument:*/
      var x = document.getElementsByClassName("autocomplete-items");
      for (var i = 0; i < x.length; i++) {
        if (elmnt != x[i] && elmnt != inp) {
          x[i].parentNode.removeChild(x[i]);
        }
      }
    }
    /*execute a function when someone clicks in the document:*/
    document.addEventListener("click", function (e) {
      closeAllLists(e.target);
    });
  }
});