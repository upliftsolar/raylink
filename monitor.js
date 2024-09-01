import NotifyHandlerAbstract from './uplift/notify_handler_abstract.js';
import { Msg_p_logger, Msg_v_logger } from './middlewares/customMiddleware.js';
import { BleMiddleware, OnFirstMsgPBleMiddleware } from './middlewares/bleMiddleware.js';
import { Msg_p } from './uplift/cluster_message.js';
// RxJS Observables for data source 1
const { interval, fromEvent } = rxjs;
const { map, tap } = rxjs.operators;



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
        addDataView(new DataView(b, 0, b.byteLength));
    }
    addDataView(dv) {
        // Calculate the size needed for this data point
        const requiredSize = dv.byteLength + 2; // 2 bytes for delimiter
        const start = this.size;
        if (this.size + requiredSize > this.buffer.byteLength) {
            this.expandBuffer(requiredSize);
        }

        //for now, assume added dv starts at 0
        // is there any scenario where it makes sense for dv window to be used?
        for (let i = 0; i < dv.byteLength; i++) {
            this.view.setUint8(start + i, dv.getUint8(i));
        }
        this.size += dv.byteLength;

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
    getClusterMessages(parseFunc) {
        const clusterMessages = [];
        let offset = 0;

        while (offset < this.size) {
            // Find the next delimiter
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

    // Method to clear the buffer
    clear() {
        this.size = 0;
    }
    // Method to convert the buffer to a base64 string
    toBase64() {
        const uint8Array = new Uint8Array(this.buffer.slice(0, this.size)); // Slice the buffer to the size of used data
        return btoa(String.fromCharCode.apply(null, uint8Array));
    }

    // Method to load data from a base64 string
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

const handler = new NotifyHandlerAbstract();
const middleware1 = new Msg_p_logger(1);
const middleware2 = new Msg_v_logger(2);

const serviceUUID = '2997855E-05B6-2C36-86A5-6C9856C73F4D'.toLowerCase();

/*
connectButton.addEventListener('click', async () => {
    await handler.connect('MyBluetoothDevice');
});
*/
document.getElementById('connectButton').addEventListener('click', async () => {
    //document.getElementById('service-id').innerHTML = serviceUUID;
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

const svg = d3.select("svg");
const margin = { top: 20, right: 100, bottom: 400, left: 50 };
const width = +svg.attr("width");
const height = +svg.attr("height");
//const height = 200;

// Define scales
const x = d3.scaleLinear().range([0, width]);
const y = d3.scaleLinear().domain([0, 100]).range([height, 0]);


// Define line generator
const line = d3.line()
    .x(d => x(d.getSeconds())) // Use time from data point for x
    .y(d => {
        try {
            return y(d.temperature())
        } catch (e) {
            console.log('filter not working for this graph.')
            return 0;
        }

    }); // Use float32 value for y

const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

// Initialize data arrays for two data sources
const dataSource1 = new DataSource(1024, "steelblue");
const dataSource2 = new DataSource(2048, "orange");

// Adding initial data to dataSource1 and dataSource2
/*
for (let i = 0; i < 10; i++) {
    dataSource1.addDataPoint(Date.now() + i * 1000, Math.random() * 100);
}

for (let i = 0; i < 100; i++) {
    dataSource2.addDataPoint(i, Math.sin(i / 10) * 50 + 50);
}
*/

// Append path for line chart
const path = g.append("path")
    .attr("fill", "none");

// Append axes
const xAxis = g.append("g")
    .attr("transform", `translate(0,${height})`);

const yAxis = g.append("g");


let multiplyOdd = false;
let useDataSource1 = true;
let currentIndex = 0;
let intervalId;
let sharingEnabled = false;

// Function to update chart
function updateChart(dataSource) {
    const data = dataSource.getClusterMessages(Msg_p.fromDataView);
    // Update x domain based on the current data
    //x.domain(d3.extent(data, d => {
    //    return d.getSeconds();
    //}));

    if (useDataSource1) {
        const now = Date.now();

        // TODO: Update x domain to show only the last 10 seconds
        //x.domain(d3.extent(data, d => { [now - 10000, now]; });

        x.domain(d3.extent(data, d => {
            return d.getSeconds();
        }));
    } else {
        // Set x domain to cover the data range in dataSource2
        x.domain(d3.extent(data, d => {
            return d.getSeconds();
        }));

    }

    // Update y domain
    y.domain([0, d3.max(data, d => d.temperature())]);

    // Update line path
    path.datum(data)
        .attr("d", line)
        .attr("stroke", dataSource.getColor());

    // Update axes
    xAxis.call(d3.axisBottom(x).ticks(5).tickFormat(d => (d - Date.now()) / 1000));
    yAxis.call(d3.axisLeft(y));
}

// Data stream for data source 1 (real-time data)
/*
BLUETOOTH
*/

const bleMiddleware = new BleMiddleware((dataView) => {
    dataSource1.addDataView(dataView);
    if (useDataSource1) {
        updateChart(dataSource1);
        // Capture data to dataSource2 if sharing is enabled
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

// Handle toggle multiply button click
/*
fromEvent(document.getElementById('toggleMultiply'), 'click').subscribe(() => {
    multiplyOdd = !multiplyOdd;
    console.log('Toggle multiply odd messages:', multiplyOdd);
});
*/


fromEvent(document.getElementById('monitor-graph'), 'click').subscribe(() => {
    document.getElementById('capture-controls').classList.remove('hidden');
});

// Handle toggle data source button click
function toggleDataSource() {
    useDataSource1 = !useDataSource1;
    console.log('Toggle data source:', useDataSource1 ? 'Data Source 1' : 'Data Source 2');
    document.getElementById('toggleCapture').disabled = !useDataSource1; // Enable share button only for dataSource1
    document.getElementById('toggleCapture').innerHTML = 'Capture'; // reset wording
    document.getElementById('toggleDataSource').innerHTML = useDataSource1 ? "Showing Live Data" : "Showing Capture #{num}"; // reset wording

    document.getElementById('play').disabled = useDataSource1; // Enable share button only for dataSource2
    document.getElementById('pause').disabled = useDataSource1; // Enable share button only for dataSource2
    if (!useDataSource1) {
        sharingEnabled = false; // Stop sharing when switching to dataSource2
        updateUsingCapturingData(currentIndex);
    } else {
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
fromEvent(document.getElementById('pause'), 'click').subscribe(() => {
    clearInterval(intervalId);
});

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

// Function to handle long-click event
function handleLongClick() {
    const activeDataSource = useDataSource1 ? dataSource1 : dataSource2;
    const userChoice = prompt("Choose an action: 'copy' to copy data to clipboard, 'paste' to import data from clipboard.");
    if (userChoice === 'copy') {
        const base64Data = activeDataSource.toBase64();
        navigator.clipboard.writeText(base64Data).then(() => {
            alert('Data has been copied to the clipboard!');
        }).catch(err => {
            console.error('Failed to copy data: ', err);
        });
    } else if (userChoice === 'paste') {

        navigator.clipboard.readText().then(clipText => {
            dataSource2.fromBase64(clipText);
            if (useDataSource1) {
                toggleDataSource();
            } else {
                updateChart(dataSource2);
            }
            doPlay();
            alert('Data has been pasted and imported!');
        }).catch(err => {
            console.error('Failed to read data from clipboard: ', err);
        });
    } else {
        alert('Invalid action. Please choose either "copy" or "paste".');
    }
}

// Variables for long-click detection
let clickTimer;

// SVG long-click event setup
svg.on('mousedown', () => {
    clickTimer = setTimeout(handleLongClick, 1000); // 1 second for a long-click
});

svg.on('mouseup', () => {
    clearTimeout(clickTimer); // Clear the timer if mouse is released before 1 second
});

svg.on('mouseleave', () => {
    clearTimeout(clickTimer); // Clear the timer if mouse leaves the SVG area
});


// Initial chart update
updateChart(dataSource1);