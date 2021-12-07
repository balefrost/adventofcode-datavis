// These are 1-indexed, since that is how they are reported on the web site
const ignoredDays = {
    2018: [6],
    2020: [1]
};

/**
 * An event during which a user's score changed.
 * @typedef { userId: string, star: number, timestamp: Date } ScoringEvent
 */

/**
 * @typedef { timestamp: Date, starNumber: number, score: number } ScoreHistoryEntry
 */

/**
 * @typedef { userId: string, userName: string, scoreHistory: ScoreHistoryEntry[], currentScore: number, hue: number } UserSeriesDataEntry
 */

/**
 * Collects all the scoring events from the AoC JSON response.
 * An event occurs when a user completes a star and gain points on the leaderboard.
 * The events are returned in timestamp order.
 * @param json the JSON response from the AoC website
 * @returns [ScoringEvent] the list of events in timestamp order.
 */
function flattenEvents(json) {
    const events = [];
    for (const userId of Object.keys(json['members'])) {
        const userData = json.members[userId];
        const completionData = userData['completion_day_level'];
        for (const dayNumberString of Object.keys(completionData)) {
            const starData = completionData[dayNumberString];
            for (const starNumberString of Object.keys(starData)) {
                const timestamp = parseInt(starData[starNumberString]['get_star_ts'], 10);
                const globalStarNumber = (parseInt(dayNumberString, 10) - 1) * 2 + parseInt(starNumberString, 10) - 1
                let data = {
                    userId: userId,
                    star: globalStarNumber,
                    timestamp: new Date(timestamp * 1000)
                };
                events.push(data);
            }
        }
    }
    events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    return events;
}

/**
 * Computes the per-user score history data.
 * @param json the JSON response from the AoC website
 * @param ignoredStars the list of stars that are ignored from scoring
 * @param baseTime the starting time for the specified AoC event
 * @param {[ScoringEvent]} events the events
 * @returns {{maxStars: number, userSeriesData: UserSeriesDataEntry[], maxScore: number}} The per-user score history
 */
function computeUserScores(json, ignoredStars, baseTime, events) {
    const numMembers = Object.keys(json['members']).length;
    const pointsRemainingByStar = [];
    for (let i = 0; i < 50; ++i) {
        pointsRemainingByStar[i] = ignoredStars.indexOf(((i / 2) | 0)) === -1 ? numMembers : 0;
    }

    const userDataById = new Map();
    const userSeriesData = [];
    for (const userId of Object.keys(json['members'])) {
        let data = {
            userId: userId,
            userName: json['members'][userId]['name'] ?? `(anon #${json['members'][userId]['id']})`,
            scoreHistory: [{
                timestamp: baseTime,
                starNumber: 0,
                score: 0
            }],
            currentScore: 0,
            hue: 0
        };

        userDataById[userId] = data;
        userSeriesData.push(data);
    }

    let maxScore = 0;
    let maxStars = 0;
    for (let event of events) {
        const userData = userDataById[event.userId];
        const starScore = pointsRemainingByStar[event.star];
        pointsRemainingByStar[event.star] = starScore === 0 ? 0 : starScore - 1;
        userData.currentScore += starScore;
        userData.scoreHistory.push({
            timestamp: event.timestamp,
            starNumber: event.star,
            score: userData.currentScore
        });
        maxScore = Math.max(maxScore, userData.currentScore);
        maxStars = Math.max(maxStars, userData.scoreHistory.length);
    }
    return {userSeriesData, maxScore, maxStars};
}

/**
 * Assigns hue values to each element of {@link userSeriesData}.
 *
 * @param {UserSeriesDataEntry[]} userSeriesData
 */
function assignHueValues(userSeriesData) {
    const hueDelta = 360 / userSeriesData.length;
    let currentHue = hueDelta / 2;
    userSeriesData.forEach(d => {
        d.hue = currentHue;
        currentHue += (360 / 4 + hueDelta / 4);
    });
}

function processLeaderboardData(json) {
    const eventYear = parseInt(json.event, 10);
    const baseTime = new Date(Date.UTC(eventYear, 11, 1, 5));

    const thisYearIgnoredDays = ignoredDays[eventYear] ?? [];

    const ignoredStars = thisYearIgnoredDays.flatMap(dayNumber => {
        const firstStarOfDay = (dayNumber - 1) * 2;
        return [firstStarOfDay, firstStarOfDay + 1];
    });
    const events = flattenEvents(json);

    let {userSeriesData, maxScore, maxStars} = computeUserScores(json, ignoredStars, baseTime, events);

    userSeriesData.sort((a, b) => b.currentScore - a.currentScore);

    assignHueValues(userSeriesData);

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

function buildGraph(svg, tooltip, jsonData) {
    const processedData = processLeaderboardData(jsonData);

    const targetStrokeWidth = 5;

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
            .attr('d', d => line(d.scoreHistory))
            .on('mouseenter', (evt, d) => {
                tooltip.text(d.userName);
                tooltip.style('display', '');
                let { width: ttWidth } = tooltip.node().getBoundingClientRect();
                tooltip.style('left', `${evt.pageX - ttWidth - 3}px`);
                tooltip.style('top', `${evt.pageY}px`);
            })
            .on('mousemove', (evt) => {
                let { width: ttWidth } = tooltip.node().getBoundingClientRect();
                tooltip.style('left', `${evt.pageX - ttWidth - 3}px`);
                tooltip.style('top', `${evt.pageY}px`);
            })
            .on('mouseleave', () => {
                tooltip.style('display', 'none');
            });

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

