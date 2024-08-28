class DataSource {
    constructor(initialSize = 1024, color = 'black') {
        this.buffer = new ArrayBuffer(initialSize);
        this.view = new DataView(this.buffer);
        this.size = 0; // Tracks the size of the used portion of the buffer
        this.color = color;
        this.delimiter = 0xFFFF; // Using 0xFFFF as a delimiter (2 bytes)
    }

    // Method to add a data point to the buffer
    addDataPoint(time, value, additionalBytes = null) {
        // Calculate the size needed for this data point
        const requiredSize = 8 + 4 + (additionalBytes ? additionalBytes.byteLength : 0) + 2; // 8 bytes for time, 4 bytes for value, and 2 bytes for delimiter

        // Ensure the buffer is large enough
        if (this.size + requiredSize > this.buffer.byteLength) {
            this.expandBuffer(requiredSize);
        }

        // Write the time
        this.view.setFloat64(this.size, time);
        this.size += 8;

        // Write the value
        this.view.setFloat32(this.size, value);
        this.size += 4;

        // Write any additional bytes
        if (additionalBytes) {
            new Uint8Array(this.buffer, this.size, additionalBytes.byteLength).set(new Uint8Array(additionalBytes));
            this.size += additionalBytes.byteLength;
        }

        // Write the delimiter
        this.view.setUint16(this.size, this.delimiter);
        this.size += 2;
    }

    // Method to expand the buffer if more space is needed
    expandBuffer(minSize) {
        const newSize = Math.max(this.buffer.byteLength * 2, this.size + minSize);
        const newBuffer = new ArrayBuffer(newSize);
        new Uint8Array(newBuffer).set(new Uint8Array(this.buffer));
        this.buffer = newBuffer;
        this.view = new DataView(this.buffer);
    }

    // Method to retrieve all data points from the buffer
    getDataPoints() {
        const dataPoints = [];
        let offset = 0;

        while (offset < this.size) {
            const time = this.view.getFloat64(offset);
            offset += 8;

            const value = this.view.getFloat32(offset);
            offset += 4;

            // Find the next delimiter
            let nextOffset = offset;
            while (nextOffset < this.size && this.view.getUint16(nextOffset) !== this.delimiter) {
                nextOffset++;
            }

            const additionalBytes = nextOffset > offset ? new Uint8Array(this.buffer.slice(offset, nextOffset)) : null;

            dataPoints.push({ time, value, additionalBytes });

            // Skip the delimiter
            offset = nextOffset + 2;
        }

        return dataPoints;
    }

    getColor() {
        return this.color;
    }

    // Method to clear the buffer
    clear() {
        this.size = 0;
    }
}

const svg = d3.select("svg");
const width = +svg.attr("width");
const height = +svg.attr("height");

// Define scales
const x = d3.scaleLinear().range([0, width]);
const y = d3.scaleLinear().domain([0, 100]).range([height, 0]);

// Define line generator
const line = d3.line()
    .x(d => x(d.time)) // Use time from data point for x
    .y(d => y(d.value)); // Use float32 value for y

// Append path for line chart
const path = svg.append("path")
    .attr("fill", "none");

// Initialize data arrays for two data sources
const dataSource1 = new DataSource(1024, "steelblue");
const dataSource2 = new DataSource(2048, "orange");

// Adding initial data to dataSource1 and dataSource2
for (let i = 0; i < 10; i++) {
    dataSource1.addDataPoint(Date.now() + i * 1000, Math.random() * 100);
}

for (let i = 0; i < 100; i++) {
    dataSource2.addDataPoint(i, Math.sin(i / 10) * 50 + 50);
}

let multiplyOdd = false;
let useDataSource1 = true;
let currentIndex = 0;
let intervalId;
let sharingEnabled = false;

// Function to update chart
function updateChart(dataSource) {
    const data = dataSource.getDataPoints();
    // Update x domain based on the current data
    x.domain(d3.extent(data, d => d.time));
    path.datum(data)
        .attr("d", line)
        .attr("stroke", dataSource.getColor()); // Use color from DataSource instance
}

// RxJS Observables for data source 1
const { interval, fromEvent } = rxjs;
const { map, tap } = rxjs.operators;

// Data stream for data source 1 (real-time data)
const dataStream1 = interval(1000).pipe(
    map((i) => {
        const time = Date.now();
        let value = Math.random() * 100;
        if (multiplyOdd && i % 2 !== 0) {
            value *= 2;
        }
        return { time, value };
    }),
    tap((point) => {
        dataSource1.addDataPoint(point.time, point.value);
        if (useDataSource1) {
            updateChart(dataSource1);
            // Share data to dataSource2 if sharing is enabled
            if (sharingEnabled) {
                dataSource2.addDataPoint(point.time, point.value);
            }
        }
    })
);

// Function to handle static data playback
function updateStaticData(index) {
    if (!useDataSource1) {
        let data = dataSource2.getDataPoints().slice(Math.max(0, index - 10), index);
        updateChart({ getDataPoints: () => data, getColor: () => dataSource2.getColor() });
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
    document.getElementById('toggleShare').disabled = !useDataSource1; // Enable share button only for dataSource1
    document.getElementById('play').disabled = useDataSource1; // Enable share button only for dataSource2
    document.getElementById('pause').disabled = useDataSource1; // Enable share button only for dataSource2
    if (!useDataSource1) {
        sharingEnabled = false; // Stop sharing when switching to dataSource2
        updateStaticData(currentIndex);
    } else {
        updateChart(dataSource1);
    }
});

// Play button event
fromEvent(document.getElementById('play'), 'click').subscribe(() => {
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(() => {
        currentIndex = (currentIndex + 1) % dataSource2.getDataPoints().length;
        updateStaticData(currentIndex);
        document.getElementById('slider').value = currentIndex;
    }, 500);
});

// Pause button event
fromEvent(document.getElementById('pause'), 'click').subscribe(() => {
    clearInterval(intervalId);
});

// Share button event
fromEvent(document.getElementById('toggleShare'), 'click').subscribe(() => {
    sharingEnabled = !sharingEnabled;
    if (sharingEnabled) {
        dataSource2.clear(); // Clear dataSource2 when starting to share
        console.log('Sharing enabled: data points from dataSource1 will be copied to dataSource2.');
    } else {
        console.log('Sharing disabled.');
    }
});

// Slider event
fromEvent(document.getElementById('slider'), 'input').subscribe(event => {
    currentIndex = parseInt(event.target.value);
    updateStaticData(currentIndex);
});

// Initial chart update
updateChart(dataSource1);