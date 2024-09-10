function dataViewToHex(dataView) {
    const hexStringArray = [];
    for (let i = 0; i < dataView.byteLength; i++) {
        const byte = dataView.getUint8(i);
        const hexString = byte.toString(16).padStart(2, '0').toUpperCase();
        hexStringArray.push(hexString);
    }
    return hexStringArray.join(' ');
}

function getUint64(dataView, byteOffset, littleEndian = false) {
    // Read two 32-bit unsigned integers (high and low parts)
    const high = dataView.getUint32(byteOffset, !littleEndian);
    const low = dataView.getUint32(byteOffset + 4, !littleEndian);

    // Combine them into a 64-bit unsigned integer using BigInt
    return (BigInt(high) << BigInt(32)) | BigInt(low);
}
function debugPrint(str) {
    console.log(str);
}

class UTimestamp {
    constructor() {
        this.seconds = 0n;  // Using BigInt for seconds
        this.milliseconds = 0;

        const now = Date.now();
        this.seconds = BigInt(Math.floor(now / 1000));  // Explicit BigInt conversion
        this.milliseconds = now % 1000;
    }

    static fromBuffer(buffer) {
        const instance = new UTimestamp();

        // Create a DataView from the input buffer
        const dataView = new DataView(buffer);

        // Create a temporary buffer of 8 bytes to handle the BigInt conversion
        const tmpBuffer = new ArrayBuffer(8);
        const tmpView = new DataView(tmpBuffer);

        // Copy the first 6 bytes from the input buffer to the temporary buffer for seconds
        new Uint8Array(tmpBuffer).set(new Uint8Array(buffer.slice(0, 6)), 2);
        instance.seconds = tmpView.getBigUint64(0, false); // Extract as BigInt

        // Extract milliseconds directly from the buffer using a 4-byte view
        instance.milliseconds = dataView.getUint32(6, false); // Use Uint32 for milliseconds

        return instance;
    }

    toInt() {
        return Number(this.seconds); // Explicit conversion to Number
    }

    toHuman() {
        return Number(this.seconds); // Explicit conversion to Number
    }

    toBinary() {
        const out = [];

        // Converting seconds (BigInt) to bytes using an 8-byte buffer
        const secondsBuffer = new ArrayBuffer(8);
        const secondsView = new DataView(secondsBuffer);
        secondsView.setBigUint64(0, this.seconds, false);
        out.push(...new Uint8Array(secondsBuffer).slice(2, 8));

        // Converting milliseconds (Number) to bytes using a 4-byte buffer
        const millisBuffer = new ArrayBuffer(4);
        const millisView = new DataView(millisBuffer);
        millisView.setUint32(0, this.milliseconds, false);
        out.push(...new Uint8Array(millisBuffer));

        return new Uint8Array(out);
    }

    secondsToBinary() {
        const out = [];

        // Converting seconds (BigInt) to bytes using an 8-byte buffer
        const secondsBuffer = new ArrayBuffer(8);
        const secondsView = new DataView(secondsBuffer);
        secondsView.setBigUint64(0, this.seconds, false);
        out.push(...new Uint8Array(secondsBuffer).slice(2, 8));

        return new Uint8Array(out);
    }

    datetime() {
        // Convert seconds (BigInt) to milliseconds and add milliseconds (Number)
        return new Date(Number(this.seconds) * 1000 + this.milliseconds); // Explicit conversion to Number
    }
}


class ClusterMessage {
    static cc = 0;
    static fromDataView(dataView) {
        //return new this(dataView, dataView.byteOffset, dataView.byteLength);
        return new ClusterMessage(dataView, dataView.byteOffset, dataView.byteLength);
    }
    constructor(dataView_or_ints, start = 0, end = -1) {
        let dataView;
        if (typeof dataView_or_ints === 'object') {
            dataView = dataView_or_ints;
        } else if (typeof dataView_or_ints[0] === 'number') {
            dataView = new DataView(new Uint8Array(dataView_or_ints).buffer);
        } else {
            throw Error(`Unsupported type for ClusterMessage constructor: ${typeof (dataView_or_ints)}`)
        }
        Object.assign(this, ClusterMessage.parse(dataView, start, end));
        if (globalThis.DEBUG) {
            this.hex = this.parts.slice(4).map(dataViewToHex);
            //this.hex.push(this.parts[5].buffer.slice(24));
        }
    }
    getClassName() {
        return this.constructor.name;
    }
    getClassToken() {
        return `${this.constructor.name}`.replace(/Msg_/, '');
    }

    static protocolLengths = [6, 6, 10, 1, 1];

