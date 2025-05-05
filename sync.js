const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { exec } = require('child_process');

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

function parseGPRMC(line) {
    const parts = line.split(',');
    if (parts[0].includes('GPRMC') && parts[2] === 'V') {
        try {
            const hh = parseInt(parts[1].slice(0, 2));
            const mm = parseInt(parts[1].slice(2, 4));
            const ss = parseInt(parts[1].slice(4, 6));

            const dd = parseInt(parts[9].slice(0, 2));
            const mo = parseInt(parts[9].slice(2, 4));
            const yy = 2000 + parseInt(parts[9].slice(4, 6));

            return { year: yy, month: mo, day: dd, hour: hh, min: mm, sec: ss };
        } catch {
            return null;
        }
    }
    return null;
}

function setWindowsTime({ year, month, day, hour, min, sec }) {
    const dateStr = `${month}-${day}-${year}`;
    const timeStr = `${hour}:${min}:${sec}`;
    const cmd = `powershell -Command "Set-Date -Date '${dateStr} ${timeStr}'"`;

    exec(cmd, (err, stdout, stderr) => {
        if (err) {
            console.error('❌ Failed to set time:', stderr.trim());
        } else {
            console.log('✅ System time updated successfully.');
        }
        process.exit();
    });
}

async function start() {
    let portPath;
    try {
        portPath = await findUbloxPort();
    } catch (e) {
        console.error(e.message);
        return;
    }

    const port = new SerialPort({ path: portPath, baudRate: BAUD_RATE });
    const parser = port.pipe(new ReadlineParser({ delimiter: '\r\n' }));

    console.log('📡 Waiting for valid GPS fix (GPRMC)...');

    parser.on('data', line => {
        if (line.startsWith('$GPRMC') || line.startsWith('$GNRMC')) {
            const t = parseGPRMC(line);
            if (t) {
                const time = `${t.year}-${t.month}-${t.day} ${t.hour}:${t.min}:${t.sec}`
                console.log(`🕒 GPS Time: ${time}`);
                // setWindowsTime(t);
            }
        }
    });

    port.on('readable', function () {
        const data = port.read().toString()
        // if (data.startsWith('$GPRMC') || data.startsWith('$GNRMC')) { 

        // console.log('Data:', data)
        // console.log('==============')
        // }
    })
}

start();
