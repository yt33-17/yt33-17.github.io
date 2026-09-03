(() => {
  const root = document.getElementById('calendar-weather');
  if (!root) return;

  const config = window.CW_CONFIG || {};

  // ---------- 农历算法（1900-2049） ----------
  const lunarInfo = [
    0x04bd8, 0x04ae0, 0x0a570, 0x054d5, 0x0d260, 0x0d950, 0x16554, 0x056a0, 0x09ad0, 0x055d2, // 1900-1909
    0x04ae0, 0x0a5b6, 0x0a4d0, 0x0d250, 0x1d255, 0x0b540, 0x0d6a0, 0x0ada2, 0x095b0, 0x14977, // 1910-1919
    0x04970, 0x0a4b0, 0x0b4b5, 0x06a50, 0x06d40, 0x1ab54, 0x02b60, 0x09570, 0x052f2, 0x04970, // 1920-1929
    0x06566, 0x0d4a0, 0x0ea50, 0x06e95, 0x05ad0, 0x02b60, 0x186e3, 0x092e0, 0x1c8d7, 0x0c950, // 1930-1939
    0x0d4a0, 0x1d8a6, 0x0b550, 0x056a0, 0x1a5b4, 0x025d0, 0x092d0, 0x0d2b2, 0x0a950, 0x0b557, // 1940-1949
    0x06ca0, 0x0b550, 0x15355, 0x04da0, 0x0a5b0, 0x14573, 0x052b0, 0x0a9a8, 0x0e950, 0x06aa0, // 1950-1959
    0x0aea6, 0x0ab50, 0x04b60, 0x0aae4, 0x0a570, 0x05260, 0x0f263, 0x0d950, 0x05b57, 0x056a0, // 1960-1969
    0x096d0, 0x04dd5, 0x04ad0, 0x0a4d0, 0x0d4d4, 0x0d250, 0x0d558, 0x0b540, 0x0b6a0, 0x195a6, // 1970-1979
    0x095b0, 0x049b0, 0x0a974, 0x0a4b0, 0x0b27a, 0x06a50, 0x06d40, 0x0af46, 0x0ab60, 0x09570, // 1980-1989
    0x04af5, 0x04970, 0x064b0, 0x074a3, 0x0ea50, 0x06b58, 0x05ac0, 0x0ab60, 0x096d5, 0x092e0, // 1990-1999
    0x0c960, 0x0d954, 0x0d4a0, 0x0da50, 0x07552, 0x056a0, 0x0abb7, 0x025d0, 0x092d0, 0x0cab5, // 2000-2009
    0x0a950, 0x0b4a0, 0x0baa4, 0x0ad50, 0x055d9, 0x04ba0, 0x0a5b0, 0x15176, 0x052b0, 0x0a930, // 2010-2019
    0x07954, 0x06aa0, 0x0ad50, 0x05b52, 0x04b60, 0x0a6e6, 0x0a4e0, 0x0d260, 0x0ea65, 0x0d530, // 2020-2029
    0x05aa0, 0x076a3, 0x096d0, 0x04afb, 0x04ad0, 0x0a4d0, 0x1d0b6, 0x0d250, 0x0d520, 0x0dd45, // 2030-2039
    0x0b5a0, 0x056d0, 0x055b2, 0x049b0, 0x0a577, 0x0a4b0, 0x0aa50, 0x1b255, 0x06d20, 0x0ada0, // 2040-2049
  ];
  const leapMonth = (y) => lunarInfo[y - 1900] & 0xf;
  const leapDays = (y) =>
    leapMonth(y) ? (lunarInfo[y - 1900] & 0x10000 ? 30 : 29) : 0;
  const monthDays = (y, m) =>
    (lunarInfo[y - 1900] & (0x10000 >> m)) ? 30 : 29;
  const lYearDays = (y) => {
    let sum = 348;
    for (let i = 0x8000; i > 0x8; i >>= 1) {
      sum += lunarInfo[y - 1900] & i ? 1 : 0;
    }
    return sum + leapDays(y);
  };

  const LUNAR_MONTHS = ['正', '二', '三', '四', '五', '六', '七', '八', '九', '十', '冬', '腊'];
  function lunarDayStr(d) {
    const nums = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'];
    const prefixes = ['初', '十', '廿', '三'];
    if (d === 10) return '初十';
    if (d === 20) return '二十';
    if (d === 30) return '三十';
    return prefixes[Math.floor(d / 10)] + nums[(d % 10) - 1];
  }

  function solarToLunar(date) {
    let offset = Math.floor(
      (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
        Date.UTC(1900, 0, 31)) / 86400000
    );
    let i, temp = 0;
    for (i = 1900; i < 2050 && offset > 0; i++) {
      temp = lYearDays(i);
      offset -= temp;
    }
    if (offset < 0) {
      offset += temp;
      i--;
    }
    const lunarYear = i;
    const leap = leapMonth(i);
    let isLeap = false;
    for (i = 1; i < 13 && offset > 0; i++) {
      if (leap > 0 && i === leap + 1 && !isLeap) {
        --i;
        isLeap = true;
        temp = leapDays(lunarYear);
      } else {
        temp = monthDays(lunarYear, i);
      }
      if (isLeap && i === leap + 1) isLeap = false;
      offset -= temp;
    }
    if (offset === 0 && leap > 0 && i === leap + 1) {
      if (isLeap) isLeap = false;
      else {
        isLeap = true;
        --i;
      }
    }
    if (offset < 0) {
      offset += temp;
      --i;
    }
    return {
      month: (isLeap ? '闰' : '') + LUNAR_MONTHS[i - 1] + '月',
      day: lunarDayStr(offset + 1),
    };
  }

  // ---------- 日期显示 ----------
  const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
  function renderDate() {
    const now = new Date();
    root.querySelector('.cw-date').textContent =
      `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
    root.querySelector('.cw-weekday').textContent = `星期${WEEK[now.getDay()]}`;
    const lunar = solarToLunar(now);
    root.querySelector('.cw-lunar').textContent = `农历${lunar.month}${lunar.day}`;
  }

  // ---------- 访客 IP 定位 ----------
  // pconline JSONP：返回中文城市名（接口为 GBK 编码，script 标签必须指定 charset）
  function locateCityCN() {
    return new Promise((resolve, reject) => {
      const cbName = '__cwIpCallback';
      const script = document.createElement('script');
      script.src = 'https://whois.pconline.com.cn/ipJson.jsp?callback=' + cbName;
      script.charset = 'gbk';
      const cleanup = () => {
        clearTimeout(timer);
        delete window[cbName];
        script.remove();
      };
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('ip locate timeout'));
      }, 5000);
      window[cbName] = (data) => {
        cleanup();
        try {
          // 去除结尾的"市"字（直辖市返回 pro/city 相同）
          const city = (data.city || '').replace(/市$/, '');
          if (!city) throw new Error('no city');
          resolve(city);
        } catch (err) {
          reject(err);
        }
      };
      script.onerror = () => {
        cleanup();
        reject(new Error('ip locate failed'));
      };
      document.head.appendChild(script);
    });
  }

  // ipwho.is：返回城市名与经纬度
  async function locateCoords() {
    const ip = await fetch('https://ipwho.is/').then((r) => r.json());
    if (!ip || ip.success === false || ip.latitude == null) {
      throw new Error('no coords');
    }
    return { city: (ip.city || '').replace(/市$/, ''), latitude: ip.latitude, longitude: ip.longitude };
  }

  // 组合定位：pconline 取中文城市名 + ipwho.is 取经纬度，结果缓存 24 小时
  async function locateByIP() {
    try {
      const cached = JSON.parse(localStorage.getItem('cw-visitor-loc'));
      if (cached && cached.city && Date.now() - cached.ts < 86400000) {
        return cached;
      }
    } catch {}
    let city = null;
    try {
      city = await locateCityCN();
    } catch {}
    let coords = null;
    try {
      coords = await locateCoords();
    } catch {}
    if (!city && !coords) throw new Error('locate failed');
    const loc = {
      city: city || (coords ? coords.city : ''),
      latitude: coords ? coords.latitude : null,
      longitude: coords ? coords.longitude : null,
    };
    try {
      localStorage.setItem('cw-visitor-loc', JSON.stringify({ ...loc, ts: Date.now() }));
    } catch {}
    return loc;
  }

  // ---------- 风力显示 ----------
  // 蒲福风级（输入 km/h，Open-Meteo 用）
  function beaufort(kmh) {
    const t = [1, 5, 11, 19, 28, 38, 49, 61, 74, 88, 102, 117];
    for (let i = 0; i < t.length; i++) {
      if (kmh < t[i]) return i;
    }
    return 12;
  }
  const scaleLabel = (level) => (level <= 3 ? '微风' : `${level}级`);
  // Open-Meteo：km/h -> 风级
  const windLabel = (kmh) => scaleLabel(beaufort(kmh));
  // 和风天气：直接给风级
  const qwWindLabel = (scale) => scaleLabel(parseInt(scale, 10) || 0);

  // ---------- 数据源适配器 ----------
  // 两者都输出统一格式：
  // { current: {temp, icon, desc, precip, wind, humidity, pressure},
  //   daily: [{date, max, min, icon, desc, wind}] }

  // 和风天气图标代码 -> emoji
  const QW_ICON = {
    100: '☀️', 101: '⛅', 102: '🌤️', 103: '⛅', 104: '☁️',
    150: '☀️', 151: '🌤️', 152: '⛅', 153: '⛅',
    300: '🌦️', 301: '⛈️', 302: '⛈️', 303: '🌧️', 304: '🌧️', 305: '🌧️',
    306: '🌧️', 307: '🌧️', 308: '🌧️', 309: '🌦️', 310: '🌧️', 311: '⛈️',
    312: '🌧️', 313: '🌦️', 314: '🌧️', 315: '🌧️', 316: '🌧️', 317: '🌧️',
    318: '🌧️', 399: '🌧️',
    400: '🌨️', 401: '🌨️', 402: '❄️', 403: '❄️', 404: '🌨️', 405: '🌨️',
    406: '🌨️', 407: '🌨️', 408: '🌨️', 409: '🌨️', 410: '❄️', 456: '🌨️', 457: '❄️',
    500: '🌫️', 501: '🌫️', 502: '🌫️', 503: '🌫️', 504: '🌫️', 507: '🌫️',
    508: '🌫️', 509: '🌫️', 510: '🌫️', 511: '🌫️', 512: '🌫️', 513: '🌫️',
    514: '🌫️', 515: '🌫️',
    900: '🥵', 901: '🥶',
  };

  // 和风天气 API（数据源自中国气象局，国内准确）
  // 新版专属 Host 仅支持 X-QW-Api-Key 请求头认证（key= 查询参数会返回 403）
  async function fetchQWeather(loc) {
    const { key, host } = config.qweather;
    const base = `https://${host}`;
    const headers = { 'X-QW-Api-Key': key };
    // 城市查询：优先用访客坐标（更精确），否则用城市名
    const q =
      loc.latitude != null && loc.longitude != null
        ? `${loc.longitude},${loc.latitude}`
        : encodeURIComponent(loc.city);
    const lookup = await fetch(
      `${base}/geo/v2/city/lookup?location=${q}&number=1`,
      { headers }
    ).then((r) => r.json());
    if (lookup.code !== '200' || !lookup.location || !lookup.location.length) {
      throw new Error('qweather lookup failed: ' + (lookup.code || JSON.stringify(lookup.error || lookup)));
    }
    const qid = lookup.location[0].id;
    // 和风返回的是中文城市名，用于显示（IP 定位拿到英文名时以它为准）
    const qwName = lookup.location[0].name;
    const [now, daily] = await Promise.all([
      fetch(`${base}/v7/weather/now?location=${qid}`, { headers }).then((r) => r.json()),
      fetch(`${base}/v7/weather/3d?location=${qid}`, { headers }).then((r) => r.json()),
    ]);
    if (now.code !== '200' || daily.code !== '200') {
      throw new Error('qweather fetch failed: ' + now.code + '/' + daily.code);
    }
    const norm = {
      current: {
        temp: now.now.temp,
        icon: QW_ICON[now.now.icon] || '🌤️',
        desc: now.now.text,
        precip: now.now.precip || '0.0',
        wind: `${now.now.windDir} ${qwWindLabel(now.now.windScale)}`,
        humidity: now.now.humidity,
        pressure: Math.round(now.now.pressure),
      },
      daily: daily.daily.map((d) => ({
        date: d.fxDate.slice(5).replace('-', '/'),
        max: Math.round(d.tempMax),
        min: Math.round(d.tempMin),
        icon: QW_ICON[d.iconDay] || '🌤️',
        desc: d.textDay,
        wind: qwWindLabel(d.windScaleDay),
      })),
    };
    if (qwName && /[\u4e00-\u9fa5]/.test(qwName)) {
      norm.cityName = qwName;
    }
    return norm;
  }

  // Open-Meteo 兜底（全球模型插值，国内精度一般）
  const WMO = {
    0: ['晴', '☀️'], 1: ['多云', '🌤️'], 2: ['多云', '⛅'], 3: ['阴', '☁️'],
    45: ['雾', '🌫️'], 48: ['雾凇', '🌫️'],
    51: ['毛毛雨', '🌦️'], 53: ['毛毛雨', '🌦️'], 55: ['毛毛雨', '🌧️'],
    56: ['冻毛雨', '🌧️'], 57: ['冻毛雨', '🌧️'],
    61: ['小雨', '🌧️'], 63: ['中雨', '🌧️'], 65: ['大雨', '🌧️'],
    66: ['冻雨', '🌧️'], 67: ['冻雨', '🌧️'],
    71: ['小雪', '🌨️'], 73: ['中雪', '🌨️'], 75: ['大雪', '❄️'], 77: ['雪粒', '🌨️'],
    80: ['阵雨', '🌦️'], 81: ['阵雨', '🌧️'], 82: ['强阵雨', '⛈️'],
    85: ['阵雪', '🌨️'], 86: ['阵雪', '❄️'],
    95: ['雷暴', '⛈️'], 96: ['雷暴冰雹', '⛈️'], 99: ['雷暴冰雹', '⛈️'],
  };
  const wmoInfo = (code) => WMO[code] || ['未知', '🌡️'];
  // 风向（8 方位）
  const DIRS = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
  const windDir = (deg) => DIRS[Math.round(deg / 45) % 8];

  async function fetchOpenMeteo(loc) {
    let { latitude, longitude } = loc;
    if (latitude == null || longitude == null) {
      const geo = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(loc.city)}&count=1&language=zh&format=json`
      ).then((r) => r.json());
      const result = geo.results && geo.results[0];
      if (!result) throw new Error('city not found');
      latitude = result.latitude;
      longitude = result.longitude;
    }
    const data = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}` +
        `&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation,surface_pressure,wind_direction_10m` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max` +
        `&timezone=auto&forecast_days=3`
    ).then((r) => r.json());
    const cur = data.current;
    const [desc, icon] = wmoInfo(cur.weather_code);
    return {
      current: {
        temp: cur.temperature_2m.toFixed(1),
        icon,
        desc,
        precip: `${cur.precipitation}`,
        wind: `${windDir(cur.wind_direction_10m)} ${windLabel(cur.wind_speed_10m)}`,
        humidity: cur.relative_humidity_2m,
        pressure: Math.round(cur.surface_pressure),
      },
      daily: data.daily.time.map((time, idx) => {
        const [dDesc, dIcon] = wmoInfo(data.daily.weather_code[idx]);
        return {
          date: time.slice(5).replace('-', '/'),
          max: Math.round(data.daily.temperature_2m_max[idx]),
          min: Math.round(data.daily.temperature_2m_min[idx]),
          icon: dIcon,
          desc: dDesc,
          wind: windLabel(data.daily.wind_speed_10m_max[idx]),
        };
      }),
    };
  }

  // 统一入口：配置了和风 Key 则优先使用，失败自动回退 Open-Meteo
  function fetchWeather(loc) {
    const guard = '__cwFetchPromise_' + loc.city;
    if (!window[guard]) {
      window[guard] = (async () => {
        if (config.qweather && config.qweather.key && config.qweather.host) {
          try {
            return await fetchQWeather(loc);
          } catch (err) {
            console.warn('[calendar-weather] 和风天气请求失败，回退 Open-Meteo:', err);
          }
        }
        return await fetchOpenMeteo(loc);
      })().catch((err) => {
        window[guard] = null; // 失败后允许下次重试
        throw err;
      });
    }
    return window[guard];
  }

  function readCache(city) {
    try {
      const data = JSON.parse(localStorage.getItem('cw-weather-v3'));
      if (!data || data.city !== city) return null;
      if (Date.now() - data.ts > (config.update_interval || 30) * 60000) return null;
      return data.weather;
    } catch {
      return null;
    }
  }

  function paintWeather(city, norm) {
    // 和风天气返回的中文城市名优先（IP 定位拿英文名时以它为准）
    const displayName = norm.cityName || city;
    root.querySelector('.cw-city').textContent = `📍${displayName || '--'}`;
    root.querySelector('.cw-temp').innerHTML = `${norm.current.temp}<span>°C</span>`;
    root.querySelector('.cw-icon').textContent = norm.current.icon;
    root.querySelector('.cw-precip').textContent = `${norm.current.precip}mm`;
    root.querySelector('.cw-wind').textContent = norm.current.wind;
    root.querySelector('.cw-humidity').textContent = `${norm.current.humidity}%`;
    root.querySelector('.cw-pressure').textContent = `${norm.current.pressure}hPa`;

    const labels = ['今天', '明天', '后天'];
    const forecast = root.querySelector('.cw-forecast');
    forecast.innerHTML = '';
    norm.daily.slice(0, 3).forEach((d, idx) => {
      const col = document.createElement('div');
      col.className = 'cw-col';
      col.innerHTML =
        `<div class="cw-col-label">${labels[idx]}</div>` +
        `<div class="cw-col-date">${d.date}</div>` +
        `<div class="cw-col-icon">${d.icon}</div>` +
        `<div class="cw-col-temp">${d.max}/${d.min}°</div>` +
        `<div class="cw-col-desc">${d.desc}<span class="cw-col-wind">${d.wind}</span></div>`;
      forecast.appendChild(col);
    });
  }

  async function renderWeather() {
    // 确定位置：自动定位 -> 失败兜底默认城市
    let loc = {
      city: config.city,
      latitude: config.latitude,
      longitude: config.longitude,
    };
    if (config.auto_locate) {
      try {
        loc = await locateByIP();
      } catch {}
    }
    const cached = readCache(loc.city);
    if (cached) {
      paintWeather(loc.city, cached);
      return;
    }
    try {
      const weather = await fetchWeather(loc);
      try {
        localStorage.setItem(
          'cw-weather-v3',
          JSON.stringify({ city: loc.city, ts: Date.now(), weather })
        );
      } catch {}
      paintWeather(loc.city, weather);
    } catch {
      // 定位城市取天气失败时，用默认城市兜底
      if (loc.city !== config.city) {
        try {
          const fallbackLoc = {
            city: config.city,
            latitude: config.latitude,
            longitude: config.longitude,
          };
          const weather = await fetchWeather(fallbackLoc);
          paintWeather(config.city, weather);
          return;
        } catch {}
      }
      root.querySelector('.cw-precip').textContent = '获取失败';
    }
  }

  renderDate();
  renderWeather();
})();
