const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

// Update data paths to use the 'data' directory
const DATA_FILE = path.join(__dirname, 'data', 'birthdays.json');
const ANNIVERSARIES_FILE = path.join(__dirname, 'data', 'anniversaries.json');

// API Key for protected endpoints (set via environment variable)
const API_KEY = process.env.API_KEY;

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (!API_KEY) {
        // If no API_KEY is set, skip authentication (dev mode)
        console.warn('Warning: API_KEY not set, authentication disabled');
        return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid Authorization header' });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    if (token !== API_KEY) {
        return res.status(403).json({ error: 'Forbidden: Invalid API key' });
    }

    next();
};

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory storage for birthdays, initialized from file if exists, or empty
let birthdays = [];

try {
    if (fs.existsSync(DATA_FILE)) {
        const data = fs.readFileSync(DATA_FILE, 'utf8');
        // Check if data is legacy format (array of objects with 'attributes') 
        // or new format (array of simple objects)
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
            // For simplicity, we just load what's there. 
            // If legacy data exists, the frontend might break unless we migrate it.
            // But the user's intent is to overwrite it with POST.
            birthdays = parsed;
        }
    }
} catch (err) {
    console.error("Error reading birthdays.json:", err);
}

// In-memory storage for anniversaries
let anniversaries = [];

try {
    if (fs.existsSync(ANNIVERSARIES_FILE)) {
        const data = fs.readFileSync(ANNIVERSARIES_FILE, 'utf8');
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) {
            anniversaries = parsed;
        }
    }
} catch (err) {
    console.error("Error reading anniversaries.json:", err);
}

// GET endpoint to retrieve birthdays (public)
app.get('/api/birthdays', (req, res) => {
    res.json(birthdays);
});

// POST endpoint to update birthdays (protected)
app.post('/api/birthdays', requireAuth, (req, res) => {
    const newBirthdays = req.body;

    if (!Array.isArray(newBirthdays)) {
        return res.status(400).json({ error: "Invalid data format. Expected an array." });
    }

    birthdays = newBirthdays;

    // Persist to file (optional, but good for restart)
    fs.writeFileSync(DATA_FILE, JSON.stringify(birthdays, null, 2));

    console.log("Updated birthdays:", birthdays.length);
    res.json({ message: "Birthdays updated successfully", count: birthdays.length });
});

// GET endpoint to retrieve anniversaries (public)
app.get('/api/anniversaries', (req, res) => {
    res.json(anniversaries);
});

// POST endpoint to update anniversaries (protected)
app.post('/api/anniversaries', requireAuth, (req, res) => {
    const newAnniversaries = req.body;

    if (!Array.isArray(newAnniversaries)) {
        return res.status(400).json({ error: "Invalid data format. Expected an array." });
    }

    anniversaries = newAnniversaries;

    // Persist to file
    fs.writeFileSync(ANNIVERSARIES_FILE, JSON.stringify(anniversaries, null, 2));

    console.log("Updated anniversaries:", anniversaries.length);
    res.json({ message: "Anniversaries updated successfully", count: anniversaries.length });
});


// Personio API credentials (set via environment variables)
const PERSONIO_CLIENT_ID = process.env.PERSONIO_CLIENT_ID;
const PERSONIO_CLIENT_SECRET = process.env.PERSONIO_CLIENT_SECRET;

// Token cache
let personioTokenCache = {
    token: null,
    expiresAt: 0
};

// Function to get a valid Personio token (auto-refreshes when expired)
async function getPersonioToken() {
    const now = Date.now();

    // Return cached token if still valid (with 5 minute buffer)
    if (personioTokenCache.token && personioTokenCache.expiresAt > now + 5 * 60 * 1000) {
        return personioTokenCache.token;
    }

    // Request a new token
    console.log('Refreshing Personio token...');

    try {
        const response = await fetch('https://api.personio.de/v1/auth', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                client_id: PERSONIO_CLIENT_ID,
                client_secret: PERSONIO_CLIENT_SECRET
            })
        });

        if (!response.ok) {
            throw new Error(`Auth failed: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success || !data.data?.token) {
            throw new Error('Invalid auth response');
        }

        // Cache the token
        personioTokenCache = {
            token: data.data.token,
            expiresAt: now + (data.data.expires_in * 1000) // Convert seconds to ms
        };

        console.log('Personio token refreshed successfully');
        return personioTokenCache.token;
    } catch (error) {
        console.error('Failed to refresh Personio token:', error);
        throw error;
    }
}

// Image proxy endpoint to fetch Personio profile pictures
app.get('/api/image/:employeeId', async (req, res) => {
    const { employeeId } = req.params;
    const personioUrl = `https://api.personio.de/v1/company/employees/${employeeId}/profile-picture`;

    try {
        const token = await getPersonioToken();

        const response = await fetch(personioUrl, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            console.error(`Personio image fetch failed: ${response.status}`);
            return res.status(response.status).json({ error: `Failed to fetch image: ${response.status}` });
        }

        // Get content type from Personio response
        const contentType = response.headers.get('content-type') || 'image/jpeg';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour

        // Stream the image data to the client
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
    } catch (error) {
        console.error('Error proxying image:', error);
        res.status(500).json({ error: 'Failed to proxy image' });
    }
});

// Screenshot endpoint - captures the birthday display as a PNG image (protected)
app.get('/api/screenshot', requireAuth, async (req, res) => {
    const baseUrl = `http://localhost:${PORT}`;

    try {
        console.log('Launching Puppeteer for screenshot...');
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await browser.newPage();

        // Set viewport to match the design dimensions
        await page.setViewport({ width: 1080, height: 1920 });

        // Navigate to the page
        await page.goto(`${baseUrl}/index.html`, { waitUntil: 'networkidle0', timeout: 30000 });

        // Wait a bit for images to load
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Take screenshot
        const screenshot = await page.screenshot({
            type: 'png',
            clip: { x: 0, y: 0, width: 1080, height: 1920 }
        });

        await browser.close();

        console.log('Screenshot captured successfully');

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', 'attachment; filename="birthdays.png"');
        res.send(screenshot);
    } catch (error) {
        console.error('Error generating screenshot:', error);
        res.status(500).json({ error: 'Failed to generate screenshot', details: error.message });
    }
});

// Screenshot endpoint for anniversaries - captures the anniversary display as a PNG image (protected)
app.get('/api/anniversaries/screenshot', requireAuth, async (req, res) => {
    const baseUrl = `http://localhost:${PORT}`;

    try {
        console.log('Launching Puppeteer for anniversaries screenshot...');
        const browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
        });

        const page = await browser.newPage();

        // Set viewport to match the design dimensions
        await page.setViewport({ width: 1080, height: 1920 });

        // Navigate to the anniversaries page
        await page.goto(`${baseUrl}/anniversaries.html`, { waitUntil: 'networkidle0', timeout: 30000 });

        // Wait a bit for images to load
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Take screenshot
        const screenshot = await page.screenshot({
            type: 'png',
            clip: { x: 0, y: 0, width: 1080, height: 1920 }
        });

        await browser.close();

        console.log('Anniversaries screenshot captured successfully');

        res.setHeader('Content-Type', 'image/png');
        res.setHeader('Content-Disposition', 'attachment; filename="anniversaries.png"');
        res.send(screenshot);
    } catch (error) {
        console.error('Error generating anniversaries screenshot:', error);
        res.status(500).json({ error: 'Failed to generate screenshot', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