    static fromOffset = 0
    static toOffset = ClusterMessage.protocolLengths.slice(0, 1).reduce((acc, currentValue) => { return acc + currentValue; }, 0); //sum;
    static timeOffset = ClusterMessage.protocolLengths.slice(0, 2).reduce((acc, currentValue) => { return acc + currentValue; }, 0); //sum;
    static subsystemOffset = ClusterMessage.protocolLengths.slice(0, 3).reduce((acc, currentValue) => { return acc + currentValue; }, 0); //sum;
    static ccOffset = ClusterMessage.protocolLengths.slice(0, 4).reduce((acc, currentValue) => { return acc + currentValue; }, 0); //sum;
    static bodyOffset = ClusterMessage.protocolLengths.reduce((acc, currentValue) => { return acc + currentValue; }, 0); //sum
    static productRegistry = {
        0: 'spm',
        1: 'smpc',

    }



    static parseParts(dataView, start = 0, end = -1) {
        var offset = start;
        if (end == -1)
            end = dataView.byteLength;
        var result = [];
        for (const length of ClusterMessage.protocolLengths) {
            result.push(dataView.buffer.slice(offset, offset + length));
            offset += length;
        }
        if (offset < end) { //return part 5 as a dataview rather than byte array
            result.push(new DataView(dataView.buffer, offset, end - offset));
        } else {
            debugPrint('DEV: what? 1');
        }
        return result;
    }

    fromBuffer() {
        return this.parts[0];
    }
    toBuffer() {
        return this.parts[1];
    }

    timeBuffer() {
        return this.parts[2];
    }

    //number of seconds since the device restarted.
    getSeconds() {
        this.timestamp = this.timestamp ?? UTimestamp.fromBuffer(this.timeBuffer());
        return Number(this.timestamp.seconds); // we know this isn't big.
    }
    getTime() {
        this.timestamp = this.timestamp ?? UTimestamp.fromBuffer(this.timeBuffer());
        return this.timestamp.datetime();
    }
    subsytemBuffer() {
        return this.parts[3];
    }
    isSPM() { return (product() == 'spm'); }
    product() {
        return ClusterMessages.productRegistry[this.parts[3][0]];
    }
    cc() {
        return this.parts[4];
    }
    raw() {
        var out = [];
        for (var i = 0; i < 4; i++) {
            out.push(Array.from(new Uint8Array(this.parts[i])));
        }
        return out;
    }
    rawBodyDataView() {
        return this.parts[5];
    }

    buffer() {
        return parts[5].buffer;
    }
    display() { return dataViewToHex(this.parts[5]); }
    print() { console.log(display()); }

    toString() { return dataViewToHex(this.parts[5]); }

    static filter(to = 'any', from = 'any') {
        return (dataView, offset = 0) => {
            //TODO, filter by to/from
            return this.cc == dataView.getUint8(offset + ClusterMessage.ccOffset);
        };
    }

    /*
    FROM
    TO
    TIMESTAMP
    SUBSYSTEM
    CONTROL CHARACTER
    REST OF MESSAGE (if controlCharacter was 'd' then you can use new TextDecoder(parts[4]))
    */
    static parse(dataView, start, end = -1) {
        var parts = ClusterMessage.parseParts(dataView, start, end);
        if (parts[5] == undefined) {
            console.log('DEV: wtf?');
        }
        return ({
            from: parts[0],
            to: parts[1],
            time: parts[2],
            subsystem: parts[3],
            cc: parts[4],
            body: parts[5],
            parts: parts,
        });
    }

}

class Msg_p extends ClusterMessage {
    static cc = 112;
    static fromDataView(dataView) {
        //TODO: Msgs use end offset, while DataView constructors use Length. Maybe switch Msg constructors/parsers.

        let p = new Msg_p(dataView, dataView.byteOffset, dataView.byteOffset + dataView.byteLength);
        return p;
    }
    amps() {
        let a = this.rawBodyDataView().getFloat32(17, true);
        //DEBUGGING: if (a > 383) { console.log(new Uint8Array(this.parts[5].buffer).toString()); }
        if (a > 383) return 0; // this was an early issue on SPMs
        return a;
    }
    volts() {
        return this.rawBodyDataView().getFloat32(21, true);
    }
    temperature() {
        return this.rawBodyDataView().getFloat32(25, true);
    }
    toString() {
        return `${this.amps()}:${this.volts()}:${this.temperature()}`;
    }
}

class Msg_v extends ClusterMessage {
    static cc = 118;
    static fromDataView(dataView) {
        //return new this(dataView, dataView.byteOffset, dataView.byteLength);
        return new Msg_v(dataView, dataView.byteOffset, dataView.byteLength);
    }
    toString() {
        return (new TextDecoder().decode(this.rawBodyDataView()));
    }
    static filter(to = 'any', from = 'any') {
        return (dataView) => {
            //TODO, filter by to/from
            return Msg_v.cc == dataView.getUint8(ClusterMessage.ccOffset);
        };
    }
}

export {
    dataViewToHex,
    ClusterMessage,
    Msg_p,
    Msg_v,
}