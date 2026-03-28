/**
  » Fitur    : HD Image (2X/4X Upscaler)
  » Type     : Vercel Serverless Function
  » Channel  : https://whatsapp.com/channel/0029Vay0apKJZg49rZz1OF33
  » Creator  : MifNity (Rebuild by Ditzz)
  » Api      : iloveimg.com
**/

import axios from "axios";
import * as cheerio from "cheerio";
import FormData from "form-data";
import multiparty from "multiparty";
import fs from "fs";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Parse multipart form data
    const form = new multiparty.Form();
    
    const { fields, files } = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err);
        else resolve({ fields, files });
      });
    });

    // Get scale parameter (default 4x)
    const scale = parseInt(fields.scale?.[0] || "4");
    
    // Validate scale
    if (![2, 4].includes(scale)) {
      return res.status(400).json({ 
        error: "Invalid scale", 
        message: "Scale must be 2 or 4" 
      });
    }

    // Get image file
    const imageFile = files.image?.[0];
    if (!imageFile) {
      return res.status(400).json({ 
        error: "No image provided",
        message: "Please upload an image file"
      });
    }

    // Read file buffer
    const buffer = fs.readFileSync(imageFile.path);

    // Process image with iloveimg API
    console.log(`Processing image with ${scale}x upscale...`);
    const result = await hdr(buffer, scale);

    // Clean up temp file
    fs.unlinkSync(imageFile.path);

    // Send result
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", `attachment; filename="upscaled_${scale}x.png"`);
    res.setHeader("Cache-Control", "no-cache");
    res.send(result);

  } catch (error) {
    console.error("[UPSCALE ERROR]", error);
    
    // Clean up any temp files
    try {
      if (req.files?.image?.[0]?.path) {
        fs.unlinkSync(req.files.image[0].path);
      }
    } catch {}
    
    res.status(500).json({ 
      error: "Failed to upscale image",
      message: error.message || "Internal server error"
    });
  }
}

// =========================================
// HELPER FUNCTIONS (ILOVEIMG API)
// =========================================

async function getToken() {
  try {
    const html = await axios.get("https://www.iloveimg.com/upscale-image");
    const $ = cheerio.load(html.data);

    const script = $("script")
      .filter((i, el) => $(el).html().includes("ilovepdfConfig ="))
      .html();

    if (!script) {
      throw new Error("Failed to get config script");
    }

    const jsonS = script.split("ilovepdfConfig = ")[1].split(";")[0];
    const json = JSON.parse(jsonS);

    const csrf = $("meta[name='csrf-token']").attr("content");
    
    if (!json.token || !csrf) {
      throw new Error("Failed to get token or csrf");
    }
    
    return { token: json.token, csrf };
    
  } catch (error) {
    console.error("getToken error:", error);
    throw new Error("Failed to get authentication token");
  }
}

async function uploadImage(server, headers, buffer, task) {
  try {
    const form = new FormData();
    form.append("name", "image.jpg");
    form.append("chunk", "0");
    form.append("chunks", "1");
    form.append("task", task);
    form.append("preview", "1");
    form.append("file", buffer, "image.jpg");

    const res = await axios.post(
      `https://${server}.iloveimg.com/v1/upload`,
      form,
      { 
        headers: { ...headers, ...form.getHeaders() },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      }
    );

    if (!res.data || !res.data.server_filename) {
      throw new Error("Failed to upload image");
    }

    return res.data;
    
  } catch (error) {
    console.error("uploadImage error:", error);
    throw new Error("Failed to upload image to processing server");
  }
}

async function hdr(buffer, scale = 4) {
  try {
    // Get authentication token
    const { token, csrf } = await getToken();

    // Available servers
    const servers = [
      "api1g","api2g","api3g","api8g","api9g","api10g","api11g",
      "api12g","api13g","api14g","api15g","api16g","api17g",
      "api18g","api19g","api20g","api21g","api22g","api24g","api25g"
    ];

    // Select random server
    const server = servers[Math.floor(Math.random() * servers.length)];

    // Task ID (static from original code)
    const task =
      "r68zl88mq72xq94j2d5p66bn2z9lrbx20njsbw2qsAvgmzr11lvfhAx9kl87pp6yqgx7c8vg7sfbqnrr42qb16v0gj8jl5s0kq1kgp26mdyjjspd8c5A2wk8b4Adbm6vf5tpwbqlqdr8A9tfn7vbqvy28ylphlxdl379psxpd8r70nzs3sk1";

    // Request headers
    const headers = {
      Authorization: "Bearer " + token,
      Origin: "https://www.iloveimg.com/",
      Cookie: "_csrf=" + csrf,
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    };

    // Upload image
    console.log(`Uploading to server: ${server}`);
    const upload = await uploadImage(server, headers, buffer, task);

    // Process upscale
    console.log(`Processing upscale with scale: ${scale}`);
    const form = new FormData();
    form.append("task", task);
    form.append("server_filename", upload.server_filename);
    form.append("scale", scale);

    const res = await axios.post(
      `https://${server}.iloveimg.com/v1/upscale`,
      form,
      {
        headers: { ...headers, ...form.getHeaders() },
        responseType: "arraybuffer",
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
        timeout: 60000 // 60 seconds timeout
      }
    );

    if (!res.data) {
      throw new Error("No data received from upscale server");
    }

    console.log("Upscale successful!");
    return res.data;
    
  } catch (error) {
    console.error("hdr error:", error);
    
    if (error.response) {
      throw new Error(`Server error: ${error.response.status}`);
    } else if (error.request) {
      throw new Error("No response from server");
    } else {
      throw new Error(error.message || "Failed to process image");
    }
  }
}
