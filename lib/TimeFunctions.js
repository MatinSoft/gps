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
  
    // Parse UTC input string manually
    const [datePart, timePart] = dateStr.split(' ');
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute, second] = timePart.split(':').map(Number);
    const inputUTCDate = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  
    // Get local time equivalent
    const localDate = new Date(inputUTCDate);
    const localFormatted = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')} ${String(localDate.getHours()).padStart(2, '0')}:${String(localDate.getMinutes()).padStart(2, '0')}:${String(localDate.getSeconds()).padStart(2, '0')}`;
  
    if (tehranTime !== localFormatted) {
      console.log("Tehran time is different from local time.");
      return true;
    } else {
      console.log("Tehran time and local time are the same.");
      return false;
    }
  }

  module.exports = {
    convertUtcToPersianDate,
    parseGPRMC,
    setWindowsTime,
    isTehranTimeDifferentFromLocal,
    convertUtcToTehranTime
  }