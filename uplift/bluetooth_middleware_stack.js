class BluetoothMiddlewareStack {
    constructor() {
        this.middlewares = [];
    }

    use(middleware, position = 'TODO') {
        this.middlewares.push(middleware);
    }

    remove(middleware) {
        this.middlewares = this.middlewares.filter(mw => mw !== middleware);
    }

    async notify(data) {
        let state = {};
        for (const middleware of this.middlewares) {
            let r = await middleware.process(data, state);
            if (r == 'pass') {
                // don't redefine data
            } else {
                data = r;
            }
        }
    }
}

export default BluetoothMiddlewareStack;