// Parameters
let selectedMake = null;
let selectedModel = null;
let selectedCar = null;

// Use the raw content URL for the CSV file on GitHub
const dataURL = 'https://raw.githubusercontent.com/gunjanjain21/narr-viz/main/car_prices.csv';

fetch(dataURL)
    .then(response => response.text())
    .then(csvData => {
        const data = d3.csvParse(csvData, d => {
            d.price = +d.price;
            d.horsepower = +d.horsepower;
            return d;
        });
        createVisualization(data);
    });

function createVisualization(data) {
    const svgHeightPercentage = 0.6;
    const viewHeight = window.innerHeight;
    const margin = { top: 70, right: 50, bottom: 80, left: 70 };
    const containerWidth = document.getElementById("visualization").offsetWidth;
    const svgWidth = containerWidth - containerWidth * 0.30;
    const svgHeight = viewHeight * svgHeightPercentage;
    const width = svgWidth - margin.left - margin.right;
    const height = svgHeight - margin.top - margin.bottom;

    const svg = d3.select("#visualization").append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const makes = Array.from(new Set(data.map(d => d.CarName.split(' ')[0])));
    const colorScale = d3.scaleOrdinal()
        .domain(makes)
        .range(d3.schemeSet3);

    function showOverviewScene() {
        svg.selectAll("*").remove();

        // Aggregate data for each make
        const makeAverages = makes.map(make => {
            const makeData = data.filter(d => d.CarName.startsWith(make));
            const avgPrice = d3.mean(makeData, d => d.price);
            return { make, avgPrice };
        });

        // Create the X and Y scales
        const yScale = d3.scaleBand()
            .domain(makeAverages.map(d => d.make))
            .range([0, height])
            .padding(0.1);

        const xScale = d3.scaleLinear()
            .domain([0, d3.max(makeAverages, d => d.avgPrice)])
            .range([0, width]);

        // Create and display the Y-axis
        const yAxis = d3.axisLeft(yScale);
        svg.append("g")
            .attr("class", "y-axis")
            .call(yAxis)
            .selectAll("text")
            .attr("font-size", 12);

        // Create and display the X-axis
        const xAxis = d3.axisBottom(xScale).ticks(6);
        svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0, ${height})`)
            .call(xAxis)
            .selectAll("text")
            .attr("font-size", 12);

        // Create the bars for each make
        const bars = svg.selectAll(".bar")
            .data(makeAverages)
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", 0)
            .attr("y", d => yScale(d.make))
            .attr("width", d => xScale(d.avgPrice))
            .attr("height", yScale.bandwidth())
            .attr("fill", d => colorScale(d.make))
            .on("click", (event, d) => triggerDrillDown(d.make))
            .on("mouseover", raiseBar)
            .on("mouseout", resetBar);

        // Add price values at the end of the bars
        svg.selectAll(".bar-label")
            .data(makeAverages)
            .enter()
            .append("text")
            .attr("class", "bar-label")
            .attr("x", d => xScale(d.avgPrice) + 5)
            .attr("y", d => yScale(d.make) + yScale.bandwidth() / 2)
            .attr("dy", ".35em")
            .attr("text-anchor", "start")
            .text(d => d.avgPrice.toFixed(2));

        // Add title
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", -margin.top / 2)
            .attr("text-anchor", "middle")
            .attr("font-size", "20px")
            .text("Average Car Price by Make");

        // Add X and Y axis labels
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom / 2)
            .attr("text-anchor", "middle")
            .text("Average Price");

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -margin.left + 15)
            .attr("text-anchor", "middle")
            .text("Car Make");

        function raiseBar(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("fill", "orange");
        }

        function resetBar(event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("fill", d => colorScale(d.make));
        }
    }

    function triggerDrillDown(make) {
        selectedMake = make;
        showDrillDownScene(make);
    }

    function showDrillDownScene(make) {
        svg.selectAll("*").remove();

        // Filter the data to get the cars for the selected make
        const makeCars = data.filter(d => d.CarName.startsWith(make));

        // Create the X and Y scales for Model and Price
        const xScale = d3.scaleBand()
            .domain(makeCars.map(d => d.CarName))
            .range([0, width])
            .padding(0.1);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(makeCars, d => d.price)])
            .range([height, 0]);

        // Create and display the X-axis for Model
        const xAxis = d3.axisBottom(xScale);
        svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0, ${height})`)
            .call(xAxis)
            .selectAll("text")
            .attr("font-size", 12)
            .attr("transform", "rotate(-45)")
            .style("text-anchor", "end");

        // Create and display the Y-axis for Price
        const yAxis = d3.axisLeft(yScale).ticks(6);
        svg.append("g")
            .attr("class", "y-axis")
            .call(yAxis)
            .selectAll("text")
            .attr("font-size", 12);

        // Create the scatter plot points for each car
        const points = svg.selectAll(".point")
            .data(makeCars)
            .enter()
            .append("circle")
            .attr("class", "point")
            .attr("cx", d => xScale(d.CarName) + xScale.bandwidth() / 2)
            .attr("cy", d => yScale(d.price))
            .attr("r", 5)
            .attr("fill", d => colorScale(make))
            .on("mouseover", showCarInfoAndEnlargePoint)
            .on("mouseout", hideCarInfoAndResetPoint)
            .on("click", (event, d) => triggerShowCar(d));

        function showCarInfoAndEnlargePoint(event, d) {
            const xPosition = xScale(d.CarName) + xScale.bandwidth() / 2 + 10;
            const yPosition = yScale(d.price) - 5;

            // Enlarge the scatterplot point on mouseover
            d3.select(this)
                .transition()
                .duration(200)
                .attr("r", 8);

            const tooltipText = `${d.CarName}\nPrice: ${d.price}\nHorsepower: ${d.horsepower}`;

            const lineHeight = 16;
            const padding = 5;

            const bbox = svg.append("text")
                .attr("class", "car-stats")
                .attr("x", xPosition + padding)
                .attr("y", yPosition + padding)
                .attr("dy", "0.35em")
                .selectAll("tspan")
                .data(tooltipText.split("\n"))
                .enter()
                .append("tspan")
                .attr("x", xPosition + padding)
                .attr("dy", (d, i) => i === 0 ? lineHeight : lineHeight)
                .text(d => d)
                .node()
                .getBBox();

            svg.insert("rect", ".car-stats") // Insert rect behind text
                .attr("class", "car-stats-background")
                .attr("x", bbox.x - padding)
                .attr("y", bbox.y - padding)
                .attr("width", bbox.width + 2 * padding)
                .attr("height", bbox.height + 2 * padding)
                .attr("rx", 5)
                .attr("ry", 5)
                .attr("fill", "white");
        }

        function hideCarInfoAndResetPoint() {
            svg.selectAll(".annotation-text").remove();
            svg.selectAll(".car-stats").remove();
            svg.selectAll(".car-stats-background").remove();
            d3.select(this)
                .transition()
                .duration(200)
                .attr("r", 5);
        }

        const titleY = -margin.top / 2;
        const buttonY = titleY + 20; // Adjusted button position

        svg.append("text")
            .attr("x", width / 2)
            .attr("y", titleY)
            .attr("text-anchor", "middle")
            .attr("font-size", "20px")
            .text(`Car Price Distribution for ${make}`);

        // X and Y axis labels
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom / 2)
            .attr("text-anchor", "middle")
            .text("Model");

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -margin.left + 15)
            .attr("text-anchor", "middle")
            .text("Price");

        // Add Back button to go back to the Overview scene
        const backButton = svg.append("g")
            .attr("class", "back-button")
            .style("cursor", "pointer")
            .on("click", triggerBackToOverview);

        backButton.append("rect")
            .attr("width", 100)
            .attr("height", 30)
            .attr("fill", "lightgray")
            .attr("rx", 8)
            .attr("x", 10)
            .attr("y", buttonY);

        backButton.append("text")
            .attr("x", 60)
            .attr("y", buttonY + 15)
            .attr("text-anchor", "middle")
            .attr("alignment-baseline", "middle")
            .attr("font-size", "14px")
            .text("< OVERVIEW");
    }

    function triggerShowCar(car) {
        selectedCar = car;
        showIndividualCarScene(selectedMake, car);
    }

    function showIndividualCarScene(make, car) {
        svg.selectAll("*").remove();

        // Car details data
        const carDetails = [
            { attribute: "Price", value: car.price },
            { attribute: "Horsepower", value: car.horsepower },
            { attribute: "City MPG", value: car.citympg },
            { attribute: "Highway MPG", value: car.highwaympg },
            { attribute: "Curb Weight", value: car.curbweight }
        ];

        const xScale = d3.scaleBand()
            .domain(carDetails.map(d => d.attribute))
            .range([0, width])
            .padding(0.1);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(carDetails, d => d.value)])
            .range([height, 0]);

        // Create axes
        const xAxis = d3.axisBottom(xScale);
        svg.append("g")
            .attr("class", "x-axis")
            .attr("transform", `translate(0, ${height})`)
            .call(xAxis)
            .selectAll("text")
            .attr("font-size", 12);

        const yAxis = d3.axisLeft(yScale).ticks(6);
        svg.append("g")
            .attr("class", "y-axis")
            .call(yAxis)
            .selectAll("text")
            .attr("font-size", 12);

        // Car details chart bars
        const bars = svg.selectAll(".bar")
            .data(carDetails)
            .enter()
            .append("rect")
            .attr("class", "bar")
            .attr("x", d => xScale(d.attribute))
            .attr("y", d => yScale(d.value))
            .attr("width", xScale.bandwidth())
            .attr("height", d => height - yScale(d.value))
            .attr("fill", "steelblue");

        // Add value labels
        svg.selectAll(".bar-label")
            .data(carDetails)
            .enter()
            .append("text")
            .attr("class", "bar-label")
            .attr("x", d => xScale(d.attribute) + xScale.bandwidth() / 2)
            .attr("y", d => yScale(d.value) - 5)
            .attr("text-anchor", "middle")
            .text(d => d.value);

        const titleY = -margin.top / 2;
        const buttonY = titleY + 20; // Adjusted button position

        // Add title
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", titleY)
            .attr("text-anchor", "middle")
            .attr("font-size", "20px")
            .text(`${car.CarName} Details`);

        // Add X and Y axis labels for car details chart
        svg.append("text")
            .attr("x", width / 2)
            .attr("y", height + margin.bottom / 2)
            .attr("text-anchor", "middle")
            .text("Attribute");

        svg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("x", -height / 2)
            .attr("y", -margin.left + 15)
            .attr("text-anchor", "middle")
            .text("Value");

        // Add Back button to go back to the drill-down scene
        const backButton = svg.append("g")
            .attr("class", "back-button")
            .style("cursor", "pointer")
            .on("click", triggerBackToDrillDown);

        backButton.append("rect")
            .attr("width", 100)
            .attr("height", 30)
            .attr("fill", "lightgray")
            .attr("rx", 8)
            .attr("x", width - 110) // Adjusted button position
            .attr("y", buttonY);

        backButton.append("text")
            .attr("x", width - 60) // Adjusted text position
            .attr("y", buttonY + 15)
            .attr("text-anchor", "middle")
            .attr("alignment-baseline", "middle")
            .attr("font-size", "14px")
            .text(`< BACK TO ${make}`);
    }

    function triggerBackToDrillDown() {
        showDrillDownScene(selectedMake);
    }

    function triggerBackToOverview() {
        selectedMake = null;
        selectedModel = null;
        selectedCar = null;
        showOverviewScene();
    }

    showOverviewScene();
}