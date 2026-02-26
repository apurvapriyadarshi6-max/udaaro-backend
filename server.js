const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const app = express();

/* ================= CONFIG ================= */

const PORT = process.env.PORT || 5000;
const SECRET = process.env.SECRET || "udaaro_secret_key";

/* ================= CORS CONFIG ================= */

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://udaaro-frontend.vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);
app.use(express.json());

/* ================= DATA DIRECTORY ================= */

const dataPath = path.join(__dirname, "data");

if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath, { recursive: true });
}

/* ================= FILE HELPERS ================= */

function readData(fileName) {
  try {
    const filePath = path.join(dataPath, fileName);

    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify([], null, 2));
    }

    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch (error) {
    console.error("Read error:", error);
    return [];
  }
}

function writeData(fileName, data) {
  try {
    const filePath = path.join(dataPath, fileName);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Write error:", error);
  }
}

/* ================= ROOT ================= */

app.get("/", (req, res) => {
  res.send("Udaaro Backend Live 🚀");
});

app.get("/healthz", (req, res) => {
  res.json({ status: "OK" });
});

/* ================= AUTH ================= */

app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body;

  if (
    email === process.env.ADMIN_EMAIL &&
    password === process.env.ADMIN_PASSWORD
  ) {
    const token = jwt.sign({ email }, SECRET, { expiresIn: "1h" });
    return res.json({ token });
  }

  return res.status(401).json({ message: "Invalid credentials" });
});

/* ================= TOKEN VERIFY ================= */

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Access denied" });
  }

  const token = authHeader.split(" ")[1];

  try {
    jwt.verify(token, SECRET);
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

/* ================= PROTECTED ROUTES ================= */

app.get("/api/founders", verifyToken, (req, res) => {
  res.json(readData("founders.json"));
});

app.get("/api/investors", verifyToken, (req, res) => {
  res.json(readData("investors.json"));
});

app.get("/api/mentors", verifyToken, (req, res) => {
  res.json(readData("mentors.json"));
});

/* ================= PUBLIC POST ROUTES ================= */

app.post("/api/founders", (req, res) => {
  const founders = readData("founders.json");
  const { name, email, ...rest } = req.body;

  if (!name || !email) {
    return res.status(400).json({ message: "Name and Email required" });
  }

  const newFounder = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    name: name.trim(),
    email: email.trim(),
    ...rest,
  };

  founders.push(newFounder);
  writeData("founders.json", founders);

  res.status(201).json(newFounder);
});

app.post("/api/investors", (req, res) => {
  const investors = readData("investors.json");
  const { name, email, ...rest } = req.body;

  if (!name || !email) {
    return res.status(400).json({ message: "Name and Email required" });
  }

  const newInvestor = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    name: name.trim(),
    email: email.trim(),
    ...rest,
  };

  investors.push(newInvestor);
  writeData("investors.json", investors);

  res.status(201).json(newInvestor);
});

app.post("/api/mentors", (req, res) => {
  const mentors = readData("mentors.json");
  const { name, email, ...rest } = req.body;

  if (!name || !email) {
    return res.status(400).json({ message: "Name and Email required" });
  }

  const newMentor = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    name: name.trim(),
    email: email.trim(),
    ...rest,
  };

  mentors.push(newMentor);
  writeData("mentors.json", mentors);

  res.status(201).json(newMentor);
});

/* ================= DELETE ROUTES ================= */

app.delete("/api/:type/:id", verifyToken, (req, res) => {
  const { type, id } = req.params;

  const fileMap = {
    founders: "founders.json",
    investors: "investors.json",
    mentors: "mentors.json",
  };

  if (!fileMap[type]) {
    return res.status(400).json({ message: "Invalid type" });
  }

  const data = readData(fileMap[type]);
  const updated = data.filter(item => item.id !== id);

  writeData(fileMap[type], updated);

  res.json({ message: "Deleted successfully" });
});

/* ================= START SERVER ================= */

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});