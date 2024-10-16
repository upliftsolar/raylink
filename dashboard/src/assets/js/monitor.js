import NotifyHandlerAbstract from './uplift/notify_handler_abstract.js';
import { Msg_p_logger, Msg_v_logger, Msg_m_logger } from './middlewares/customMiddleware.js';
import { BleMiddleware, OnFirstMsgPBleMiddleware } from './middlewares/bleMiddleware.js';
import { Msg_p } from './uplift/cluster_message.js';
// RxJS Observables for data source 1
const { interval, fromEvent } = rxjs;
const { map, tap } = rxjs.operators;

let mostRecentlyClickedDOM = null;  // Initialize to track clicked element

class DataSource {
    constructor(initialSize = 1024, color = 'black') {
        this.buffer = new ArrayBuffer(initialSize);
        this.view = new DataView(this.buffer);
        this.size = 0; // Tracks the size of the used portion of the buffer
        this.color = color;
        this.delimiter = 0xFFFF; // Using 0xFFFF as a delimiter (2 bytes)
    }

    // Method to add a data point to the buffer
    addClusterMessage(msg) {
        var b = msg.buffer();
        this.addDataView(new DataView(b, 0, b.byteLength));
    }
    
    addDataView(dv) {
        const requiredSize = dv.byteLength + 2; // 2 bytes for delimiter
        const start = this.size;
        if (this.size + requiredSize > this.buffer.byteLength) {
            this.expandBuffer(requiredSize);
        }

        for (let i = 0; i < dv.byteLength; i++) {
            this.view.setUint8(start + i, dv.getUint8(i));
        }
        this.size += dv.byteLength;

        // Write the delimiter
        this.view.setUint16(this.size, this.delimiter);
        this.size += 2;
    }

    expandBuffer(minSize) {
        const newSize = Math.max(this.buffer.byteLength * 2, this.size + minSize);
        const newBuffer = new ArrayBuffer(newSize);
        new Uint8Array(newBuffer).set(new Uint8Array(this.buffer));
        this.buffer = newBuffer;
        this.view = new DataView(this.buffer);
    }

    getClusterMessages(parseFunc) {
        const clusterMessages = [];
        let offset = 0;

        while (offset < this.size) {
            let nextOffset = offset;
            while (nextOffset < this.size && this.view.getUint16(nextOffset) !== this.delimiter) {
                nextOffset++;
            }
            let r;
            try {
                if (Msg_p.filter()(this.view, offset)) {
                    r = parseFunc(new DataView(this.view.buffer, offset, nextOffset - offset));
                    clusterMessages.push(r);
                }
            } catch (e) {
                console.log('skipped');
            }

            // Skip the delimiter
            offset = nextOffset + 2;
        }

        return clusterMessages;
    }

    getColor() {
        return this.color;
    }

    clear() {
        this.size = 0;
    }

    toBase64() {
        const uint8Array = new Uint8Array(this.buffer.slice(0, this.size));
        return btoa(String.fromCharCode.apply(null, uint8Array));
    }

    fromBase64(base64) {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        this.clear(); // Clear existing data
        this.expandBuffer(len); // Ensure the buffer is large enough
        new Uint8Array(this.buffer).set(bytes);
        this.size = len;
    }
}

const middleware1Switch = document.getElementById('middleware1');
const middleware2Switch = document.getElementById('middleware2');
const middleware3Switch = document.getElementById('middleware3');
const middleware3 = new Msg_m_logger(3);

middleware3Switch.addEventListener('change', (event) => {
    if (event.target.checked) {
        handler.register(middleware3);
        console.log('Middleware 3 (Msg_m_logger) registered');
    } else {
        handler.deregister(middleware3);
        console.log('Middleware 3 (Msg_m_logger) deregistered');
    }
});

const handler = new NotifyHandlerAbstract();
const middleware1 = new Msg_p_logger(1);
const middleware2 = new Msg_v_logger(2);

