let par = {"code": "1", "lang": "de"};
let types;



/* This function returns meta information about a given type and code. 
    If the code parameter is missing a list of all available codes is returned. 
    This meta information includes translations and type specific data. 
    See data/types.json for all available types and codes. */
function info(type, code) {
  return types[type].filter(t => t.code == code)[0];
}

/* This functions parametrizes the diagrams for a given forestType */
function parametrizeDiagrams(code) {
  let forestType = info("forestType", code);
  // reset all parameters to default state "rare"
  document.querySelectorAll(".veryFrequent, .lessFrequent, .rare").forEach((elem)=>{setFrequency(elem, "rare")});
  // set selected parameters for frequency ("veryFrequent", "lessFrequent")
  forestType.veryFrequent.forEach((id)=>{setFrequency(document.getElementById(id), "veryFrequent")});
  forestType.lessFrequent.forEach((id)=>{setFrequency(document.getElementById(id), "lessFrequent")});
  // set title for forest type
  let elem = document.getElementById("forestType");
  elem.querySelector(".de").innerHTML = forestType.code + " - " + forestType.de;
  elem.querySelector(".fr").innerHTML = forestType.code + " - " + forestType.fr;
  par.code = code;
}

/* helper functions to set state to "rare", "lessFrequent" or "veryFrequent" */
function setFrequency(elem, freq) {
  elem.classList = [freq];
  elem.onmousemove = ()=>{showTooltip(event, tooltipText[freq])};
}

/* helper functions to show & hide tooltip */
function showTooltip(evt, text) {
  let elem = document.getElementById("tooltip");
  elem.querySelector(".de").innerHTML = text.de;
  elem.querySelector(".fr").innerHTML = text.fr;
  tooltip.style.display = "block";
  tooltip.style.left = evt.pageX + 10 + 'px';
  tooltip.style.top = evt.pageY + 10 + 'px';
}

function hideTooltip() {
  let tooltip = document.getElementById("tooltip");
  tooltip.style.display = "none";
}

/* helper function to make only selected lang visible */
function setLang(lang) {
  document.querySelectorAll(".de, .fr").forEach(e=>{e.classList.add("invisible")});
  document.querySelectorAll("."+lang).forEach(e=>{e.classList.remove("invisible")});
  par.lang = lang;
  ForestTypeDropdown();
}

/* read params from URL */
function readURL() {
  let searchParams = new URLSearchParams(location.search);

  if (searchParams.has("code")) {
    par.code = searchParams.get("code");
  }
  parametrizeDiagrams(par.code);

  if (searchParams.has("lang")) {
    par.lang = searchParams.get("lang");
  }
  setLang(par.lang);
  pushURL();
}

/* Generate URL search params for the current view and push it to the window history */
function pushURL() {
  let baseUrl = location.protocol + "//" + location.host + location.pathname;
  let searchParams = new URLSearchParams();
  searchParams.set("lang", par.lang);
  searchParams.set("code", par.code);
  let params = "?" + searchParams.toString();
  let url = baseUrl + params;
  window.history.pushState({}, window.title, url);
}
class SPARQLQueryDispatcher {
	constructor( endpoint ) {
		this.endpoint = endpoint;
	}

	query( sparqlQuery ) {
		const fullUrl = this.endpoint + '?query=' + encodeURIComponent( sparqlQuery );
		const headers = { 'Accept': 'application/sparql-results+json' };

		return fetch( fullUrl, { headers } ).then( body => body.json() );
	}
}

const endpointUrl = 'https://test.ld.admin.ch/query'; 

let tooltipText = {
    "rare": {
      "de": "selten",
      "fr": "rare"
    },
    "lessFrequent": {
      "de": "weniger häufig",
      "fr": "moins fréquente"
    },
    "veryFrequent": {
      "de": "sehr häufig",
      "fr": "très fréquente"
    }
}

async function nameQuery(){
  const queryDispatcher = new SPARQLQueryDispatcher(endpointUrl);
  const sparqlQueryName =
  `PREFIX schema: <http://schema.org/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
SELECT ?id ?name_de ?name_fr ?name_it ?name_la WHERE {
    ?wg schema:inDefinedTermSet <https://ld.admin.ch/wald/waldgesellschaften>.
    ?wg schema:name ?name_de,?name_fr, ?name_it, ?name_la.
  	?wg schema:identifier ?id.
  FILTER (lang(?name_de)="de")
  FILTER (lang(?name_fr)="fr")
  FILTER (lang(?name_it)="it")
  FILTER (lang(?name_la)="la")
  }`;   
  const sparqlJSON = await queryDispatcher.query(sparqlQueryName);
  types = {
  forestType: sparqlJSON.results.bindings.map(entry => ({
    de: entry.name_de?.value ?? null,
    fr: entry.name_fr?.value ?? null,
    code: entry.id?.value ?? null,
    veryFrequent: [],
    lessFrequent: []
  }))
};
}

