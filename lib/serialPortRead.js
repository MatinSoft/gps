const { SerialPort } = require('serialport');

const BAUD_RATE = 9600;

// Auto-detect u-blox USB dongle
async function findUbloxPort() {
    const ports = await SerialPort.list();
    const gpsPort = ports.find(p =>
        p.manufacturer?.toLowerCase().includes('u-blox') ||
        p.vendorId === '1546' // u-blox vendor ID (hex: 0x060A)
    );

    if (!gpsPort) {
        throw new Error('❌ No u-blox GPS device found.');
    }

    console.log(`✅ Found GPS on ${gpsPort.path}`);
    return gpsPort.path;
}


module.exports = {
    findUbloxPort,
    BAUD_RATE
}
