function dataViewToHex(dataView) {
    const hexStringArray = [];
    for (let i = 0; i < dataView.byteLength; i++) {
        const byte = dataView.getUint8(i);
        const hexString = byte.toString(16).padStart(2, '0').toUpperCase();
        hexStringArray.push(hexString);
    }
    return hexStringArray.join(' ');
}


class ClusterMessage {
    constructor(dataView, debugging = true) {
        this.parts = ClusterMessage.parseDataView(dataView);
        if (debugging)
            this.hex = this.parts.map(dataViewToHex);
    }
    static getClassName() {
        return this.name;
    }
    static getClassToken() {
        return `${this.name}`.replace(/_msg/, '');
    }

    static addresses = [[0, 6], [(6), 6], [(6 + 6), 10], [(6 + 6 + 10), 1], [(6 + 6 + 10 + 1), 1]];

    static fromAdress = ClusterMessage.addresses[0];
    static toAddress = ClusterMessage.addresses[1];
    static timeAddress = ClusterMessage.addresses[2];
    static subsystemAddress = ClusterMessage.addresses[3];
    static ccAddress = ClusterMessage.addresses[4];
    static bodyOffset = ClusterMessage.addresses[4].reduce((acc, currentValue) => { return acc + currentValue; }, 0); //sum

    static parseDataView(dataView) {
        // Lengths of each segment [from, to, timestamp, subsystem, controlCharacter]
        const result = [];

        for (const [offset, length] of ClusterMessage.addresses) {
            result.push(new DataView(dataView.buffer, offset, length));
        }
        // Append the rest of the DataView
        if (ClusterMessage.bodyOffset < dataView.byteLength) {
            result.push(new DataView(dataView.buffer, ClusterMessage.bodyOffset, dataView.byteLength - ClusterMessage.bodyOffset));
        }

        return result;
    }

    from() {
        return this.parts[0];
    }
    to() {
        return this.parts[1];
    }

    time() {
        return this.parts[2];
    }
    subsytem() {
        return this.parts[3];
    }
    cc() {
        return this.parts[4];
    }
    raw() {
        return this.parts;
    }
    rawBody() {
        return this.parts[5];
    }
    display() { return dataViewToHex(this.parts[5]); }
    print() { console.log(display()); }

    static filter(a, b, c) {
        return (dataView) => {
            //return (dataView[ccAddress] == 112);
            return true;
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
}
class p_msg extends ClusterMessage {
    devInfo() { return this.rawBody()[12]; }
    amps() {
        let a = this.rawBody().getFloat32(17, true);
        if (a > 383) return 0;
        return a;
    }
    volts() { return this.rawBody().getFloat32(21, true); }
    temperature() { return this.rawBody().getFloat32(21, true); }

    filter() {
        return (dataView) => {
            return (dataView[ClusterMessage.ccAddress[0]] == 112);
        };
    }
}