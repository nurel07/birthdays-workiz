# Office TV Automation 📺

**This project automates the celebration of employee milestones on our Office TV.**

Instead of manually creating slides every week, this system runs on autopilot to ensure we never miss a birthday or work anniversary.

## � Quick Links
*   **📡 Production Server (Railway):** [Project Dashboard](https://railway.com/project/190ab426-ac0d-4e48-aaaa-8c47f06bb71c?environmentId=a23170de-24ff-4d4f-a707-34ff7f7bfc47)
*   **🤖 n8n Workflows:**
    *   [Image Generation Flow](https://n8n-potatoe.workiz.run/workflow/5Cn5Eha1ZXwXJovrrxlCQ) (Data Fetcher)
    *   [Webflow Sync Flow](https://n8n-potatoe.workiz.run/workflow/83mFH7JDCDXHOq_EccBK_) (Cloudinary -> Webflow)
*   **🖼️ Live Slideshow:** [fsm.workiz.com/company-slider](https://fsm.workiz.com/company-slider)

## 🚀 What It Does
1.  **Finds Celebrants**: Automatically scans **Personio** every Sunday.
2.  **Designs Slides**: Generates beautiful, branded images dynamically.
3.  **Updates TV**: Instantly syncs these images to our **Webflow** CMS (which powers the screens).
4.  **Notifies Team**: Sends a summary to **Slack**.

## 🛠️ How It Works

### 1. The "Brain" (n8n Workflows)
We use **n8n** to orchestrate the entire process.
*   **`office-tv-images-generation`**: Connected to Personio. It finds the data and asks the server to "draw" the slides.
*   **`office-tv-cloudinary-webflow-sync`**: Ensures the slides currently on the screen exactly match what we generated.

### 2. The "Artist" (Node.js Server) & Image Endpoints
The server (`server.js`) hosted on Railway creates the visuals.

**Key Endpoints:**
*   `POST /api/birthdays` - Receives JSON data for birthday people.
*   `POST /api/anniversaries` - Receives JSON data for work anniversaries.
*   `GET /api/birthdays/screenshot` - Returns a PNG screenshot of the birthday list.
*   `GET /api/anniversaries/screenshot` - Returns a PNG screenshot of the anniversary list.

### 🛡️ The Image Proxy (`/api/image/:id`)
**Why do we need this?**
Personio profile pictures are protected behind authentication. We cannot simply pass a Personio URL to our screenshot tool or Webflow because they "can't log in" to see it.

We built a proxy endpoint that:
1.  Accepts a Personio Employee ID (e.g., `/api/image/12345`).
2.  Uses our secure server credentials to fetch the image from Personio.
3.  Serves the image publicly (but securely) to our generation tool.

This ensures every slide has the correct photo without exposing our admin credentials.

---

## 👩‍💻 Developer Setup

### 1. n8n Configuration
To connect n8n to Personio, create a **Custom Auth** credential:
```json
{
  "body": {
    "client_id": "YOUR_PERSONIO_CLIENT_ID",
    "client_secret": "YOUR_PERSONIO_CLIENT_SECRET"
  }
}
```
