import BluetoothMiddleware from './bluetooth_middleware.js';

class NotifyHandlerAbstract {
    constructor() {
        this.middleware = new BluetoothMiddleware();
        this.characteristic = null;
    }

    async connect(deviceName) {
        try {
            const device = await navigator.bluetooth.requestDevice({
                filters: [{ name: deviceName }],
                optionalServices: ['battery_service']
            });

            const server = await device.gatt.connect();
            const service = await server.getPrimaryService('battery_service');
            this.characteristic = await service.getCharacteristic('battery_level');

            await this.characteristic.startNotifications();

            this.characteristic.addEventListener('characteristicvaluechanged', (event) => {
                const value = event.target.value;
                const data = this.parseValue(value);
                this.middleware.notify(data);
            });

            console.log('Connected to', deviceName);
        } catch (error) {
            console.error('Error connecting to device:', error);
        }
    }

    parseValue(value) {
        return value.getUint8(0);
    }

    registerMiddleware(middleware) {
        if (typeof middleware.process === 'function') {
            this.middleware.use(middleware.process.bind(middleware));
        } else {
            this.middleware.use(middleware);
        }
    }

    deregisterMiddleware(middleware) {
        if (typeof middleware.process === 'function') {
            this.middleware.remove(middleware.process.bind(middleware));
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