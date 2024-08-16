const serviceUUID = '2997855E-05B6-2C36-86A5-6C9856C73F4D'.toLowerCase();
//https://127.0.0.1:8081/ble.html


import { ClusterMessage, Msg_p } from './uplift/cluster_message.js'

document.getElementById('scanButton').addEventListener('click', async () => {
    document.getElementById('service-id').innerHTML = serviceUUID;
    try {
        console.log('Requesting Bluetooth devices...');
        const device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [serviceUUID]
        });

        console.log(`Device selected: ${device.name} (ID: ${device.id})`);

        // Update UI with device info
        const deviceList = document.getElementById('deviceList');
        const listItem = document.createElement('li');
        listItem.className = 'list-group-item';
        listItem.textContent = `Device: ${device.name} (ID: ${device.id})`;
        deviceList.appendChild(listItem);

        // Connect to the GATT server on the device
        const server = await device.gatt.connect();

        // Get the specified service
        const service = await server.getPrimaryService(serviceUUID);

        // Get all characteristics of the service
        const characteristics = await service.getCharacteristics();

        for (const characteristic of characteristics) {
            // Check if the characteristic supports notifications
            if (characteristic.properties.notify) {
                console.log(`Subscribing to characteristic: ${characteristic.uuid}`);

                // Add event listener for notifications
                document.getElementById('messageList');
                characteristic.addEventListener('characteristicvaluechanged', (event) => {
                    const value = event.target.value;
                    console.log(`Notification received from ${characteristic.uuid}:`, new TextDecoder().decode(value));
                    console.log(`value: `, (new Uint8Array(value.buffer, 0, 53).toString()));
                    var msg = document.createElement('li');
                    //msg.innerHTML = new TextDecoder().decode(value); //<-- this produces windings-like font with questionmarks. TextDecoder is the wrong thing!
                    //msg.innerHTML = dataViewToHex(value);
                    msg.innerHTML = `temp: ${(new Msg_p(value)).temperature()}`;
                    console.log(`amps: ${(new Msg_p(value)).amps()}`);
                    //msg.innerHTML = `temp: ${(new Msg_p(value)).temperature()}`;
                    messageList.appendChild(msg);
                });

                // Start notifications
                await characteristic.startNotifications();
            } else {
                console.log(`Characteristic ${characteristic.uuid} does not support notifications.`);
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
});

