class BluetoothMiddleware {
    constructor() {
        this.middlewares = [];
    }

    // Register a middleware
    use(middleware) {
        this.middlewares.push(middleware);
    }

    // Deregister a middleware
    remove(middleware) {
        this.middlewares = this.middlewares.filter(mw => mw !== middleware);
    }

    // Notify all registered middlewares
    async notify(data) {
        for (const middleware of this.middlewares) {
            await middleware(data);
        }
    }
}

export default BluetoothMiddleware;