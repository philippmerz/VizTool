$(document).ready(function () {

  fetch("./data/data.json")
    .then(response => {
      return response.json();
    })
    .then(d => initialize(d)); //entrypoint

  function initialize(ds) {
    //Initialize vital vars
    let genericGroup = document.querySelector('.group').cloneNode(true);
    let attributes = Object.keys(ds[0]);

    startSelect2(attributes, document.querySelector('.attributes-select2'));
    autocomplete(document.querySelector('.autocomplete > input'), attributes);

    //Add event listeners to toggle visibility of remove button on first group and first crit
    eventToggleVisibility(document.querySelector('.group'));
    eventToggleVisibility(document.querySelector('.criterion'));

    //Add eventlistener for the 'add criterion' buttons 
    document.querySelector('.add-criterion').addEventListener('click', (e) => {
      addCritForm(e.target, attributes, genericGroup.querySelector('.criterion').cloneNode(true));
    });

    //Add eventlistener for 'add group' buttons
    document.querySelector('#add-group').addEventListener('click', (e) => {
      addGroup(e.target, attributes, genericGroup.cloneNode(true));
    });

    //Add eventlistener for remove buttons
    let removes = Array.from(document.querySelectorAll('.remove'));
    removes.forEach((el) => el.addEventListener('click', (e) => removeSafely(e.target.parentNode.parentNode)));

    // Add eventlistener to criterion inputs
    let attrCrit = Array.from(document.querySelectorAll('.autocomplete > input'));
    attrCrit.forEach((el) => el.addEventListener('input',
      (e) => updateDataType(e.target.value, e.target, attributes)));

    // Add eventlistener for showing visualizations
    document.querySelector('#show').addEventListener('click', showVisualizations);
  }

  function updateDataType(maybeAttribute, inputEl, attributes) {
    // only proceed if input (maybeAttribute) is valid attribute name
    if (attributes.includes(maybeAttribute)) {
      fetch("./data/attrInfo.json")
        .then(response => {
          return response.json();
        })
        .then(d => {
          // If attr is categorical, autocomplete value field with all possible categories
          evenSpacing = inputEl.parentNode.parentNode.querySelector(".even-spacing");
          if (d[maybeAttribute]['type'] == 'categorical') {
            if (evenSpacing.querySelector('.continuous')) evenSpacing.removeChild(evenSpacing.querySelector('.continuous'));
            if (evenSpacing.querySelector('.select2')) evenSpacing.removeChild(evenSpacing.querySelector('.select2'));
            categoricalInput = document.querySelector('#cat-attr').content.cloneNode(true);
            inputEl.parentNode.parentNode.querySelector(".even-spacing").prepend(categoricalInput);
            startSelect2(d[maybeAttribute]['values'], inputEl.parentNode.parentNode.querySelector(".even-spacing > select"));
          } else {
            // Remove any existing input
            if (evenSpacing.querySelector('.continuous')) evenSpacing.removeChild(evenSpacing.querySelector('.continuous'));
            if (evenSpacing.querySelector('.select2')) evenSpacing.removeChild(evenSpacing.querySelector('.select2'));
            continuousInput = document.querySelector('#cont-attr').content.cloneNode(true);
            inputEl.parentNode.parentNode.querySelector(".even-spacing").prepend(continuousInput);
          }
        });
    }
  }

  function showVisualizations() {
    criteria = getCriteria();
    console.log(criteria);
  }

  function addCritForm(button, attr, copiedCrit) {
    //copy first criterion form and adjust relevant details 
    let input = copiedCrit.querySelector('.autocomplete > input');

    //add autocomplete to new input fields
    autocomplete(input, attr);

    //Insert cloned and altered form element at correct pos before 'add crit' button
    button.parentNode.insertBefore(copiedCrit, button);

    //hide button if max number of crit reached
    let critNum = getCritNum(copiedCrit.parentNode);
    if (critNum > 4) button.style.display = 'none';
    eventToggleVisibility(copiedCrit);
    input.addEventListener('input', (e) => updateDataType(e.target.value, e.target.parentNode.querySelector('.even-spacing > select'), attr));
    copiedCrit.querySelector('.remove').addEventListener('click', (e) => removeSafely(e.target.parentNode.parentNode));
  }

  function addGroup(button, attr, copiedGroup) {
    let groupNum = getGroupNum();

    //adjust relevant details
    copiedGroup.querySelector('.group-h').innerHTML = "Group " + (groupNum + 1);
    let input = copiedGroup.querySelector('.autocomplete > input');
    autocomplete(input, attr);
    input.addEventListener('input', (e) => updateDataType(e.target.value, e.target.parentNode.querySelector('.even-spacing > input')));
    copiedGroup.querySelector('.add-criterion').addEventListener('click', (e) => addCritForm(
      e.target,
      attr,
      copiedGroup.querySelector('.criterion').cloneNode(true)));

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

  //The following code is taken from https://www.w3schools.com/howto/howto_js_autocomplete.asp
  //Autocompletes text in an input field where the autocoplete options are taken from an array
  function autocomplete(inp, arr) {
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
            updateDataType(inp.value, inp, arr);
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