import BluetoothMiddleware from './bluetooth_middleware.js';

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
        this.middleware = new BluetoothMiddleware();
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
                const value = event.target.value;
                const data = this.parseValue(value);
                this.middleware.notify(data);
            });

            console.log('Connected to', device.name);
        } catch (error) {
            console.error('Error connecting to device:', error);
        }
    }

    parseValue(value) {
        return value.getUint8(0);
    }

    registerMiddleware(middleware) {
        if (typeof middleware.process === 'function') {
            const boundMiddleware = middleware.process.bind(middleware);
            this.middleware.use(boundMiddleware);
            this.middlewareReferences.set(middleware, boundMiddleware);
        } else {
            this.middleware.use(middleware);
        }
    }

    deregisterMiddleware(middleware) {
        if (this.middlewareReferences.has(middleware)) {
            const boundMiddleware = this.middlewareReferences.get(middleware);
            this.middleware.remove(boundMiddleware);
            this.middlewareReferences.delete(middleware);
        } else {
            this.middleware.remove(middleware);
        }
    }

    disconnect() {
        if (this.characteristic) {
            this.characteristic.removeEventListener('characteristicvaluechanged', this.middleware.notify);
            this.characteristic.service.device.gatt.disconnect();
            console.log('Disconnected from device');
        }
    }

}

export default NotifyHandlerAbstract;