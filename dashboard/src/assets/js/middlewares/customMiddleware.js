import { Msg_p, Msg_v } from '../uplift/cluster_message.js'

class Msg_p_logger {
    constructor(whatever) {
        this.whatever = whatever;
    }

    process(data, state) {
        if (Msg_p.filter(data)) {
            state.p = new Msg_p(data);
            console.log(state.p);
            console.log(`p: ${state.p.toString()}`)
            return data;
        } else {
            return 'pass';
        }
    }
}
class Msg_v_logger {
    constructor(whatever) {
        this.whatever = whatever;
    }

    process(data, state) {
        if (Msg_v.filter(data)) {
            state.v = new Msg_v(data);
            console.log(state.v);
            console.log(`version: ${state.v.toString()}`)
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


export {
    Msg_p_logger,
    Msg_v_logger,
    FilterToMiddleware,
}