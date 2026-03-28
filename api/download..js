/**
  » Fitur    : Download Proxy (Anti CORS)
  » Type     : Vercel Serverless Function
  » Purpose  : Bypass CORS restrictions for downloads
**/

import axios from "axios";

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { url } = req.body;

    // Validate URL
    if (!url) {
      return res.status(400).json({ 
        error: "URL is required",
        message: "Please provide a URL to download"
      });
    }

    // Validate URL format
    if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('blob:')) {
      return res.status(400).json({ 
        error: "Invalid URL",
        message: "URL must start with http://, https://, or blob:"
      });
    }

    console.log("Downloading image from:", url);

    // Fetch the image
    const response = await axios.get(url, {
      responseType: "arraybuffer",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "image/*"
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      timeout: 30000 // 30 seconds timeout
    });

    // Get content type from response or default to PNG
    const contentType = response.headers["content-type"] || "image/png";

    // Set appropriate headers
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", "attachment; filename=upscaled_image.png");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Cache-Control", "no-cache");
    
    // Send the image
    res.send(Buffer.from(response.data));

    console.log("Download successful!");

  } catch (error) {
    console.error("[DOWNLOAD ERROR]", error);
    
    if (error.response) {
      return res.status(error.response.status).json({ 
        error: "Failed to download image",
        message: `Server responded with status: ${error.response.status}`
      });
    } else if (error.request) {
      return res.status(500).json({ 
        error: "Failed to download image",
        message: "No response from server"
      });
    } else {
      return res.status(500).json({ 
        error: "Failed to download image",
        message: error.message || "Internal server error"
      });
    }
  }
        }
