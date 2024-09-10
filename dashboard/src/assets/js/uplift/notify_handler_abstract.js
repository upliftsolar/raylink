import BluetoothMiddlewareStack from './bluetooth_middleware_stack.js';

const serviceUUID = '2997855E-05B6-2C36-86A5-6C9856C73F4D'.toLowerCase();
const characteristicUUID = '467daa96-bd29-2b88-f750-1ebe82081902';
/*
for (const characteristic of characteristics) {
    // Check if the characteristic supports notifications
    if (characteristic.properties.notify) {
        console.log(`Subscribing to characteristic: ${characteristic.uuid}`);

        // Add event listener for notifications
        document.getElementById('messageList');
        characteristic.addEventListener('characteristicvaluechanged', (event) => {
*/

class NotifyHandlerAbstract {
    constructor() {
        this.middlewareStack = new BluetoothMiddlewareStack();
        this.characteristic = null;
        this.middlewareReferences = new Map();
    }

    //const service = await server.getPrimaryService(serviceUUID);
    async connect(device) {
        try {
            const server = await device.gatt.connect();
            const service = await server.getPrimaryService(serviceUUID);
            this.characteristic = await service.getCharacteristic(characteristicUUID);

            await this.characteristic.startNotifications();

            this.characteristic.addEventListener('characteristicvaluechanged', (event) => {
                this.middlewareStack.notify(event.target.value);
            });

            console.log('Connected to', device.name);
        } catch (error) {
            console.error('Error connecting to device:', error);
        }
    }

    register(middleware) {
        if ((typeof this.middlewareStack.process) === 'function') {
            const boundMiddleware = middlewareStack.process.bind(middleware);
            this.middlewareStack.use(boundMiddleware);
            this.middlewareReferences.set(middleware, boundMiddleware);
        } else {
            this.middlewareStack.use(middleware);
        }
    }

    deregister(middleware) {
        if (this.middlewareReferences.has(middleware)) {
            const boundMiddleware = this.middlewareReferences.get(middleware);
            this.middlewareStack.remove(boundMiddleware);
            this.middlewareReferences.delete(middleware);
        } else {//TODO, why wouldn't the reference exist?
            this.middlewareStack.remove(middleware);
        }
    }

    disconnect() {
        if (this.characteristic) {
            this.characteristic.removeEventListener('characteristicvaluechanged', this.middlewareStack.notify);
            this.characteristic.service.device.gatt.disconnect();
            console.log('Disconnected from device');
        }
    }

}

export default NotifyHandlerAbstract;