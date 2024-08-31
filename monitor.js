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
                r = parseFunc(new DataView(this.view.buffer, offset, nextOffset - offset));
                clusterMessages.push(r);
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
            document.getElementById('toggleShare').disabled = false;
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
const width = +svg.attr("width");
const height = +svg.attr("height");

// Define scales
const x = d3.scaleLinear().range([0, width]);
const y = d3.scaleLinear().domain([0, 100]).range([height, 0]);

// Define line generator
const line = d3.line()
    .x(d => x(d.getSeconds())) // Use time from data point for x
    .y(d => {
        try {
            return y(d.volts())
        } catch (e) {
            console.log('filter not working for this graph.')
            return 0;
        }

    }); // Use float32 value for y

// Append path for line chart
const path = svg.append("path")
    .attr("fill", "none");

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

let multiplyOdd = false;
let useDataSource1 = true;
let currentIndex = 0;
let intervalId;
let sharingEnabled = false;

// Function to update chart
function updateChart(dataSource) {
    const data = dataSource.getClusterMessages(Msg_p.fromDataView);
    // Update x domain based on the current data
    x.domain(d3.extent(data, d => {
        return d.getSeconds();
    }));
    path.datum(data)
        .attr("d", line)
        .attr("stroke", dataSource.getColor()); // Use color from DataSource instance
}

// Data stream for data source 1 (real-time data)
/*
BLUETOOTH
*/

const bleMiddleware = new BleMiddleware((dataView) => {
    dataSource1.addDataView(dataView);
    if (useDataSource1) {
        updateChart(dataSource1);
        // Share data to dataSource2 if sharing is enabled
        if (sharingEnabled) {
            dataSource2.addDataView(dataView);
        }
    }
    return dataView;
});
handler.register(bleMiddleware);

function updateUsingSharingData(index) {
    if (!useDataSource1) {
        let data = dataSource2.getClusterMessages(Msg_p.fromDataView).slice(Math.max(0, index - 10), index);
        updateChart({ getClusterMessages: () => data, getColor: () => dataSource2.getColor() });
    }
}

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
    document.getElementById('toggleShare').innerHTML = 'Share'; // reset wording
    document.getElementById('play').disabled = useDataSource1; // Enable share button only for dataSource2
    document.getElementById('pause').disabled = useDataSource1; // Enable share button only for dataSource2
    if (!useDataSource1) {
        sharingEnabled = false; // Stop sharing when switching to dataSource2
        updateUsingSharingData(currentIndex);
    } else {
        updateChart(dataSource1);
    }
});

// Play button event
fromEvent(document.getElementById('play'), 'click').subscribe(() => {
    if (intervalId) clearInterval(intervalId);
    intervalId = setInterval(() => {
        currentIndex = (currentIndex + 1) % dataSource2.getClusterMessages(Msg_p.fromDataView).length;
        updateUsingSharingData(currentIndex);
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
    document.getElementById('toggleShare').innerHTML = sharingEnabled ? 'Stop' : 'Clear & Share';
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
    updateUsingSharingData(currentIndex);
});

// Initial chart update
updateChart(dataSource1);