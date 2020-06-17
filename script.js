// PUBLIC DATA SCAPE //
// Questa visualizzazione usa Javascript e d3.js, una libreria di Javascript apposta per creare visualizzazioni interattive sul web. In questo caso creiamo una rete, ma si possono fare anche altre cose super fighe

// WIKI: https://github.com/d3/d3/wiki
// ObservableHQ: https://observablehq.com/search?query=d3

let width = 1000;
let height = 600;

// Colore dei nodi - È una scala ordinale, ovvero discreta e che fa riferimento ai valori dentro al campo "type"
const color = d3.scaleOrdinal()
.range(["#DDDDDD", "#EBFF00", "#333333"])
.domain(["affiliation", "project", "people"]);

// Dimensione dei nodi - È una scala ordinale, ovvero discreta e che fa riferimento ai valori dentro al campo "type"
const size = d3.scaleOrdinal()
.range([6, 16, 36])
.domain(["people", "affiliation", "project"]);

// In questa funzione vengono caricati i dati, nel caso di Wordpress abbiamo un JSON
d3.json("https://test.publicdatalab.org/wp-json/wp/v2/projects")
.then(function(data) {

  console.log(data);
  // Creo due array vuoti che mi faranno da contenitore per i nodi e le connessioni della rete
  let nodes = [];
  let edges = [];

  // Per ogni elemento all'interno del dataset esegue una funzione (dentro le graffe). "d" fa riferimento alle informazioni contenute all'interno di ogni istanza in cui la funzione "forEach" viene eseguita (convenzionalmente si usa "d" come abbreviazione di "data")
  data.forEach(d => {
    // All'interno di "nodes", ci mette le tre informazioni di id, name e type associate alla riga del dataset in cui si trova la funzione "forEach"
    nodes.push({
      id: d.id,
      name: d.title.rendered,
      type: "project"
    });

    // Per ogni elemento all'interno di affiliation vengono riportate le informazioni di id, name e type. Per adesso manca un modo per ricollegare l'id al nome dell'affiliazione (l'API restituisce solo uno). "e" è un identificatore come "d": se fossero entrambi "d", il primo "d" verrebbe sovrascritto dal secondo "d"
    d.affiliations.forEach(e => {
      console.log(e)
      nodes.push({
        id: e,
        name: "TBD",
        type: "affiliation"
      })

      // Una volta che siamo all'interno delle affiliazioni, dobbiamo creare le relazioni tra i nodi (tra project e affiliation). La source del link è l'id del progetto (lo stesso del passo precedente), il target è l'id dell'attuale ciclo della funzione "forEach"
      edges.push({
        source: d.id,
        target: e
      })
    })

    d.acf.coordinators.forEach(f => {
      console.log(f)
      nodes.push({
        id: f.ID,
        name: f.post_title,
        type: "people"
      })

      edges.push({
        source: d.id,
        target: f.ID
      })
    })

    // let collaborators = d.acf.collaborators.filter(d => d != "false");

    if (d.acf.collaborators) {
      d.acf.collaborators.forEach(f => {
        console.log(f)
        nodes.push({
          id: f.ID,
          name: f.post_title,
          type: "people"
        })

        edges.push({
          source: d.id,
          target: f.ID
        })
      })
    }
  })

  console.log(nodes, edges);

  // Creazione delle forze che gestiscono la posizione dei nodi nello spazio
  const simulation = d3.forceSimulation(nodes)
  .force("link", d3.forceLink(edges).id(d => d.id).distance(50)) // Specifico quali sono le connessioni
  .force("charge", d3.forceManyBody().strength(-50)) // Creo la forza di attrazione tra i nodi
  .force("center", d3.forceCenter(width / 2, height / 2)) // Specificoil centro della forza
  .force("collide", d3.forceCollide(d => size(d.type) + 2)); // Creo la forza di repulsione che fa sì che i nodi non si sovrappongano

  // Creo un SVG in cui inserire la visualizzazione
  const svg = d3.select("svg")
  .attr("viewBox", [0, 0, width, height]);

  // Creo i link della rete. "g" è il corrispettivo del gruppo di illustrator
  const link = svg.append("g")
  .attr("stroke", "#666")
  .attr("stroke-width", 0.2)
  .selectAll("line") // L'ordine di selectAll, data, join è un po' una magia di d3 che va imparata a memoria. C'è una spiegazione ma sinceramente non l'ho mai capita
  .data(edges) // Questa è la funzione di "data binding", ovvero quando a delle forme in SVG gli associamo dei dati da un csv, da un json etc
  .join("line")
  .attr("stroke-width", 1);

  // Creo i nodi della rete in un altro gruppo
  const node = svg.append("g")
  .selectAll("circle")
  .data(nodes)
  .join("circle")
  .attr("r", d => size(d.type)) // in questo modo uso le scale che ho creato all'inizio per dare una dimensione e un colore diverso ai nodi in base al tipo di nodo che sono (affiliation o project)
  .attr("fill", d => color(d.type))
  .call(drag(simulation)); // Rendo la rete interattiva chiamando la funzione "drag" (inizializzata in fondo a tutto il resto)

  node.append("title")
  .text(d => d.id);

  // Creo le label dei nodi
  const label = svg.selectAll("text")
  .append("text")
  .data(nodes)
  .join("text")
  .attr("dy", 4)
  .attr("dx", -15)
  .text(d => d.name)
  .attr("text-anchor", "middle")
  .attr("alignment-baseline", "middle")
  .style("font-size", "0.6rem")
  .style("pointer-events", "none");

  // La simulazione delle forze è organizzata in "tick", ovvero momenti discreti ed equidistanti temporalmente in cui viene calcolata la posizione dei vari elementi della visualizzazione in base alla posizione attuale. Qui vengono inseriti tutte le variabili che vogliamo che reagiscano alle forze
  simulation.on("tick", () => {
    link
    .attr("x1", d => d.source.x)
    .attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x)
    .attr("y2", d => d.target.y);

    node
    .attr("cx", d => d.x)
    .attr("cy", d => d.y);

    label
    .attr("dx", d => d.x)
    .attr("dy", d => d.y);
  });
}) // Qui si chiude tutto il lavoro fatto con i dati
.catch(function(error) {
  console.log(error) // Questa parte di codice non serve toccarla, se c'è un errore viene mostrato in console
});

// Qua viene creata la funzione "drag" per trascinare i nodi nella rete. L'ho copiato
const drag = simulation => {

  function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
  }

  function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
  }

  return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
}
