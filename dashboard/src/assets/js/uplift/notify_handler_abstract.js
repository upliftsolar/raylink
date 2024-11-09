import BluetoothMiddlewareStack from './bluetooth_middleware_stack.js';

const serviceUUID = '2997855E-05B6-2C36-86A5-6C9856C73F4D'.toLowerCase();
const notifyCharacteristicUUID = '467daa96-bd29-2b88-f750-1ebe82081902'; // reference nrf connect (this one recieves data)
const writeCharacteristicUUID = '467daa96-bd29-2b88-f750-1ebe82081902'; // (this one should send data) cannot reference nrf device not working
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

            // Initizalize NOTIFY CHARACTERISTIC
            this.characteristic = await service.getCharacteristic(notifyCharacteristicUUID);
            await this.characteristic.startNotifications();
            this.characteristic.addEventListener('characteristicvaluechanged', (event) => {
                this.middlewareStack.notify(event.target.value);
            });

            // Initializa WRITE CHARACTERISTIC (this is new)
            this.writeCharacteristic = await service.getCharacteristic(writeCharacteristicUUID);
        
            console.log('Connected to', device.name);
        } catch (error) {
            console.error('Error connecting to device:', error);
        }
    }

    // Adding write() method for sending data ?? this is also new. Not tested yet, device womp womp
    async write(message) {
        if (!this.writeCharacteristic) {
            console.error('Write Characteristic is not available');
            return;
        }
        try {
            await this.writeCharacteristic.writeValue(message);
            console.log('Message sent to device:', message);
        } catch (error) {
            console.error('Failed to send message: ', error);
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