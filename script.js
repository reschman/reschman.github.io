//reschmann, 1.7.2025
//io Demo Page  

document.addEventListener('DOMContentLoaded', function() {
    const urlElement = document.querySelector('.animated-url');
    const comingSoonElement = document.querySelector('.coming-soon');
    
    // Weather API functionality using Open-Meteo (free, no API key required)
    const ZURICH_LAT = 47.3769;
    const ZURICH_LON = 8.5417;
    
    // Zurich bath data API with CORS proxy
    const BATH_DATA_URL = 'https://www.stadt-zuerich.ch/stzh/bathdatadownload';
    // fromURL: https://data.stadt-zuerich.ch/dataset/wassertemperaturen-freibaeder/resource/548d1ceb-1daf-4cf9-a14a-92c86326824d
    const CORS_PROXY = 'https://api.allorigins.win/raw?url=';
    const TARGET_BATH_ID = 'flb6940'; // Flussbad Unterer Letten
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
            
            // Find the bath with poiid flb6940
            const baths = xmlDoc.querySelectorAll('bath');
            let targetBath = null;
            
            for (let bath of baths) {
                const idElement = bath.querySelector('poiid');
                if (idElement && idElement.textContent === TARGET_BATH_ID) {
                    targetBath = bath;
                    break;
                }
            }
            
            if (targetBath) {
                const waterTempElement = document.getElementById('water-temp-value');
                const waterStatusElement = document.getElementById('water-status');
                
                // Extract water temperature
                const waterTemp = targetBath.querySelector('temperatureWater');
                if (waterTemp && waterTemp.textContent) {
                    const temp = parseFloat(waterTemp.textContent);
                    //const temp = 2;
                    waterTempElement.textContent = temp.toFixed(1);
                    
                    // Add water temperature-based styling
                    const waterContainer = document.querySelector('.water-temp-container');
                    if (temp < 17) {
                        waterContainer.style.background = 'rgba(0, 100, 200, 0.2)'; // Cold water - blue
                        waterStatusElement.textContent = 'Cold water';
                    } else if (temp >= 18 && temp <= 20) {
                        waterContainer.style.background = 'rgba(255, 255, 0, 0.2)'; // Yellow
                        waterStatusElement.textContent = 'Moderate water';
                    } else if (temp > 20 && temp <= 25) {
                        waterContainer.style.background = 'rgba(255, 165, 0, 0.2)'; // Dark yellow
                        waterStatusElement.textContent = 'Warm water';
                    } else if (temp > 25) {
                        waterContainer.style.background = 'rgba(255, 0, 0, 0.2)'; // Red
                        waterStatusElement.textContent = 'Hot water';
                    } else {
                        waterContainer.style.background = 'rgba(0, 150, 255, 0.15)'; // Default
                        waterStatusElement.textContent = 'Temperature unavailable';
                    }
                } else {
                    waterTempElement.textContent = '--';
                    waterStatusElement.textContent = 'Temperature unavailable';
                }
                
                // Extract opening status
                const isOpen = targetBath.querySelector('openClosedTextPlain');
                if (isOpen) {
                    let status = isOpen.textContent.trim();
                    if (status === 'offen') {
                        status = 'open';
                    } else if (status === 'geschlossen') {
                        status = 'closed';
                    }
                    waterStatusElement.textContent += ` • ${status}`;
                }
                
            } else {
                document.getElementById('water-temp-value').textContent = '--';
                document.getElementById('water-status').textContent = 'Bath data unavailable';
            }
            
        } catch (error) {
            console.error('Error fetching bath data:', error);
            document.getElementById('water-temp-value').textContent = '--';
            document.getElementById('water-status').textContent = 'Data unavailable';
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
        typeWriter(comingSoonElement, 'coming soon....', 150);
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