async function altQuery(){
  const queryDispatcher = new SPARQLQueryDispatcher(endpointUrl);
  const sparqlQuery =
  `PREFIX schema: <http://schema.org/>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
  PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
  SELECT ?id ?iden ?occ WHERE {
  ?wg schema:inDefinedTermSet <https://ld.admin.ch/wald/waldgesellschaften>.
  ?wg  (<https://ld.admin.ch/wald/waldgesellschaften/occursAtAltitude>
        |<https://ld.admin.ch/wald/waldgesellschaften/occursAtExposition>
        |<https://ld.admin.ch/wald/waldgesellschaften/occursAtGradient>) ?obj .
  ?obj (<https://ld.admin.ch/wald/waldgesellschaften/altitude/occurrence/hasAltitude>
        |<https://ld.admin.ch/wald/waldgesellschaften/exposition/occurrence/hasExposition>
        |<https://ld.admin.ch/wald/waldgesellschaften/gradient/occurrence/hasGradient>)/schema:identifier ?iden.
  ?obj (<https://ld.admin.ch/wald/waldgesellschaften/altitude/occurrence/hasOccurrence>
		|<https://ld.admin.ch/wald/waldgesellschaften/exposition/occurrence/hasOccurrence>
  		|<https://ld.admin.ch/wald/waldgesellschaften/gradient/occurrence/hasOccurrence>)/schema:identifier ?occ.
  ?wg schema:identifier ?id.
  }`;
  const occurrenceData = await queryDispatcher.query(sparqlQuery);
  
  occurrenceData.results.bindings.forEach(entry => {
    const id = entry.id?.value;
    const iden = entry.iden?.value;
    const occ = entry.occ?.value;
    const target = types.forestType.find(ft => ft.code === id);
    if (!target) return; 
    if (occ === "1") {
      target.veryFrequent.push(iden);
    } else if (occ === "2") {
      target.lessFrequent.push(iden);
    }
  });
}

function ForestTypeDropdown() {
  const dropdown = document.getElementById("forestTypeSelect");
  dropdown.innerHTML = "";
  types.forestType.forEach(forest => {
    const option = document.createElement("option");
    option.value = forest.code;
     if (par.lang === "de") {
      option.textContent = forest.de;
    } else if (par.lang === "fr") {
      option.textContent = forest.fr;
    }
    dropdown.appendChild(option);
  });

  dropdown.addEventListener("change", function () {
    const selectedCode = this.value;
    if (selectedCode) {
      parametrizeDiagrams(selectedCode);
      pushURL();
    }
  });
}

async function initialize() {
  await nameQuery();
  await altQuery();
  addExampleForest();
  // read params from URL to initialize lang and code
  readURL();
  // add listener to buttons to choose a forest type
  document.querySelectorAll(".ft-button").forEach((button)=>{button.addEventListener("click", function (evt) {
    let code = evt.target.value;
    parametrizeDiagrams(code);
    pushURL();
  })});

  // add listener to buttons to switch language
  document.getElementById("languageSelect").addEventListener("change", function () {
    const lang = this.value; // Get the value of the selected option
    setLang(lang);
    pushURL();
  });

  // initialize print elements
  document.getElementById("version").innerHTML = "Version 0.1";
  document.getElementById("date").innerHTML = Date().toLocaleString();

  // add event listener to hide tooltip
  document.querySelectorAll("rect, path").forEach((elem)=>{elem.addEventListener("mouseout", hideTooltip)});

  // demo open URL on #HS_C-J
  document.getElementById("HS_C-J").addEventListener("click", ()=>{open("https://tree-app.ch/?mv=14%7C735882%7C5938511&ml=azt&mp=736251%7C5939154")});
  document.getElementById("HS_C-J").style.cursor="pointer";
  
  // add event listener to share buttons
  document.getElementById("share-mailto").addEventListener("click", ()=>{open("mailto:?body="+encodeURIComponent(location.href))});
  document.getElementById("print").addEventListener("click", ()=>{print()});
  }
initialize();

function addExampleForest() {

  const emptyType = {
    "de": "EmptyForest",
    "fr": "-",
    "code": "x",
    "veryFrequent": [],
    "lessFrequent": []
  };

  types.forestType.push(emptyType);
}