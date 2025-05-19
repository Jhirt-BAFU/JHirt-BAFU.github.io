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
  addExamples();
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

function addExamples() {

  const emptyType = {
    "de": "Der Einsame Wald",
    "fr": "La forêt solitaire",
    "code": "0",
    "veryFrequent": [],
    "lessFrequent": []
  };
  const omniType ={
      "de": "Die omnipräsente Waldgesellschaft",
      "fr": "La station partout",
      "code": "100",
      "veryFrequent": [
        "HN_0-10", "HN_25-50", "HN_75-100", "E_N-NNE", "E_NE-ENE", "E_E-ESE", "E_SE-SSE", "E_S-SSW", "E_SW-WSW", "E_W-WNW", "E_NW-NNW", "HUF_rh_xero", "HUF_rh_hydro", "HUF_mo-rh_norm", "HUF_mo-typ_xero", "HUF_mo-typ_hydro", "HUF_mo-mull_norm", "HUF_mu-f_xero", "HUF_mu-f_hydro", "HUF_mu-l_norm", "HUF_V_Anmoor", "HUF_V_Kalkmull", "HUF_V_Tangel", "BE_GestRohB", "BE_Ranker_vernaesst", "BE_Regosol_norm", "BE_Regosol_vernaesst", "BE_Pararendz_norm", "BE_Pararendz_verbraunt", "BE_Rendz_vernaesst", "BE_Braunerd_norm", "BE_Braunerd_podso", "BE_Parabraunerd_vernaesst", "BE_Podsol_norm", "BE_Stauw_norm", "BE_Grundw_norm", "BE_V_OrgB", "BE_V_neutrBraune", "BE_V_Humuspod", "AM_B", "GS_2", "GS_4", "GS_6", "GS_8", "GS_10", "GS_12", "GS_14", "GS_16", "GS_18", "GS_20", "GS_22", "GS_24", "GS_26", "GS_28", "GS_30", "GS_32", "GS_34", "GS_36", "WVG_2", "WVG_4", "WVG_6", "WVG_8", "WVG_10", "WVG_12", "WVG_14", "WVG_16", "WVG_18", "WVG_20", "WVG_22", "WVG_24", "WVG_26", "WVG_28", "WVG_30", "WVG_32", "WVG_34", "WVG_36", "WVS_2", "WVS_4", "WVS_6", "WVS_8", "WVS_10", "WVS_12", "WVS_14", "WVS_16", "WVS_18", "WVS_20", "WVS_22", "WVS_24", "WVS_26", "WVS_28", "WVS_30", "WVS_32", "WVS_34", "WVS_36", "WVS_38", "WVS_40", "WVS_42", "KO_IS", "KO_L", "KO_lT", "U", "tU", "HL_N_300", "HL_N_400", "HL_N_500", "HL_N_600", "HL_N_700", "HL_N_800", "HL_N_900", "HL_N_1000", "HL_N_1100", "HL_N_1200", "HL_N_1300", "HL_N_1400", "HL_N_1500", "HL_N_1600", "HL_N_1700", "HL_N_1800", "HL_N_1900", "HL_N_2000", "HL_N_2100", "HL_N_2200", "HL_N_2300", "HL_EW_300", "HL_EW_400", "HL_EW_500", "HL_EW_600", "HL_EW_700", "HL_EW_800", "HL_EW_900", "HL_EW_1000", "HL_EW_1100", "HL_EW_1200", "HL_EW_1300", "HL_EW_1400", "HL_EW_1500", "HL_EW_1600", "HL_EW_1700", "HL_EW_1800", "HL_EW_1900", "HL_EW_2000", "HL_EW_2100", "HL_EW_2200", "HL_EW_2300", "HL_S_300", "HL_S_400", "HL_S_500", "HL_S_600", "HL_S_700", "HL_S_800", "HL_S_900", "HL_S_1000", "HL_S_1100", "HL_S_1200", "HL_S_1300", "HL_S_1400", "HL_S_1500", "HL_S_1600", "HL_S_1700", "HL_S_1800", "HL_S_1900", "HL_S_2000", "HL_S_2100", "HL_S_2200", "HL_S_2300", "HS_C-M", "HS_C-2a", "HS_C-4", "HS_C-5b", "HS_SM-M", "HS_SM-2a", "HS_UM-M", "HS_UM-2a", "HS_OM-M", "HS_OM-2a", "HS_UMOM-5b", "HS_HM-1", "HS_HM-2b", "HS_HM-4", "HS_SA-1", "HS_SA-2b", "HS_SA-4", "HS_SA-5b", "HS_OSA-3", "HS_HMspez-2b"
      ],
      "lessFrequent": [
        "HN_10-25", "HN_50-75", "HN_100", "E_NNE-NE", "E_ENE-E", "E_ESE-SE", "E_SSE-S", "E_SSW-SW", "E_WSW-W", "E_WNW-NW", "E_NNW-N", "HUF_rh_norm", "HUF_mo-rh_xero", "HUF_mo-rh_hydro", "HUF_mo-typ_norm", "HUF_mo-mull_xero", "HUF_mo-mull_hydro", "HUF_mu-f_norm", "HUF_mu-l_xero", "HUF_mu-l_hydro", "HUF_V_Torf", "HUF_V_Kalkmoder", "HUF_V_erod", "BE_Ranker_norm", "BE_Ranker_verbraunt", "BE_Regosol_vernaesst", "BE_Regosol_verbraunt", "BE_Pararendz_vernaesst", "BE_Rendz_norm", "BE_Rendz_verbraunt", "BE_Braunerd_vernaesst", "BE_Parabraunerd_norm", "BE_Parabraunerd_podso", "BE_Podsol_vernaesst", "BE_Stauw_nassgebl", "BE_Grundw_nassgebl", "BE_V_Auenb", "BE_V_Braunpod", "AM_S", "GS_1", "GS_3", "GS_5", "GS_7", "GS_9", "GS_11", "GS_13", "GS_15", "GS_17", "GS_19", "GS_21", "GS_23", "GS_25", "GS_27", "GS_29", "GS_31", "GS_33", "GS_35", "WVG_1", "WVG_3", "WVG_5", "WVG_7", "WVG_9", "WVG_11", "WVG_13", "WVG_15", "WVG_17", "WVG_19", "WVG_21", "WVG_23", "WVG_25", "WVG_27", "WVG_29", "WVG_31", "WVG_33", "WVG_35", "WVS_1", "WVS_3", "WVS_5", "WVS_7", "WVS_9", "WVS_11", "WVS_13", "WVS_15", "WVS_17", "WVS_19", "WVS_21", "WVS_23", "WVS_25", "WVS_27", "WVS_29", "WVS_31", "WVS_33", "WVS_35", "WVS_37", "WVS_39", "WVS_41", "KO_S", "KO_sL", "KO_tL", "T", "lU", "HL_N_250", "HL_N_350", "HL_N_450", "HL_N_550", "HL_N_650", "HL_N_750", "HL_N_850", "HL_N_950", "HL_N_1050", "HL_N_1150", "HL_N_1250", "HL_N_1350", "HL_N_1450", "HL_N_1550", "HL_N_1650", "HL_N_1750", "HL_N_1850", "HL_N_1950", "HL_N_2050", "HL_N_2150", "HL_N_2250", "HL_EW_250", "HL_EW_350", "HL_EW_450", "HL_EW_550", "HL_EW_650", "HL_EW_750", "HL_EW_850", "HL_EW_950", "HL_EW_1050", "HL_EW_1150", "HL_EW_1250", "HL_EW_1350", "HL_EW_1450", "HL_EW_1550", "HL_EW_1650", "HL_EW_1750", "HL_EW_1850", "HL_EW_1950", "HL_EW_2050", "HL_EW_2150", "HL_EW_2250", "HL_S_250", "HL_S_350", "HL_S_450", "HL_S_550", "HL_S_650", "HL_S_750", "HL_S_850", "HL_S_950", "HL_S_1050", "HL_S_1150", "HL_S_1250", "HL_S_1350", "HL_S_1450", "HL_S_1550", "HL_S_1650", "HL_S_1750", "HL_S_1850", "HL_S_1950", "HL_S_2050", "HL_S_2150", "HL_S_2250", "HS_C-J", "HS_C-1", "HS_C-2b", "HS_C-5a", "HS_SM-J", "HS_SM-1", "HS_UM-J", "HS_UM-1", "HS_OM-J", "HS_OM-1", "HS_UMOM-5a", "HS_HM-J", "HS_HM-2a", "HS_HM-3", "HS_HM-5a", "HS_SA-2a", "HS_SA-3", "HS_SA-5a", "HS_OSA-2b", "HS_OSA-4", "HS_HM-2b-spez53"
      ]
    }
const difType={
  "de": "Die andere Waldgesellschaft",
      "fr": "autre station",
      "code": "101",
      "veryFrequent": [
        "HN_10-25", "HN_50-75", "HN_100", "E_NNE-NE", "E_ENE-E", "E_ESE-SE", "E_SSE-S", "E_SSW-SW", "E_WSW-W", "E_WNW-NW", "E_NNW-N", "HUF_rh_norm", "HUF_mo-rh_xero", "HUF_mo-rh_hydro", "HUF_mo-typ_norm", "HUF_mo-mull_xero", "HUF_mo-mull_hydro", "HUF_mu-f_norm", "HUF_mu-l_xero", "HUF_mu-l_hydro", "HUF_V_Torf", "HUF_V_Kalkmoder", "HUF_V_erod", "BE_Ranker_norm", "BE_Ranker_verbraunt", "BE_Regosol_vernaesst", "BE_Regosol_verbraunt", "BE_Pararendz_vernaesst", "BE_Rendz_norm", "BE_Rendz_verbraunt", "BE_Braunerd_vernaesst", "BE_Parabraunerd_norm", "BE_Parabraunerd_podso", "BE_Podsol_vernaesst", "BE_Stauw_nassgebl", "BE_Grundw_nassgebl", "BE_V_Auenb", "BE_V_Braunpod", "AM_S", "GS_1", "GS_3", "GS_5", "GS_7", "GS_9", "GS_11", "GS_13", "GS_15", "GS_17", "GS_19", "GS_21", "GS_23", "GS_25", "GS_27", "GS_29", "GS_31", "GS_33", "GS_35", "WVG_1", "WVG_3", "WVG_5", "WVG_7", "WVG_9", "WVG_11", "WVG_13", "WVG_15", "WVG_17", "WVG_19", "WVG_21", "WVG_23", "WVG_25", "WVG_27", "WVG_29", "WVG_31", "WVG_33", "WVG_35", "WVS_1", "WVS_3", "WVS_5", "WVS_7", "WVS_9", "WVS_11", "WVS_13", "WVS_15", "WVS_17", "WVS_19", "WVS_21", "WVS_23", "WVS_25", "WVS_27", "WVS_29", "WVS_31", "WVS_33", "WVS_35", "WVS_37", "WVS_39", "WVS_41", "KO_S", "KO_sL", "KO_tL", "T", "lU", "HL_N_250", "HL_N_350", "HL_N_450", "HL_N_550", "HL_N_650", "HL_N_750", "HL_N_850", "HL_N_950", "HL_N_1050", "HL_N_1150", "HL_N_1250", "HL_N_1350", "HL_N_1450", "HL_N_1550", "HL_N_1650", "HL_N_1750", "HL_N_1850", "HL_N_1950", "HL_N_2050", "HL_N_2150", "HL_N_2250", "HL_EW_250", "HL_EW_350", "HL_EW_450", "HL_EW_550", "HL_EW_650", "HL_EW_750", "HL_EW_850", "HL_EW_950", "HL_EW_1050", "HL_EW_1150", "HL_EW_1250", "HL_EW_1350", "HL_EW_1450", "HL_EW_1550", "HL_EW_1650", "HL_EW_1750", "HL_EW_1850", "HL_EW_1950", "HL_EW_2050", "HL_EW_2150", "HL_EW_2250", "HL_S_250", "HL_S_350", "HL_S_450", "HL_S_550", "HL_S_650", "HL_S_750", "HL_S_850", "HL_S_950", "HL_S_1050", "HL_S_1150", "HL_S_1250", "HL_S_1350", "HL_S_1450", "HL_S_1550", "HL_S_1650", "HL_S_1750", "HL_S_1850", "HL_S_1950", "HL_S_2050", "HL_S_2150", "HL_S_2250", "HS_C-J", "HS_C-1", "HS_C-2b", "HS_C-5a", "HS_SM-J", "HS_SM-1", "HS_UM-J", "HS_UM-1", "HS_OM-J", "HS_OM-1", "HS_UMOM-5a", "HS_HM-J", "HS_HM-2a", "HS_HM-3", "HS_HM-5a", "HS_SA-2a", "HS_SA-3", "HS_SA-5a", "HS_OSA-2b", "HS_OSA-4", "HS_HM-2b-spez53"
      ],
      "lessFrequent": [
        "HN_0-10", "HN_25-50", "HN_75-100", "E_N-NNE", "E_NE-ENE", "E_E-ESE", "E_SE-SSE", "E_S-SSW", "E_SW-WSW", "E_W-WNW", "E_NW-NNW", "HUF_rh_xero", "HUF_rh_hydro", "HUF_mo-rh_norm", "HUF_mo-typ_xero", "HUF_mo-typ_hydro", "HUF_mo-mull_norm", "HUF_mu-f_xero", "HUF_mu-f_hydro", "HUF_mu-l_norm", "HUF_V_Anmoor", "HUF_V_Kalkmull", "HUF_V_Tangel", "BE_GestRohB", "BE_Ranker_vernaesst", "BE_Regosol_norm", "BE_Regosol_vernaesst", "BE_Pararendz_norm", "BE_Pararendz_verbraunt", "BE_Rendz_vernaesst", "BE_Braunerd_norm", "BE_Braunerd_podso", "BE_Parabraunerd_vernaesst", "BE_Podsol_norm", "BE_Stauw_norm", "BE_Grundw_norm", "BE_V_OrgB", "BE_V_neutrBraune", "BE_V_Humuspod", "AM_B", "GS_2", "GS_4", "GS_6", "GS_8", "GS_10", "GS_12", "GS_14", "GS_16", "GS_18", "GS_20", "GS_22", "GS_24", "GS_26", "GS_28", "GS_30", "GS_32", "GS_34", "GS_36", "WVG_2", "WVG_4", "WVG_6", "WVG_8", "WVG_10", "WVG_12", "WVG_14", "WVG_16", "WVG_18", "WVG_20", "WVG_22", "WVG_24", "WVG_26", "WVG_28", "WVG_30", "WVG_32", "WVG_34", "WVG_36", "WVS_2", "WVS_4", "WVS_6", "WVS_8", "WVS_10", "WVS_12", "WVS_14", "WVS_16", "WVS_18", "WVS_20", "WVS_22", "WVS_24", "WVS_26", "WVS_28", "WVS_30", "WVS_32", "WVS_34", "WVS_36", "WVS_38", "WVS_40", "WVS_42", "KO_IS", "KO_L", "KO_lT", "U", "tU", "HL_N_300", "HL_N_400", "HL_N_500", "HL_N_600", "HL_N_700", "HL_N_800", "HL_N_900", "HL_N_1000", "HL_N_1100", "HL_N_1200", "HL_N_1300", "HL_N_1400", "HL_N_1500", "HL_N_1600", "HL_N_1700", "HL_N_1800", "HL_N_1900", "HL_N_2000", "HL_N_2100", "HL_N_2200", "HL_N_2300", "HL_EW_300", "HL_EW_400", "HL_EW_500", "HL_EW_600", "HL_EW_700", "HL_EW_800", "HL_EW_900", "HL_EW_1000", "HL_EW_1100", "HL_EW_1200", "HL_EW_1300", "HL_EW_1400", "HL_EW_1500", "HL_EW_1600", "HL_EW_1700", "HL_EW_1800", "HL_EW_1900", "HL_EW_2000", "HL_EW_2100", "HL_EW_2200", "HL_EW_2300", "HL_S_300", "HL_S_400", "HL_S_500", "HL_S_600", "HL_S_700", "HL_S_800", "HL_S_900", "HL_S_1000", "HL_S_1100", "HL_S_1200", "HL_S_1300", "HL_S_1400", "HL_S_1500", "HL_S_1600", "HL_S_1700", "HL_S_1800", "HL_S_1900", "HL_S_2000", "HL_S_2100", "HL_S_2200", "HL_S_2300", "HS_C-M", "HS_C-2a", "HS_C-4", "HS_C-5b", "HS_SM-M", "HS_SM-2a", "HS_UM-M", "HS_UM-2a", "HS_OM-M", "HS_OM-2a", "HS_UMOM-5b", "HS_HM-1", "HS_HM-2b", "HS_HM-4", "HS_SA-1", "HS_SA-2b", "HS_SA-4", "HS_SA-5b", "HS_OSA-3", "HS_HMspez-2b"
      ]
}
  types.forestType.push(emptyType);
  types.forestType.push(omniType);
  types.forestType.push(difType);
}