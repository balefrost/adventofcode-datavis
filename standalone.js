const pageReady = new Promise((resolve) => {
    if (document.readyState === 'loading') {
        let listener = () => {
            if (document.readyState !== 'loading') {
                document.removeEventListener('readystatechange', listener);
                resolve();
            }
        };
        document.addEventListener('readystatechange', listener);
    } else {
        resolve();
    }
});

pageReady.then(async () => {
    let graph = document.getElementById('graph');
    let svg = d3.select(graph);
    let tooltipNode = d3.select(document.getElementById('tooltip'));
    const r = await fetch('371953.json');
    const j = await r.json()
    buildGraph(svg, tooltipNode, j);
});
