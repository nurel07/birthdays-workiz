const fs = require('fs');

try {
    const rawData = fs.readFileSync('full personio.json');
    const jsonData = JSON.parse(rawData);

    let employees = [];
    if (Array.isArray(jsonData)) {
        // Check if it's the wrapper handling or direct array
        if (jsonData[0]?.data && Array.isArray(jsonData[0].data)) {
            console.log("Detected structure: Wrapped in array with 'data' property");
            employees = jsonData[0].data;
        } else if (jsonData[0]?.attributes) {
            console.log("Detected structure: Direct array of employee objects");
            employees = jsonData;
        } else {
            console.log("Detected structure: Array but unknown content. First item keys:", Object.keys(jsonData[0] || {}));
        }
    } else if (jsonData.data && Array.isArray(jsonData.data)) {
        console.log("Detected structure: Object with 'data' property");
        employees = jsonData.data;
    } else {
        console.log("Unknown structure. Types:", typeof jsonData);
    }

    const allKeys = new Set();

    employees.forEach(emp => {
        if (emp.attributes) {
            Object.keys(emp.attributes).forEach(key => allKeys.add(key));
        }
    });

    console.log("Unique Attribute Keys:", Array.from(allKeys).sort());
} catch (error) {
    console.error("Error parsing JSON:", error);
}
