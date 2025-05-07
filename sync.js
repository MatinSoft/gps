const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const { isTehranTimeDifferentFromLocal, parseGPRMC, setWindowsTime, convertUtcToTehranTime, isValidUtcDateString } = require("./lib/TimeFunctions")
const { findUbloxPort, BAUD_RATE } = require("./lib/serialPortRead")


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
                if (isValidUtcDateString(time)) {

                    console.log(`🕒 GPS Time: ${time}`);
                    const tehranTime = convertUtcToTehranTime(time);
                    if (isTehranTimeDifferentFromLocal(time)) {

                        setWindowsTime(tehranTime);
                    }
                }

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


exports.monitorGpsTime = start;
