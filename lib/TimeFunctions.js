const { exec } = require('child_process');
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

function setWindowsTime(t) {
    const [datePart , timePart] = t.split(' ')
    const [year, month, day] = datePart.split("-")
    const [hour, min, sec] = timePart.split(":")

    const dateStr = `${month}-${day}-${year}`;
    const timeStr = `${hour}:${min}:${sec}`;
    const cmd = `powershell -Command "Set-Date -Date '${dateStr} ${timeStr}'"`;

    exec(cmd, (err, stdout, stderr) => {
        if (err) {
            console.error('❌ Failed to set time:', stderr.trim());
        } else {
            console.log('✅ System time updated successfully.');
        }
        
    });
}

function gregorianToJalali(gy, gm, gd) {
    let g_d_m = [0, 31, ((gy % 4 == 0 && gy % 100 != 0) || (gy % 400 == 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    let jy = (gy <= 1600) ? 0 : 979;
    gy -= (gy <= 1600) ? 621 : 1600;
    let days = (365 * gy) + Math.floor((gy + 3) / 4) - Math.floor((gy + 99) / 100) + Math.floor((gy + 399) / 400);
    for (let i = 0; i < gm; ++i) {
        days += g_d_m[i];
    }
    days += gd - 1;
    let j_days = days - 79;
    let j_np = Math.floor(j_days / 12053);
    j_days %= 12053;
    jy += 33 * j_np + 4 * Math.floor(j_days / 1461);
    j_days %= 1461;
    if (j_days >= 366) {
        jy += Math.floor((j_days - 1) / 365);
        j_days = (j_days - 1) % 365;
    }
    let jm, jd;
    let j_months = [31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
    for (jm = 0; jm < 12 && j_days >= j_months[jm]; jm++) {
        j_days -= j_months[jm];
    }
    jd = j_days + 1;
    return [jy, jm + 1, jd];
}

function convertUtcToPersianDate(dateStr) {
    const [datePart, timePart] = dateStr.split(' ');
    const [gy, gm, gd] = datePart.split('-').map(Number);
    const [hour, minute, second] = timePart.split(':').map(Number);

    const [jy, jm, jd] = gregorianToJalali(gy, gm, gd);

    return `${jy}-${String(jm).padStart(2, '0')}-${String(jd).padStart(2, '0')} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`;
}

function convertUtcToTehranTime(dateStr) {
    // Input: "YYYY-MM-DD HH:MM:SS"
    const [datePart, timePart] = dateStr.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute, second] = timePart.split(':').map(Number);

    // Create a UTC date object
    const utcDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

    // Tehran is UTC+3:30 (no daylight saving)
    const tehranOffsetMinutes = 3 * 60 + 30;
    utcDate.setMinutes(utcDate.getMinutes() + tehranOffsetMinutes);

    // Format the result
    const tehranYear = utcDate.getUTCFullYear();
    const tehranMonth = String(utcDate.getUTCMonth() + 1).padStart(2, '0');
    const tehranDay = String(utcDate.getUTCDate()).padStart(2, '0');
    const tehranHour = String(utcDate.getUTCHours()).padStart(2, '0');
    const tehranMinute = String(utcDate.getUTCMinutes()).padStart(2, '0');
    const tehranSecond = String(utcDate.getUTCSeconds()).padStart(2, '0');

    return `${tehranYear}-${tehranMonth}-${tehranDay} ${tehranHour}:${tehranMinute}:${tehranSecond}`;
}

function isTehranTimeDifferentFromLocal(dateStr) {
    const tehranTime = convertUtcToTehranTime(dateStr);



    // Get local time equivalent
    const localDate = new Date();
    const localFormatted = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')} ${String(localDate.getHours()).padStart(2, '0')}:${String(localDate.getMinutes()).padStart(2, '0')}:${String(localDate.getSeconds()).padStart(2, '0')}`;

  
    if (tehranTime !== localFormatted) {
        console.log("Tehran time is different from local time.");
        return true;
    } else {
        console.log("Tehran time and local time are the same.");
        return false;
    }   
}

    
function isValidUtcDateString(dateStr) {
    // Match format: YYYY-MM-DD HH:MM:SS
    const regex = /^\d{4}-\d{1,2}-\d{1,2} \d{1,2}:\d{1,2}:\d{1,2}$/;
    if (!regex.test(dateStr)) return false;
  
    // Parse components
    const [datePart, timePart] = dateStr.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute, second] = timePart.split(':').map(Number);
  
    // Check for valid ranges
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false; // rough check, more precise next
    if (hour < 0 || hour > 23) return false;
    if (minute < 0 || minute > 59) return false;
    if (second < 0 || second > 59) return false;
  
    // Construct date and validate
    const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day &&
      date.getUTCHours() === hour &&
      date.getUTCMinutes() === minute &&
      date.getUTCSeconds() === second
    );
  }

module.exports = {
    convertUtcToPersianDate,
    parseGPRMC,
    setWindowsTime,
    isTehranTimeDifferentFromLocal,
    convertUtcToTehranTime, 
    isValidUtcDateString
}