const serviceUUID = '2997855E-05B6-2C36-86A5-6C9856C73F4D'.toLowerCase();

document.getElementById('connectButton').addEventListener('click', async () => {
    try {
        console.log('Requesting Bluetooth devices...');
        const device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [serviceUUID]
        });

        console.log(`Device selected: ${device.name} (ID: ${device.id})`);
        await handler.connect(device);
        document.getElementById('connectButton').innerHTML = device.name;
        handler.register(new OnFirstMsgPBleMiddleware((dataView) => {
            document.getElementById('toggleCapture').disabled = false;
        }));
    } catch (error) {
        console.error('Error:', error);
    }
});

middleware1Switch.addEventListener('change', (event) => {
    if (event.target.checked) {
        handler.register(middleware1);
        console.log('Middleware 1 registered');
    } else {
        handler.deregister(middleware1);
        console.log('Middleware 1 deregistered');
    }
});

middleware2Switch.addEventListener('change', (event) => {
    if (event.target.checked) {
        handler.register(middleware2);
        console.log('Middleware 2 registered');
    } else {
        handler.deregister(middleware2);
        console.log('Middleware 2 deregistered');
    }
});

// D3 Graph Starts Here
const svg = d3.selectAll("#index-graph, #monitor-graph");

// Attach single-click event to SVG
svg.on('click', function(event) {
    if (mostRecentlyClickedDOM && mostRecentlyClickedDOM.tagName.toLowerCase() === 'svg') {
        mostRecentlyClickedDOM.classList.remove('svg-highlight');
    }

    mostRecentlyClickedDOM = event.target;

    if (mostRecentlyClickedDOM.tagName.toLowerCase() === 'svg') {
        mostRecentlyClickedDOM.classList.add('svg-highlight');
        handleClick();
    }
});

// Function to handle paste with Ctrl + V
function handlePaste() {
    if (mostRecentlyClickedDOM && mostRecentlyClickedDOM.tagName.toLowerCase() === 'svg') {
        navigator.clipboard.readText().then(clipText => {
            dataSource2.fromBase64(clipText);
            showControls();
            if (useDataSource1) {
                toggleDataSource();
            } else {
                updateChart(dataSource2);
            }
            doPlay();
            alert('Data has been pasted and imported into the SVG!');
        }).catch(err => {
            console.error('Failed to read data from clipboard: ', err);
        });
    } else {
        alert('Please click on the SVG first to paste data.');
    }
}

// Listen for 'Ctrl + V' to trigger paste action
document.addEventListener('keydown', (event) => {
    if (event.ctrlKey && event.key === 'v') {
        handlePaste();
    }
});

