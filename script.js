//reschmann, 1.7.2025-
//io Demo Page  

document.addEventListener('DOMContentLoaded', function() {
    const urlElement = document.querySelector('.animated-url');
    const comingSoonElement = document.querySelector('.coming-soon');
    
    // Weather API functionality using Open-Meteo 
    const ZURICH_LAT = 47.3769;
    const ZURICH_LON = 8.5417;
    
    // FOEN hydrological monitoring data
    const FOEN_BASE_URL = 'https://environment.ld.admin.ch/.well-known/void/dataset/hydro';
    const LIMMAT_STATION_ID = '2099'; // Limmat - Zürich, Unterhard
    const DISCHARGE_UPDATE_INTERVAL = 30 * 60 * 1000; // 30 minutes
    
    async function getZurichWeather() {
        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${ZURICH_LAT}&longitude=${ZURICH_LON}&current=temperature_2m,weather_code&timezone=auto`);
            const data = await response.json();
            
            if (data.current) {
                const tempValue = document.getElementById('temp-value');
                const weatherDesc = document.getElementById('weather-desc');
                
                // Update temperature
                tempValue.textContent = Math.round(data.current.temperature_2m);
                
                // Convert weather code to description
                const weatherDescription = getWeatherDescription(data.current.weather_code);
                weatherDesc.textContent = weatherDescription;
                
                // Add temperature-based color animation
                const temp = data.current.temperature_2m;
                const weatherContainer = document.querySelector('.weather-container');
                
                if (temp < 0) {
                    weatherContainer.style.background = 'rgba(135, 206, 250, 0.2)'; // Cold - light blue
                } else if (temp > 20) {
                    weatherContainer.style.background = 'rgba(255, 165, 0, 0.2)'; // Warm - orange
                } else {
                    weatherContainer.style.background = 'rgba(255, 255, 255, 0.1)'; // Normal - default
                }
            }
        } catch (error) {
            console.error('Error fetching weather data:', error);
            document.getElementById('weather-desc').textContent = 'Weather unavailable';
        }
    }
    
    function extractDischargeTimestamp(labelText) {
        if (!labelText) return null;
        const match = labelText.match(/(\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2})/);
        return match ? match[1] : null;
    }

    function getDischargeTrend(currentValue, currentTimestamp) {
        const STORAGE_KEY = 'limmat-discharge-last';
        const previousRaw = localStorage.getItem(STORAGE_KEY);
        let trendText = 'Trend: noch keine Vergleichsdaten';

        if (previousRaw) {
            try {
                const previous = JSON.parse(previousRaw);
                const previousValue = Number(previous.value);

                if (!Number.isNaN(previousValue) && previous.timestamp !== currentTimestamp) {
                    const delta = currentValue - previousValue;
                    const absDelta = Math.abs(delta);

                    if (absDelta < 0.1) {
                        trendText = 'Trend: konstant';
                    } else if (delta > 0) {
                        trendText = `Trend: steigend (+${delta.toFixed(1)} m3/s)`;
                    } else {
                        trendText = `Trend: sinkend (${delta.toFixed(1)} m3/s)`;
                    }
                } else if (previous.timestamp === currentTimestamp) {
                    trendText = 'Trend: unveraenderter Messzeitpunkt';
                }
            } catch (error) {
                console.warn('Could not parse previous discharge trend data:', error);
            }
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify({
            value: currentValue,
            timestamp: currentTimestamp || null
        }));

        return trendText;
    }

    async function getDischargeData() {
        try {
            const STATION_PAGE = 'https://www.hydrodaten.admin.ch/de/seen-und-fluesse/stationen-und-daten/2099';
            const READER_URL = 'https://r.jina.ai/https://www.hydrodaten.admin.ch/de/seen-und-fluesse/stationen-und-daten/2099';

            const resp = await fetch(READER_URL, { headers: { 'Accept': 'text/plain, text/html;q=0.9, */*;q=0.8' } });
            if (!resp.ok) throw new Error('Reader fetch not OK: ' + resp.status);
            const text = await resp.text();

            // Narrow to the Abfluss section if possible
            let section = text;
            const abflussIdx = text.indexOf('Abfluss m³/s');
            if (abflussIdx !== -1) {
                section = text.slice(abflussIdx, abflussIdx + 4000); // slice a window after the header
            }

            // Prefer exact table row parsing: take first numeric cell after label
            let discharge = undefined;
            let dischargeTimestamp = null;
            const lines = section.split('\n');
            const rowLine = lines.find(l => l.includes('Letzter Messwert') && l.includes('|'));
            if (rowLine) {
                const cells = rowLine.split('|').map(s => s.trim()).filter(s => s.length > 0);
                // Expected: [ 'Letzter Messwert ...', '82', '400.24', ... ]
                if (cells.length >= 2) {
                    dischargeTimestamp = extractDischargeTimestamp(cells[0]);
                    const candidate = cells[1].replace(',', '.');
                    if (!Number.isNaN(Number(candidate))) {
                        discharge = candidate;
                    }
                }
            }

            // Fallback: regex from markdown-like row
            if (!discharge) {
                const rowRegex = /Letzter\s+Messwert[^\n]*\|\s*(\d+(?:[\.,]\d+)?)\s*\|/i;
                const rowMatch = section.match(rowRegex);
                if (rowMatch) {
                    discharge = rowMatch[1].replace(',', '.');
                }
            }

            // Fallback: look for a standalone pattern near "Letzter Messwert" and numbers
            if (!discharge) {
                const fallbackRegex = /Letzter\s+Messwert[^\n]*\n[^\n]*?(\d+(?:[\.,]\d+)?)(?=\s*(m³\/s|m³\s*\/\s*s|\|))/i;
                const m2 = section.match(fallbackRegex);
                if (m2) discharge = m2[1].replace(',', '.');
            }

            const dischargeValue = document.getElementById('discharge-value');
            const dischargeStatus = document.getElementById('discharge-status');

            if (discharge !== undefined && discharge !== null && !Number.isNaN(Number(discharge))) {
                const dischargeNumber = Number(discharge);
                dischargeValue.textContent = dischargeNumber.toFixed(0);
                dischargeStatus.textContent = getDischargeTrend(dischargeNumber, dischargeTimestamp);
            } else {
                dischargeValue.textContent = '--';
                dischargeStatus.innerHTML = `No data parsed <a href="${STATION_PAGE}" target="_blank" rel="noopener">source</a>`;
            }
        } catch (error) {
            console.error('Error fetching discharge data:', error);
            document.getElementById('discharge-value').textContent = '--';
            document.getElementById('discharge-status').textContent = 'Data unavailable';
        }
    }
    
    // Convert WMO weather codes to descriptions
    function getWeatherDescription(code) {
        const weatherCodes = {
            0: 'clear sky',
            1: 'mainly clear',
            2: 'partly cloudy',
            3: 'overcast',
            45: 'foggy',
            48: 'depositing rime fog',
            51: 'light drizzle',
            53: 'moderate drizzle',
            55: 'dense drizzle',
            56: 'light freezing drizzle',
            57: 'dense freezing drizzle',
            61: 'slight rain',
            63: 'moderate rain',
            65: 'heavy rain',
            66: 'light freezing rain',
            67: 'heavy freezing rain',
            71: 'slight snow fall',
            73: 'moderate snow fall',
            75: 'heavy snow fall',
            77: 'snow grains',
            80: 'slight rain showers',
            81: 'moderate rain showers',
            82: 'violent rain showers',
            85: 'slight snow showers',
            86: 'heavy snow showers',
            95: 'thunderstorm',
            96: 'thunderstorm with slight hail',
            99: 'thunderstorm with heavy hail'
        };
        
        return weatherCodes[code] || 'unknown';
    }
    
    // Fetch weather data immediately and then every 30 minutes
    getZurichWeather();
    setInterval(getZurichWeather, 30 * 60 * 1000);
    
    // Fetch discharge data immediately and then every 30 minutes
    getDischargeData();
    setInterval(getDischargeData, DISCHARGE_UPDATE_INTERVAL);
    
    // Add mouse hover effect to the URL
    urlElement.addEventListener('mouseenter', function() {
        this.style.animationPlayState = 'paused';
        this.style.transform = 'scale(1.1)';
        this.style.transition = 'transform 0.3s ease';
    });
    
    urlElement.addEventListener('mouseleave', function() {
        this.style.animationPlayState = 'running';
        this.style.transform = 'scale(1)';
    });
    
    // Add typing effect to "coming soon" text
    function typeWriter(element, text, speed = 100) {
        let i = 0;
        element.textContent = '';
        
        function type() {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                setTimeout(type, speed);
            }
        }
        type();
    }
    
    // Start typing effect after a delay
    setTimeout(() => {
        typeWriter(comingSoonElement, 'more to come....', 150);
    }, 1000);
    
    // Add parallax effect on mouse move
    document.addEventListener('mousemove', function(e) {
        const mouseX = e.clientX / window.innerWidth;
        const mouseY = e.clientY / window.innerHeight;
        
        urlElement.style.transform = `translateY(${-10 + mouseY * 5}px) translateX(${mouseX * 5}px)`;
    });
    
    // Add click effect to the URL
    urlElement.addEventListener('click', function() {
        this.style.transform = 'scale(0.95)';
        setTimeout(() => {
            this.style.transform = 'scale(1)';
        }, 150);
    });
    
    // Add smooth color transition to background
    let hue = 0;
    setInterval(() => {
        hue = (hue + 0.1) % 360;
        document.body.style.background = `linear-gradient(135deg, hsl(${hue}, 70%, 60%) 0%, hsl(${hue + 60}, 70%, 50%) 100%)`;
    }, 50);
}); 