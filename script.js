let width = window.innerWidth;
let height = 800;

const color = d3.scaleOrdinal()
.range(["#DDDDDD", "#EBFF00", "#FFFFFF"])
.domain(["affiliation", "project", "people"]);

const x = d3.scalePoint()
.range([0, width])
.round("true")
.domain(["affiliation", "project", "people"]);

const y = d3.scaleLinear()
.range([height, 0]);

const size = d3.scaleSqrt()
.range([5, 80]);

d3.json("https://test.publicdatalab.org/wp-json/wp/v2/projects?_embed=1")
.then(function(data) {

  // console.log(data);
  let proto = [];
  let edges = [];

  data.forEach(d => {
    let degree = 0;

    d._embedded['wp:term'].forEach(e => {
      for (let i = 0; i < e.length; i++) {
        // console.log(e[i])
        proto.push({
          id: e[i].id,
          name: e[i].name,
          type: "affiliation",
          degree: 1
        });
        edges.push({
          source: d.id,
          target: e[i].id
        })

        degree++;
      };
    })

    d.acf.coordinators.forEach(f => {
      proto.push({
        id: f.ID,
        name: f.post_title,
        type: "people",
        degree: 0
      })

      edges.push({
        source: d.id,
        target: f.ID
      })

      degree++;
    })


    if (d.acf.collaborators) {
      d.acf.collaborators.forEach(f => {
        proto.push({
          id: f.ID,
          name: f.post_title,
          type: "people",
          degree: 0
        })

        edges.push({
          source: d.id,
          target: f.ID
        })
      })

      degree++;
    }

    proto.push({
      id: d.id,
      name: d.title.rendered,
      type: "project",
      link: d.link,
      degree: degree
    });
  });

  let step = [...new Set(proto.map(function(d) {
    return d.id
  }))];

  let nodes = step.map(function(d) {
    return proto.find(function(e) {
        return e.id === d
    })
  });

  size.domain(d3.extent(nodes, d => d.degree));

  y.domain(d3.extent(nodes, d => d.degree));

  console.log(nodes, edges);

  console.log(size.domain())

  const simulation = d3.forceSimulation(nodes)
  .force("link", d3.forceLink(edges).id(d => d.id).distance(40)) // Specifico quali sono le connessioni
  .force("charge", d3.forceManyBody().strength(3))
  //.force("x", d3.forceX(d => x(d.type)))
  //.force("y", d3.forceY(height / 2))
  .force("center", d3.forceCenter(width / 2, height / 2)) // Specificoil centro della forza
  .force("collide", d3.forceCollide(d => size(d.degree)+1).iterations(5))
  .alpha(1); // Creo la forza di repulsione che fa sì che i nodi non si sovrappongano

  const svg = d3.select("svg")
  .attr("width", width)
  .attr("height", height)
  //.attr("viewBox", [0, 0, width, height]);

  const link = svg.append("g")
  .attr("stroke", "#DDDDDD")
  .attr("stroke-width", 1)
  .selectAll("line") // L'ordine di selectAll, data, join è un po' una magia di d3 che va imparata a memoria. C'è una spiegazione ma sinceramente non l'ho mai capita
  .data(edges) // Questa è la funzione di "data binding", ovvero quando a delle forme in SVG gli associamo dei dati da un csv, da un json etc
  .join("line");

  const projects = svg
  .selectAll("rect")
  .data(nodes)
  .join("rect")
  .filter(d => d.type === "project")
  .classed("node", true)
  .attr("stroke", d => {
    if (d.type === "people")
    return "#333333"
  })
  .attr("width", d => size(d.degree))
  .attr("height", d => size(d.degree))
  .attr("fill", d => color(d.type))
  .call(drag(simulation));

  const node = svg
  .selectAll("circle")
  .data(nodes)
  .join("circle")
  .filter(d => d.type != "project")
  .classed("node", true)
  .attr("stroke", d => {
    if (d.type === "people")
    return "#333333"
  })
  .attr("r", d => size(d.degree))
  .attr("fill", d => color(d.type))
  .call(drag(simulation));

  projects.append("title")
  .text(d => d.name);

  const label = svg.selectAll("text")
  .append("text")
  .data(nodes)
  .join("text")
  .attr("dy", 4)
  .attr("dx", -15)
  .text(d => {
    if (d.type != "people") {
      return d.name
    }
  })
  .attr("text-anchor", "middle")
  .attr("alignment-baseline", "middle")
  .style("font-size", "0.6rem")
  .style("pointer-events", "none");

  simulation.on("tick", () => {
    link
    .attr("x1", d => d.source.x)
    .attr("y1", d => d.source.y)
    .attr("x2", d => d.target.x)
    .attr("y2", d => d.target.y);

    projects
    .attr("x", d => d.x - size(d.degree) / 2)
    .attr("y", d => d.y - size(d.degree) / 2);

    node
    .attr("cx", d => d.x)
    .attr("cy", d => d.y);

    label
    .attr("dx", d => d.x)
    .attr("dy", d => d.y);
  });
})
.catch(function(error) {
  console.log(error) // Questa parte di codice non serve toccarla, se c'è un errore viene mostrato in console
});

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