// Tooltip DIV
const tooltip = d3.select("body").append("div")
    .attr("id", "tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("background-color", "rgba(0, 0, 0, 0.7)")
    .style("color", "white")
    .style("padding", "8px")
    .style("border-radius", "6px")
    .style("font-size", "12px")
    .style("box-shadow", "0px 4px 10px rgba(0, 0, 0, 0.2)")
    .style("pointer-events", "none")
    .style("transition", "all 0.3s ease");

// Define the gradient
const gradient = svg.append("defs")
    .append("linearGradient")
    .attr("id", "line-gradient")
    .attr("x1", "0%")
    .attr("y1", "0%")
    .attr("x2", "100%")
    .attr("y2", "0%");

// Add gradient colors
gradient.append("stop")
    .attr("offset", "0%")
    .attr("stop-color", "blue");

gradient.append("stop")
    .attr("offset", "100%")
    .attr("stop-color", "purple");

const margin = { top: 20, right: 100, bottom: 50, left: 50 };
const width = +svg.attr("width") - margin.left - margin.right;
const height = +svg.attr("height") - margin.top - margin.bottom;

// Define scales
const x = d3.scaleLinear().range([0, width]);
const y = d3.scaleLinear().domain([0, 100]).range([height, 0]);

// Define line generator
const line = d3.line()
    .curve(d3.curveBasis)
    .x(d => x(d.getSeconds()))
    .y(d => {
        try {
            return y(d.temperature());
        } catch (e) {
            console.log('filter not working for this graph.');
            return 0;
        }
    });

const gIndex = d3.select("#index-graph").append("g").attr("transform", `translate(${margin.left},${margin.top})`);
const gMonitor = d3.select("#monitor-graph").append("g").attr("transform", `translate(${margin.left},${margin.top})`);

// Create focus circle for both graphs
const focusIndex = gIndex.append("circle")
    .attr("r", 6)
    .attr("fill", "yellow")
    .attr("stroke", "white")
    .attr("stroke-width", 2)
    .style("visibility", "hidden"); // Initially hidden

const focusMonitor = gMonitor.append("circle")
    .attr("r", 6)
    .attr("fill", "yellow")
    .attr("stroke", "white")
    .attr("stroke-width", 2)
    .style("visibility", "hidden"); // Initially hidden

// Initialize data arrays for two data sources
const dataSource1 = new DataSource(1024, "steelblue");
const dataSource2 = new DataSource(2048, "orange");

// Append paths for line charts
const indexPath = gIndex.append("path").attr("id", "index-path").attr("fill", "none");
const monitorPath = gMonitor.append("path").attr("id", "monitor-path").attr("fill", "none");

// Append axes for both graphs
const xAxisIndex = gIndex.append("g").attr("transform", `translate(0,${height})`);
const yAxisIndex = gIndex.append("g");
const xAxisMonitor = gMonitor.append("g").attr("transform", `translate(0,${height})`);
const yAxisMonitor = gMonitor.append("g");

let multiplyOdd = false;
let useDataSource1 = true;
let currentIndex = 0;
let intervalId;
let sharingEnabled = false;

// Function to update chart
function updateChart(dataSource) {
    const data = dataSource.getClusterMessages(Msg_p.fromDataView);
    
    // Update x domain based on the current data
    x.domain(d3.extent(data, d => d.getSeconds()));

    // Update y domain
    y.domain([0, d3.max(data, d => d.temperature())]);

    // Update line paths for both graphs
    indexPath.datum(data)
        .attr("d", line)
        .attr("stroke", "blue")
        .attr("stroke-width", 3);

    monitorPath.datum(data)
        .attr("d", line)
        .attr("stroke", "url(#line-gradient)")
        .attr("stroke-width", 3);

    // Update axes
    xAxisIndex.call(d3.axisBottom(x).ticks(5).tickFormat(d => (d - Date.now()) / 1000));
    yAxisIndex.call(d3.axisLeft(y));
    xAxisMonitor.call(d3.axisBottom(x).ticks(5).tickFormat(d => (d - Date.now()) / 1000));
    yAxisMonitor.call(d3.axisLeft(y));

    // Mousemove event to show tooltip and move focus circle
    svg.on("mousemove", function(event) {
        const [mouseX] = d3.pointer(event, this);
        const x0 = x.invert(mouseX);
        const i = d3.bisector(d => d.getSeconds()).left(data, x0);

        const d0 = data[i - 1];
        const d1 = data[i];
        const d = x0 - d0.getSeconds() > d1.getSeconds() - x0 ? d1 : d0;

        // Move the focus circle to the correct x, y position for both graphs
        focusIndex.attr("cx", x(d.getSeconds()))
                  .attr("cy", y(d.temperature()))
                  .style("visibility", "visible");

        focusMonitor.attr("cx", x(d.getSeconds()))
                    .attr("cy", y(d.temperature()))
                    .style("visibility", "visible");

        // Update and show tooltip with relevant information
        tooltip.html(`Temperature: ${d.temperature()}<br>Time: ${d.getSeconds()}s`)
               .style("top", (event.pageY - 40) + "px")
               .style("left", (event.pageX + 10) + "px")
               .style("visibility", "visible");
    })
    .on("mouseout", function() {
        focusIndex.style("visibility", "hidden");
        focusMonitor.style("visibility", "hidden");
        tooltip.style("visibility", "hidden");
    });
}

const bleMiddleware = new BleMiddleware((dataView) => {
    dataSource1.addDataView(dataView);
    if (useDataSource1) {
        updateChart(dataSource1);
        if (sharingEnabled) {
            dataSource2.addDataView(dataView);
        }
    }
    return dataView;
});

handler.register(bleMiddleware);

function updateUsingCapturingData(index) {
    if (!useDataSource1) {
        let data = dataSource2.getClusterMessages(Msg_p.fromDataView).slice(Math.max(0, index - 10), index);
        updateChart({ getClusterMessages: () => data, getColor: () => dataSource2.getColor() });
    }
}

// Download SVG functionality
function downloadSVG() {
    const svg = document.getElementById("monitor-graph");
    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    const downloadLink = document.createElement("a");
    downloadLink.href = svgUrl;
    downloadLink.download = "monitor-graph.svg";
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
}

// Attach download button functionality
document.getElementById("downloadSvgBtn").addEventListener("click", downloadSVG);

fromEvent(document.getElementById('monitor-graph'), 'click').subscribe(showControls);
function showControls() {
    document.getElementById('capture-controls').classList.remove('hidden');
}

// Handle toggle data source button click
function toggleDataSource() {
    if (dataSource2.size < 10) {
        alert('No captured data. Click once to capture data, or click and hold to import data.');
        return;
    }
    useDataSource1 = !useDataSource1;
    console.log('Toggle data source:', useDataSource1 ? 'Data Source 1' : 'Data Source 2');
    document.getElementById('toggleCapture').disabled = !useDataSource1;
    document.getElementById('toggleCapture').innerHTML = 'Capture';
    document.getElementById('toggleDataSource').innerHTML = useDataSource1 ? "Showing Live Data" : "Showing Capture #{num}";

    document.getElementById('play').disabled = useDataSource1;
    document.getElementById('pause').disabled = useDataSource1;
    document.getElementById('slider').value = 0;
    document.getElementById('slider').disabled = useDataSource1;

    if (!useDataSource1) {
        sharingEnabled = false;
        updateUsingCapturingData(currentIndex);
    } else {
        doPause();
        updateChart(dataSource1);
    }
}

fromEvent(document.getElementById('toggleDataSource'), 'click').subscribe(toggleDataSource);

// Play button event
fromEvent(document.getElementById('play'), 'click').subscribe(doPlay);
function doPlay() {
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(() => {
        currentIndex = (currentIndex + 1) % dataSource2.getClusterMessages(Msg_p.fromDataView).length;
        updateUsingCapturingData(currentIndex);
        document.getElementById('slider').value = currentIndex;
    }, 500);
}

// Pause button event
fromEvent(document.getElementById('pause'), 'click').subscribe(doPause);
function doPause() {
    clearInterval(intervalId);
}

// Capture button event
fromEvent(document.getElementById('toggleCapture'), 'click').subscribe(() => {
    sharingEnabled = !sharingEnabled;
    document.getElementById('toggleCapture').innerHTML = sharingEnabled ? 'Stop' : 'Clear & Capture';
    if (sharingEnabled) {
        dataSource2.clear(); // Clear dataSource2 when starting to share
        console.log('Capturing enabled: data points from dataSource1 will be copied to dataSource2.');
    } else {
        console.log('Capturing disabled.');
    }
});

// Slider event
fromEvent(document.getElementById('slider'), 'input').subscribe(event => {
    currentIndex = parseInt(event.target.value);
    updateUsingCapturingData(currentIndex);
});

function handleClick() {
    console.log("SVG clicked. Ready for Ctrl + V paste.");
}

// Initial chart update
updateChart(dataSource1);
