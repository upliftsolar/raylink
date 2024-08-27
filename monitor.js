const svg = d3.select("svg");
const width = +svg.attr("width");
const height = +svg.attr("height");

// Define scales
const x = d3.scaleLinear().domain([0, 100]).range([0, width]);
const y = d3.scaleLinear().domain([0, 100]).range([height, 0]);

// Define line generator
const line = d3.line()
    .x(d => x(d.x))
    .y(d => y(d.y));

// Append path for line chart
const path = svg.append("path")
    .attr("stroke", "steelblue")
    .attr("fill", "none");

// Initialize data arrays for two data sources
let dataSource1 = Array.from({ length: 10 }, (_, i) => ({ x: i * 10, y: Math.random() * 100 }));
let dataSource2 = Array.from({ length: 100 }, (_, i) => ({ x: i, y: Math.sin(i / 10) * 50 + 50 })); // Static data
let multiplyOdd = false;
let useDataSource1 = true;
let currentIndex = 0;
let intervalId;

// Function to update chart
function update(data) {
    path.datum(data)
        .attr("d", line);
}

// RxJS Observables for data source 1
const { interval, fromEvent } = rxjs;
const { map, tap } = rxjs.operators;

// Data stream for data source 1 (real-time data)
const dataStream1 = interval(1000).pipe(
    map((i) => ({ x: dataSource1.length * 10, y: Math.random() * 100 })),
    tap((point, index) => {
        // Modify data if the toggle is active
        if (multiplyOdd && index % 2 !== 0) {
            point.y *= 2;
        }
        dataSource1.push(point);
        dataSource1.shift();
        if (useDataSource1) {
            update(dataSource1);
        }
    })
);

// Function to handle static data playback
function updateStaticData(index) {
    if (!useDataSource1) {
        let data = dataSource2.slice(Math.max(0, index - 10), index);
        update(data);
    }
}

// Start data streams
dataStream1.subscribe();

// Handle toggle multiply button click
fromEvent(document.getElementById('toggleMultiply'), 'click').subscribe(() => {
    multiplyOdd = !multiplyOdd;
    console.log('Toggle multiply odd messages:', multiplyOdd);
});

// Handle toggle data source button click
fromEvent(document.getElementById('toggleDataSource'), 'click').subscribe(() => {
    useDataSource1 = !useDataSource1;
    console.log('Toggle data source:', useDataSource1 ? 'Data Source 1' : 'Data Source 2');
    if (!useDataSource1) {
        // Immediately update chart with static data
        updateStaticData(currentIndex);
    } else {
        // Update chart with dynamic data
        update(dataSource1);
    }
});

// Play button event
fromEvent(document.getElementById('play'), 'click').subscribe(() => {
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(() => {
        currentIndex = (currentIndex + 1) % dataSource2.length;
        updateStaticData(currentIndex);
        document.getElementById('slider').value = currentIndex;
    }, 500);
});

// Pause button event
fromEvent(document.getElementById('pause'), 'click').subscribe(() => {
    clearInterval(intervalId);
});

// Slider event
fromEvent(document.getElementById('slider'), 'input').subscribe(event => {
    currentIndex = parseInt(event.target.value);
    updateStaticData(currentIndex);
});

// Initial chart update
update(dataSource1);