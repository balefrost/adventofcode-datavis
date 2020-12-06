//TODO: script attempts to run in context of JSON response

const followingElement = document.getElementById('ordering_info').nextElementSibling;
const graphDescriptionNode = document.createElement('p');
graphDescriptionNode.innerHTML = `You can view a <a href="javascript:void(0)">[Graph]</a> of the leaderboard progression.`;
followingElement.parentElement.insertBefore(graphDescriptionNode, followingElement);
const graphContainerNode = document.createElement('div');
graphContainerNode.style.display = "none";
followingElement.parentElement.insertBefore(graphContainerNode, followingElement);
const svgNS = 'http://www.w3.org/2000/svg';
const svgNode = document.createElementNS(svgNS, 'svg');
svgNode.setAttribute('width', '600');
svgNode.setAttribute('height', '400');
graphContainerNode.appendChild(svgNode);

const toggleGraphLink = graphDescriptionNode.querySelector('a');
toggleGraphLink.addEventListener('click', () => {
    const newValue = graphContainerNode.style.display === 'none' ? '' : 'none';
    graphContainerNode.style.display = newValue;
});

let svg = d3.select(svgNode);

const apiElement = document.querySelector('#api_info a');
const apiUrl = apiElement.href;

fetch(apiUrl, { credentials: 'same-origin'}).then(r => {
    r.json().then(j => {
        buildGraph(svg, j);
    });
});
