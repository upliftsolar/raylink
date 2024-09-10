class BleMiddleware {
    constructor(afunc) {
        this.afunc = afunc;
    }

    process(data, state) {
        return this.afunc(data);
    }
}

//handler.register(bleMiddleware);

class OnFirstMsgPBleMiddleware {
    constructor(afunc) {
        this.done = false;
        this.afunc = afunc;
    }

    process(data, state) {
        if (this.done)
            return data;
        this.done = true;
        return this.afunc(data);
    }
}

export {
    BleMiddleware,
    OnFirstMsgPBleMiddleware,
}