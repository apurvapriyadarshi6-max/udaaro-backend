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

app.use(cors());
app.use(express.json());

/* ================= HEALTH ROUTES ================= */

// Root route (Render needs this)
app.get("/", (req, res) => {
  res.send("🚀 Udaaro Backend Live");
});

// Health check route
app.get("/healthz", (req, res) => {
  res.status(200).send("OK");
});

/* ================= DATA FOLDER SAFETY ================= */

const dataPath = path.join(__dirname, "data");

// Ensure data folder exists
if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath);
}

/* ================= FILE HELPERS ================= */

function readData(fileName) {
  const filePath = path.join(dataPath, fileName);

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([], null, 2));
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw || "[]");
}

function writeData(fileName, data) {
  const filePath = path.join(dataPath, fileName);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

/* ================= AUTH ================= */

app.post("/api/admin/login", (req, res) => {
  const { email, password } = req.body;

  const adminFile = path.join(dataPath, "admin.json");

  if (!fs.existsSync(adminFile)) {
    return res.status(500).json({ message: "Admin not configured" });
  }

  const admin = JSON.parse(fs.readFileSync(adminFile));

  if (email === admin.email && password === admin.password) {
    const token = jwt.sign({ email }, SECRET, { expiresIn: "1h" });
    return res.json({ token });
  }

  res.status(401).json({ message: "Invalid credentials" });
});

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Access denied" });
  }

  const token = authHeader.split(" ")[1];

  try {
    jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
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

/* ================= PUBLIC ROUTES ================= */

app.post("/api/founders", (req, res) => {
  const founders = readData("founders.json");

  const newFounder = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    ...req.body,
  };

  founders.push(newFounder);
  writeData("founders.json", founders);

  res.status(201).json(newFounder);
});

app.post("/api/investors", (req, res) => {
  const investors = readData("investors.json");

  const newInvestor = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    ...req.body,
  };

  investors.push(newInvestor);
  writeData("investors.json", investors);

  res.status(201).json(newInvestor);
});

app.post("/api/mentors", (req, res) => {
  const mentors = readData("mentors.json");

  const newMentor = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    ...req.body,
  };

  mentors.push(newMentor);
  writeData("mentors.json", mentors);

  res.status(201).json(newMentor);
});

/* ================= DELETE ROUTES ================= */

app.delete("/api/founders/:id", verifyToken, (req, res) => {
  const founders = readData("founders.json");
  const updated = founders.filter(f => f.id !== req.params.id);
  writeData("founders.json", updated);
  res.json({ message: "Founder deleted successfully" });
});

app.delete("/api/investors/:id", verifyToken, (req, res) => {
  const investors = readData("investors.json");
  const updated = investors.filter(i => i.id !== req.params.id);
  writeData("investors.json", updated);
  res.json({ message: "Investor deleted successfully" });
});

app.delete("/api/mentors/:id", verifyToken, (req, res) => {
  const mentors = readData("mentors.json");
  const updated = mentors.filter(m => m.id !== req.params.id);
  writeData("mentors.json", updated);
  res.json({ message: "Mentor deleted successfully" });
});

/* ================= START SERVER ================= */

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});