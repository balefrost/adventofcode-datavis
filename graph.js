function processLeaderboardData(json) {
    const events = [];
    const eventYear = parseInt(json.event, 10);
    const baseTime = new Date(Date.UTC(eventYear, 11, 1, 5));
    const numMembers = Object.keys(json['members']).length;
    for (const userId of Object.keys(json['members'])) {
        const userData = json.members[userId];
        const completionData = userData['completion_day_level'];
        for (const dayNumberString of Object.keys(completionData)) {
            const starData = completionData[dayNumberString];
            for (const starNumberString of Object.keys(starData)) {
                const timestamp = parseInt(starData[starNumberString]['get_star_ts'], 10);
                events.push({
                    userId: userId,
                    star: (parseInt(dayNumberString, 10) - 1) * 2 + parseInt(starNumberString, 10) - 1,
                    timestamp: new Date(timestamp * 1000)
                });
            }
        }
    }
    events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const starData = [];
    for (let i = 0; i < 50; ++i) {
        starData[i] = {
            numCompleted: 0
        }
    }

    const scoreHistoriesByUserId = new Map();
    let maxScore = 0;
    let maxStars = 0;
    for (const event of events) {
        let thisScoreHistory = scoreHistoriesByUserId.get(event.userId);
        if (!thisScoreHistory) {
            thisScoreHistory = [{
                timestamp: baseTime,
                score: 0
            }];
            scoreHistoriesByUserId.set(event.userId, thisScoreHistory);
        }
        let previousScore = 0;
        if (thisScoreHistory.length > 0) {
            previousScore = thisScoreHistory[thisScoreHistory.length - 1].score;
        }
        let thisStarData = starData[event.star];
        let thisEventScore = numMembers - thisStarData.numCompleted;
        if (eventYear === 2018) {
            if (event.star === 10 || event.star === 11) {
                thisEventScore = 0;
            }
        }
        let updatedScore = previousScore + thisEventScore;
        maxScore = Math.max(maxScore, updatedScore);
        maxStars = Math.max(maxStars, thisScoreHistory.length);
        thisScoreHistory.push({
            timestamp: event.timestamp,
            score: updatedScore
        });
        thisStarData.numCompleted += 1;
    }

    const userSeriesData = [];
    for (const [k, v] of scoreHistoriesByUserId) {
        let currentScore = 0;
        if (v.length > 0) {
            currentScore = v[v.length - 1].score;
        }
        userSeriesData.push({
            userId: k,
            userName: json['members'][k]['name'],
            scoreHistory: v,
            currentScore: currentScore
        });
    }

    userSeriesData.sort((a, b) => b.currentScore - a.currentScore);

    const hueDelta = 360 / scoreHistoriesByUserId.size;
    let currentHue = hueDelta / 2;
    userSeriesData.forEach(d => {
        d.hue = currentHue;
        currentHue += hueDelta;
    });

    return {
        minStars: 0,
        maxStars: maxStars,
        minTimestamp: events[0].timestamp,
        maxTimestamp: events[events.length - 1].timestamp,
        minScore: 0,
        maxScore: maxScore,
        userSeriesData: userSeriesData,
        events: events
    };
}

function buildGraph(svg, jsonData) {
    console.log("Oh hi!");
    const processedData = processLeaderboardData(jsonData);
    console.log(processedData);
    // const originalXScale = d3.scaleTime()
    //     .domain([processedData.minTimestamp, processedData.maxTimestamp])
    //     .range([0, svg.attr('width')]);

    const targetStrokeWidth = 3;

    const marginLeft = 25;
    const marginBottom = 20;
    const legendLeftMargin = 5;
    const legendWidth = 200;

    const defs = svg.append("defs");
    const graphContentClipPath = defs.append("clipPath").attr("id", "graph-content-clip-path");
    graphContentClipPath
        .append("rect")
        .attr("x", marginLeft)
        .attr("width", svg.attr('width') - marginLeft - legendLeftMargin - legendWidth)
        .attr("height", svg.attr('height') - marginBottom);

    const dataContainerGroup = svg.append('g').attr('clip-path', 'url(#graph-content-clip-path)');
    const dataGroup = dataContainerGroup.append('g').classed('data', true);
    const legendGroup = svg.append('g').attr('transform', `translate(${svg.attr('width') - legendWidth}, 0)`);
    const xAxisElement = svg.append('g').classed('axis xaxis', true);
    const yAxisElement = svg.append('g').classed('axis yaxis', true);

    const starRange = processedData.maxStars - processedData.minStars;
    const scoreRange = processedData.maxScore - processedData.minScore;

    const xScale = d3.scaleLinear()
        .domain([processedData.minStars - 0.05 * starRange, processedData.maxStars + 0.05 * starRange])
        .range([marginLeft, svg.attr('width') - legendLeftMargin - legendWidth]);
    const yScale = d3.scaleLinear()
        .domain([processedData.minScore - 0.05 * scoreRange, processedData.maxScore + 0.05 * scoreRange])
        .range([svg.attr('height') - marginBottom, 0]);
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    const line = d3.line()
        .x((d, idx) => xScale(idx))
        .y(d => yScale(d.score));

    function update() {
        const groupElements = dataGroup
            .selectAll('g.series')
            .data(processedData.userSeriesData);

        groupElements.exit().remove();
        const newGroupElements = groupElements.enter().append('g')
            .classed('series', true)
            .attr('data-userid', d => d.userId)
            .attr('data-username', d => d.userName);

        const newPaths = newGroupElements
            .append('path')
            .style('fill', 'none');

        newGroupElements.merge(groupElements)
            .attr('data-current-score', d => d.currentScore);

        groupElements.select('path').merge(newPaths)
            .style('stroke', d => `hsl(${d.hue}, 75%, 50%)`)
            .attr('d', d => line(d.scoreHistory));

        let legendGroups = legendGroup
            .selectAll('g.legend-entry')
            .data(processedData.userSeriesData)
            .join('g');

        legendGroups
            .attr('transform', (d, i) => `translate(0, ${(i + 1) * 15})`)
            .classed('legend-entry', true)
            .append('line')
            .attr('x1', 0)
            .attr('x2', 10)
            .attr('y1', -5)
            .attr('y2', -5)
            .attr('stroke', d => `hsl(${d.hue}, 75%, 50%)`)
            .attr('stroke-width', targetStrokeWidth)

        legendGroups
            .append('text')
            .attr('x', 15)
            .text(d => d.userName)
    }

    update();

    function updateXAxis(elem, scale) {
        elem
            .attr('transform', `translate(0, ${svg.attr('height') - marginBottom})`)
            .call(xAxis.scale(scale));
    }

    function updateYAxis(elem, scale) {
        elem
            .attr('transform', `translate(${marginLeft}, 0)`)
            .call(yAxis.scale(scale));
    }

    const zoom = d3.zoom();
    zoom.on("zoom", ({transform}) => {
        const xs = transform.rescaleX(xScale);
        const ys = transform.rescaleY(yScale);
        dataGroup
            .attr("transform", transform)
            .attr("stroke-width", targetStrokeWidth / transform.k);
        xAxisElement.call(updateXAxis, xs)
        yAxisElement.call(updateYAxis, ys)
    });
    svg.call(zoom).call(zoom.transform, d3.zoomIdentity);
}

