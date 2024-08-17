import NotifyHandlerAbstract from './uplift/notify_handler_abstract.js';
import { Msg_p_logger, Msg_v_logger } from './middlewares/customMiddleware.js';

const middleware1Switch = document.getElementById('middleware1');
const middleware2Switch = document.getElementById('middleware2');

const handler = new NotifyHandlerAbstract();
const middleware1 = new Msg_p_logger(1);
const middleware2 = new Msg_v_logger(2);

const serviceUUID = '2997855E-05B6-2C36-86A5-6C9856C73F4D'.toLowerCase();

/*
connectButton.addEventListener('click', async () => {
    await handler.connect('MyBluetoothDevice');
});
*/
document.getElementById('connectButton').addEventListener('click', async () => {
    //document.getElementById('service-id').innerHTML = serviceUUID;
    try {
        console.log('Requesting Bluetooth devices...');
        const device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [serviceUUID]
        });

        console.log(`Device selected: ${device.name} (ID: ${device.id})`);


        await handler.connect(device);
        document.getElementById('connectButton').innerHTML = device.name;

    } catch (error) {
        console.error('Error:', error);
    }
});


middleware1Switch.addEventListener('change', (event) => {
    if (event.target.checked) {
        handler.register(middleware1);
        console.log('Middleware 1 registered');
    } else {
        handler.deregister(middleware1);
        console.log('Middleware 1 deregistered');
    }
});

middleware2Switch.addEventListener('change', (event) => {
    if (event.target.checked) {
        handler.register(middleware2);
        console.log('Middleware 2 registered');
    } else {
        handler.deregister(middleware2);
        console.log('Middleware 2 deregistered');
    }
});