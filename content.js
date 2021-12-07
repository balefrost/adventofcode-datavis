const followingElement = document.getElementById('ordering_info').nextElementSibling;
const graphDescriptionNode = document.createElement('p');
graphDescriptionNode.innerHTML = `You can view a <a href="javascript:void(0)">[Graph]</a> of the leaderboard progression.`;
followingElement.parentElement.insertBefore(graphDescriptionNode, followingElement);
const graphContainerNode = document.createElement('div');
let tooltipNode = document.createElement('div');
tooltipNode.classList.add('tooltip');
tooltipNode.style.display = 'none';
tooltipNode.style.position = 'absolute';
graphContainerNode.appendChild(tooltipNode);
graphContainerNode.style.display = "none";
followingElement.parentElement.insertBefore(graphContainerNode, followingElement);
const svgNS = 'http://www.w3.org/2000/svg';
const svgNode = document.createElementNS(svgNS, 'svg');

const svgWidth = followingElement.parentElement.offsetWidth

svgNode.setAttribute('width', svgWidth);
svgNode.setAttribute('height', Math.round(2/3 * svgWidth));
graphContainerNode.appendChild(svgNode);

let dataPromise;

const toggleGraphLink = graphDescriptionNode.querySelector('a');
toggleGraphLink.addEventListener('click', async () => {
    const wasHidden = graphContainerNode.style.display === 'none';
    graphContainerNode.style.display = wasHidden ? '' : 'none';

    if (wasHidden && dataPromise == null) {
        let svg = d3.select(svgNode);

        const apiElement = document.querySelector('#api_info a');
        const apiUrl = apiElement.href;

        dataPromise = fetch(apiUrl, { credentials: 'same-origin'});

        const r = await dataPromise
        const j = await r.json()
        buildGraph(svg, d3.select(tooltipNode), j);
    }
});
