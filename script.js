//reschmann, 1.7.2025
//io Demo Page  

document.addEventListener('DOMContentLoaded', function() {
    const urlElement = document.querySelector('.animated-url');
    const comingSoonElement = document.querySelector('.coming-soon');
    
    // Weather API functionality using Open-Meteo 
    const ZURICH_LAT = 47.3769;
    const ZURICH_LON = 8.5417;
    
    // Zurich bath data API with CORS proxy
    const BATH_DATA_URL = 'https://www.stadt-zuerich.ch/stzh/bathdatadownload';
    // fromURL: https://data.stadt-zuerich.ch/dataset/wassertemperaturen-freibaeder/resource/548d1ceb-1daf-4cf9-a14a-92c86326824d
    const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
    const TARGET_BATH_ID = 'flb6940'; // Flussbad Unterer Letten
    const SECOND_BATH_ID = 'seb6943'; // Second bath to display
    const UPDATE_INTERVAL = 60 * 60 * 1000; // 1 hour
    
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
    
    async function getBathData() {
        try {
            // Use CORS proxy to bypass cross-origin restriction
            const proxyUrl = CORS_PROXY + encodeURIComponent(BATH_DATA_URL);
            const response = await fetch(proxyUrl);
            const xmlText = await response.text();
            
            // Parse XML to find the target bath data
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
            
            // Process both baths
            const baths = xmlDoc.querySelectorAll('bath');
            
            // Process first bath (flb6940)
            let targetBath = null;
            for (let bath of baths) {
                const idElement = bath.querySelector('poiid');
                if (idElement && idElement.textContent === TARGET_BATH_ID) {
                    targetBath = bath;
                    break;
                }
            }
            
            if (targetBath) {
                updateBathDisplay(targetBath, 'water-temp-value', 'water-status', 'bath-last-update', '.water-temp-container');
            } else {
                document.getElementById('water-temp-value').textContent = '--';
                document.getElementById('water-status').textContent = 'Bath data unavailable';
            }
            
            // Process second bath (seb6943)
            let secondBath = null;
            for (let bath of baths) {
                const idElement = bath.querySelector('poiid');
                if (idElement && idElement.textContent === SECOND_BATH_ID) {
                    secondBath = bath;
                    break;
                }
            }
            
            if (secondBath) {
                updateBathDisplay(secondBath, 'water-temp-value-2', 'water-status-2', 'bath-last-update-2', '.water-temp-container_2');
            } else {
                document.getElementById('water-temp-value-2').textContent = '--';
                document.getElementById('water-status-2').textContent = 'Bath data unavailable';
            }
            
        } catch (error) {
            console.error('Error fetching bath data:', error);
            document.getElementById('water-temp-value').textContent = '--';
            document.getElementById('water-status').textContent = 'Data unavailable';
            document.getElementById('water-temp-value-2').textContent = '--';
            document.getElementById('water-status-2').textContent = 'Data unavailable';
        }
    }
    
    function updateBathDisplay(bath, tempElementId, statusElementId, lastUpdateId, containerSelector) {
        const waterTempElement = document.getElementById(tempElementId);
        const waterStatusElement = document.getElementById(statusElementId);
        
        // Extract and update bath name
        const bathName = bath.querySelector('name');
        if (bathName && bathName.textContent) {
            const locationElement = document.querySelector(containerSelector + ' .water-location');
            if (locationElement) {
                locationElement.textContent = bathName.textContent.trim();
            }
        }
        
        // Show last update time
        let lastUpdateElement = document.getElementById(lastUpdateId);
        if (!lastUpdateElement) {
            lastUpdateElement = document.createElement('div');
            lastUpdateElement.id = lastUpdateId;
            lastUpdateElement.className = 'bath-last-update';
            waterStatusElement.parentNode.appendChild(lastUpdateElement);
        }
        
        const dateModified = bath.querySelector('dateModified');
        if (dateModified && dateModified.textContent) {
            // Extrahiere Uhrzeit (hh:mm) aus dem String, z.B. 'Mi, 09.07.2025 11:14'
            const match = dateModified.textContent.trim().match(/(\d{2}:\d{2})/);
            const formatted = match ? match[1] : '--';
            lastUpdateElement.textContent = `last update ${formatted}`;
        } else {
            lastUpdateElement.textContent = '';
        }
        
        // Extract water temperature
        const waterTemp = bath.querySelector('temperatureWater');
        if (waterTemp && waterTemp.textContent) {
            const temp = parseFloat(waterTemp.textContent);
            waterTempElement.textContent = temp.toFixed(1);
            
            // Add water temperature-based styling
            const waterContainer = document.querySelector(containerSelector);
            if (temp < 17) {
                waterContainer.style.background = 'rgba(0, 100, 200, 0.2)'; // Cold water - blue
            } else if (temp >= 18 && temp <= 20) {
                waterContainer.style.background = 'rgba(255, 255, 0, 0.2)'; // Yellow
            } else if (temp > 20 && temp <= 24) {
                waterContainer.style.background = 'rgba(255, 165, 0, 0.2)'; // Dark yellow
            } else if (temp > 24) {
                waterContainer.style.background = 'rgba(255, 0, 0, 0.2)'; // Red
            } else {
                waterContainer.style.background = 'rgba(0, 150, 255, 0.15)'; // Default
            }
            waterStatusElement.textContent = '';
        } else {
            waterTempElement.textContent = '--';
            waterStatusElement.textContent = 'Temperature unavailable';
        }
        
        // Extract opening status
        const isOpen = bath.querySelector('openClosedTextPlain');
        let status = '';
        if (isOpen) {
            status = isOpen.textContent.trim();
            if (status === 'offen') {
                status = 'open';
            } else if (status === 'geschlossen') {
                status = 'closed';
            }
            waterStatusElement.textContent = `${status}`;
        } else {
            waterStatusElement.textContent = '';
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
    
    // Fetch bath data immediately and then every hour
    getBathData();
    setInterval(getBathData, UPDATE_INTERVAL);
    
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