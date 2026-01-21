// Native fetch is available in Node 18+
const PERSONIO_CLIENT_ID = process.env.PERSONIO_CLIENT_ID;
const PERSONIO_CLIENT_SECRET = process.env.PERSONIO_CLIENT_SECRET;

async function getPersonioToken() {
    if (!PERSONIO_CLIENT_ID || !PERSONIO_CLIENT_SECRET) {
        throw new Error("Missing PERSONIO_CLIENT_ID or PERSONIO_CLIENT_SECRET in environment. Please ensure they are exported.");
    }

    try {
        const response = await fetch('https://api.personio.de/v1/auth', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ client_id: PERSONIO_CLIENT_ID, client_secret: PERSONIO_CLIENT_SECRET })
        });

        if (!response.ok) throw new Error(`Auth failed: ${response.status} ${response.statusText}`);
        const data = await response.json();
        return data.data.token;
    } catch (error) {
        console.error('Failed to authenticate:', error.message);
        throw error;
    }
}

async function listAttributes() {
    try {
        console.log("Attempting to fetch attributes with Client ID:", PERSONIO_CLIENT_ID ? "***" : "MISSING");

        const token = await getPersonioToken();
        const response = await fetch('https://api.personio.de/v1/company/employees/attributes', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error(`Fetch attributes failed: ${response.status} ${response.statusText}`);
        const data = await response.json();

        console.log("Successfully fetched attributes!");
        // Print all attributes to find 'status'
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.error(error.message);
    }
}

listAttributes();
