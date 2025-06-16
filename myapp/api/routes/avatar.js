const express = require("express");
const sharp = require("sharp");
const NodeCache = require("node-cache");
const router = express.Router();
const User = require("../models/user");

// Cache images for 1 hour
const imageCache = new NodeCache({ stdTTL: 3600 });

// Helper functions
const getRandomHexColor = () =>
  `#${Math.floor(Math.random() * 16777215)
    .toString(16)
    .padStart(6, "0")}`;

const generateAvatarSVG = (initials, size, textColor, bgColor) => `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="${bgColor}"/>
  <text 
    x="50%" 
    y="50%" 
    font-size="${size * 0.4}" 
    font-family="sans-serif" 
    font-weight="bold"
    fill="${textColor}" 
    text-anchor="middle" 
    dominant-baseline="middle"
  >${initials}</text>
</svg>
`;

// Unified avatar generation function
async function generateAvatar(initials, options) {
  const { size, background, color, rounded, format } = options;

  // Generate SVG
  const svg = Buffer.from(generateAvatarSVG(initials, size, color, background));

  // Create image pipeline
  let image = sharp(svg);

  // Apply rounded corners
  if (rounded) {
    image = image.composite([
      {
        input: Buffer.from(
          `<svg width="${size}" height="${size}">
          <circle cx="${size / 2}" cy="${size / 2}" r="${
            size / 2
          }" fill="black"/>
        </svg>`
        ),
        blend: "dest-in",
      },
    ]);
  }

  // Set output format
  switch (format.toLowerCase()) {
    case "jpg":
    case "jpeg":
      image = image.jpeg();
      break;
    case "webp":
      image = image.webp();
      break;
    default:
      image = image.png();
  }

  return image.toBuffer();
}

// Main avatar endpoint
router.get("/", async (req, res) => {
  try {
    // Get parameters
    const {
      name,
      surname,
      userId,
      size = 200,
      background,
      color = "#ffffff",
      rounded,
      format = "png",
    } = req.query;

    // Validate inputs
    if (!name && !surname && !userId) {
      return res
        .status(400)
        .json({ error: "Please provide name/surname or userId" });
    }

    // Generate initials
    let initials = "U"; // Default

    if (userId) {
      // Fetch user from database
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Create initials from user data
      initials =
        (
          (user.firstName?.charAt(0) || "") +
          (user.lastName?.charAt(0) || user.firstName?.charAt(1) || "")
        )
          .toUpperCase()
          .substring(0, 2) || "U";
    } else {
      // Create initials from query params
      initials =
        (name?.charAt(0) || "") +
          (surname?.charAt(0) || name?.charAt(1) || "")
            .toUpperCase()
            .substring(0, 2) || "U";
    }

    // Prepare options
    const options = {
      size: parseInt(size),
      background: background ? `#${background}` : getRandomHexColor(),
      color: color ? `#${color}` : "#ffffff",
      rounded: rounded === "true",
      format,
    };

    // Create cache key
    const cacheKey = `${initials}-${options.size}-${options.background}-${options.color}-${options.rounded}-${options.format}`;

    // Check cache
    const cachedImage = imageCache.get(cacheKey);
    if (cachedImage) {
      res.setHeader(
        "Content-Type",
        `image/${format === "jpg" ? "jpeg" : format}`
      );
      res.setHeader("X-Cache", "HIT");
      return res.send(cachedImage);
    }

    // Generate new avatar
    const imageBuffer = await generateAvatar(initials, options);

    // Cache the image
    imageCache.set(cacheKey, imageBuffer);

    // Set headers and send
    res.setHeader(
      "Content-Type",
      `image/${format === "jpg" ? "jpeg" : format}`
    );
    res.setHeader("Cache-Control", "public, max-age=604800");
    res.setHeader("X-Cache", "MISS");
    res.send(imageBuffer);
  } catch (error) {
    console.error("Avatar generation error:", error);
    res.status(500).json({
      error: "Failed to generate avatar",
      message: error.message,
    });
  }
});

module.exports = router;
