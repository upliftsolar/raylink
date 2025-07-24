import { Msg_p, Msg_v, Msg_m, ClusterMessage } from '../uplift/cluster_message.js'

class Msg_p_logger {
    constructor(whatever) {
        this.whatever = whatever;
    }

    process(data, state) {
        try {
            if (Msg_p.filter(data)) {
                console.debug('Msg_p_logger: data.byteLength', data.byteLength);
                console.debug('Msg_p_logger: ClusterMessage.bodyOffset', ClusterMessage.bodyOffset);
                const testP = new Msg_p(data);
                const bodyView = testP.rawBodyDataView();
                if (bodyView && bodyView.byteLength >= 26) {
                    state.p = testP;
                    console.log(state.p);
                    console.log(`p: ${state.p.toString()}`);
                } else {
                    if (window.DEBUG) {
                        console.warn('Msg_p_logger: rawBodyDataView too short for Msg_p', bodyView);
                    }
                }
                return data;
            }
        } catch (e) {
            console.error('Msg_p_logger error:', e, data, e.stack);
        }
        return 'pass';
    }
}
class Msg_v_logger {
    constructor(whatever) {
        this.whatever = whatever;
    }

    process(data, state) {
        try {
            if (Msg_v.filter(data)) {
                console.debug('Msg_v_logger: data.byteLength', data.byteLength);
                console.debug('Msg_v_logger: ClusterMessage.bodyOffset', ClusterMessage.bodyOffset);
                const testV = new Msg_v(data);
                const bodyView = testV.rawBodyDataView && testV.rawBodyDataView();
                if (bodyView && bodyView.byteLength > 0) {
                    // Print the bytes of the body
                    const bytes = Array.from(new Uint8Array(bodyView.buffer, bodyView.byteOffset, bodyView.byteLength));
                    console.log('Msg_v_logger: body bytes', bytes);
                    state.v = testV;
                    // Print the decoded version string
                    console.log(state.v);
                    console.log(`version: ${state.v.toString()}`);
                } else {
                    if (window.DEBUG) {
                        console.warn('Msg_v_logger: rawBodyDataView too short for Msg_v', bodyView);
                    }
                }
                return data;
            }
        } catch (e) {
            console.error('Msg_v_logger error:', e, data, e.stack);
        }
        return 'pass';
    }
}

//Create new class for m (handling mode control??)
class Msg_m_logger {
    constructor(whatever) {
        this.whatever = whatever;
    }

    process(data, state) {
        // Correct filter usage for Msg_m:
        if (Msg_m.filter()(data)) {
            state.m = new Msg_m(data); // Create a new Msg_m object
            console.log(state.m);
            console.log(`Mode (m): ${state.m.toString()}`); // Log the mode information
            return data;
        } else {
            return 'pass';
        }
    }
}


class FilterToMiddleware {
    constructor(toAddress) {
        this.toAddress = toAddress;
    }

    process(data, state) {
        //TODO
        return data;
    }
}

class NotObservedWindowMiddleware {
    process(data, state) {
        if (!window.notObservedWindow) window.notObservedWindow = {};
        const ccOffset = ClusterMessage.ccOffset;
        const cc = data.getUint8(ccOffset);
        const now = Date.now();
        if (!window.notObservedWindow[cc]) window.notObservedWindow[cc] = [];
        window.notObservedWindow[cc].push(now);
        window.notObservedWindow[cc] = window.notObservedWindow[cc].filter(ts => now - ts <= 2000);
        return data;
    }
}


export {
    Msg_p_logger,
    Msg_v_logger,
    Msg_m_logger,
    FilterToMiddleware,
    NotObservedWindowMiddleware,
}