const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '.')));

// In-memory storage for birthdays, initialized from file if exists, or empty
let birthdays = [];
const DATA_FILE = 'birthdays.json';

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

// GET endpoint to retrieve birthdays
app.get('/api/birthdays', (req, res) => {
    res.json(birthdays);
});

// POST endpoint to update birthdays
app.post('/api/birthdays', (req, res) => {
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

// Personio API credentials for image proxy (set via environment variable)
const PERSONIO_TOKEN = process.env.PERSONIO_TOKEN;

// Image proxy endpoint to fetch Personio profile pictures
app.get('/api/image/:employeeId', async (req, res) => {
    const { employeeId } = req.params;
    const personioUrl = `https://api.personio.de/v1/company/employees/${employeeId}/profile-picture`;

    try {
        const response = await fetch(personioUrl, {
            headers: {
                'Authorization': `Bearer ${PERSONIO_TOKEN}`
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

app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
