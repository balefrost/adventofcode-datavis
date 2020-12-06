const pageReady = new Promise((resolve, reject) => {
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

pageReady.then(() => {
    let graph = document.getElementById('graph');
    let svg = d3.select(graph);
    fetch('668697.json').then(r => {
        r.json().then(j => {
            buildGraph(svg, j);
        });
    });
});
