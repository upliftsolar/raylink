import { Msg_p, Msg_v, Msg_m, ClusterMessage } from '../uplift/cluster_message.js'

class Msg_p_logger {
    constructor(whatever) {
        this.whatever = whatever;
    }

    process(data, state) {
        try {
            if (Msg_p.filter(data)) {
                // Defensive: Only parse if data.byteLength is sufficient for Msg_p
                if (data.byteLength >= 26) { // 26 is the offset for temperature()
                    state.p = new Msg_p(data);
                    console.log(state.p);
                    console.log(`p: ${state.p.toString()}`)
                } else {
                    console.warn('Msg_p_logger: DataView too short for Msg_p', data);
                }
                return data;
            }
        } catch (e) {
            console.error('Msg_p_logger error:', e, data);
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
                // Defensive: Only parse if data.byteLength is sufficient for Msg_v (needs at least bodyOffset for body)
                if (data.byteLength >= ClusterMessage.bodyOffset) {
                    state.v = new Msg_v(data);
                    console.log(state.v);
                    console.log(`version: ${state.v.toString()}`)
                } else {
                    console.warn('Msg_v_logger: DataView too short for Msg_v', data);
                }
                return data;
            }
        } catch (e) {
            console.error('Msg_v_logger error:', e, data);
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

setInterval(() => {
    if (window.notObserved) {
        console.log('notObserved.p:', window.notObserved.p);
        console.log('notObserved.v:', window.notObserved.v);
        console.log('notObserved.m:', window.notObserved.m);
    }
}, 1000);