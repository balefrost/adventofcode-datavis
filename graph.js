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

    const dataGroup = svg.append('g').classed('data', true);
    const xAxisElement = svg.append('g').classed('axis xaxis', true);
    const yAxisElement = svg.append('g').classed('axis yaxis', true);

    const starRange = processedData.maxStars - processedData.minStars;
    const scoreRange = processedData.maxScore - processedData.minScore;

    const originalXScale = d3.scaleLinear()
        .domain([processedData.minStars - 0.05 * starRange, processedData.maxStars + 0.05 * starRange])
        .range([0, svg.attr('width')]);
    const originalYScale = d3.scaleLinear()
        .domain([processedData.minScore - 0.05 * scoreRange, processedData.maxScore + 0.05 * scoreRange])
        .range([svg.attr('height') - 1, 0]);
    let currentXScale = originalXScale;
    let currentYScale = originalYScale;
    const xAxis = d3.axisTop(currentXScale);
    const yAxis = d3.axisRight(currentYScale);

    const curve = function (context) {
        let previousY = null;
        return {
            lineStart() {
            },
            lineEnd() {
            },
            point(x, y) {
                if (previousY != null) {
                    context.lineTo(x, previousY);
                }
                context.moveTo(x, y);
                previousY = y;
            }
        };
    };

    const line = d3.line()
        // .x(d => currentXScale(d.timestamp))
            .x((d, idx) => currentXScale(idx))
            .y(d => currentYScale(d.score))
        // .curve(d3.curveStepAfter)
        // .curve(curve)
    ;

    function update() {
        const groupElements = dataGroup.selectAll('g.series').data(processedData.userSeriesData);
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
        xAxisElement.attr('transform', `translate(0, ${svg.attr('height') - 1})`);
        xAxis(xAxisElement);
        yAxis(yAxisElement);
    }

    update();

    const zoom = d3.zoom();
    zoom.on("zoom", (...args) => {
        currentXScale = d3.event.transform.rescaleX(originalXScale);
        xAxis.scale(currentXScale);
        xAxis(xAxisElement);
        currentYScale = d3.event.transform.rescaleY(originalYScale);
        yAxis.scale(currentYScale);
        yAxis(yAxisElement);
        update();
        // dataGroup.attr('transform', d3.event.transform);
    });
    zoom(svg);
}

