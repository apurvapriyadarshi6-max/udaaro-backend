const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const app = express();

/* ================= CONFIG ================= */

const PORT = process.env.PORT;
const SECRET = process.env.SECRET || "udaaro_secret_key";

if (!PORT) {
  console.error("❌ PORT is not defined!");
  process.exit(1);
}

app.use(cors());
app.use(express.json());

/* ================= ROOT & HEALTH ================= */

app.get("/", (req, res) => {
  res.status(200).send("Udaaro Backend Live");
});

app.get("/healthz", (req, res) => {
  res.status(200).json({ status: "OK" });
});

/* ================= DATA FOLDER ================= */

const dataPath = path.join(__dirname, "data");

if (!fs.existsSync(dataPath)) {
  fs.mkdirSync(dataPath, { recursive: true });
}

/* ================= FILE HELPERS ================= */

function readData(fileName) {
  const filePath = path.join(dataPath, fileName);

  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "[]");
  }

  return JSON.parse(fs.readFileSync(filePath, "utf-8") || "[]");
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

  const admin = JSON.parse(fs.readFileSync(adminFile, "utf-8"));

  if (email === admin.email && password === admin.password) {
    const token = jwt.sign({ email }, SECRET, { expiresIn: "1h" });
    return res.json({ token });
  }

  return res.status(401).json({ message: "Invalid credentials" });
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
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
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

function createEntity(fileName) {
  return (req, res) => {
    const items = readData(fileName);

    const newItem = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      ...req.body,
    };

    items.push(newItem);
    writeData(fileName, items);

    res.status(201).json(newItem);
  };
}

app.post("/api/founders", createEntity("founders.json"));
app.post("/api/investors", createEntity("investors.json"));
app.post("/api/mentors", createEntity("mentors.json"));

/* ================= DELETE ROUTES ================= */

function deleteEntity(fileName) {
  return (req, res) => {
    const items = readData(fileName);
    const updated = items.filter(item => item.id !== req.params.id);
    writeData(fileName, updated);
    res.json({ message: "Deleted successfully" });
  };
}

app.delete("/api/founders/:id", verifyToken, deleteEntity("founders.json"));
app.delete("/api/investors/:id", verifyToken, deleteEntity("investors.json"));
app.delete("/api/mentors/:id", verifyToken, deleteEntity("mentors.json"));

/* ================= START SERVER ================= */

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});