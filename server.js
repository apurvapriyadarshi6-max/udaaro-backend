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

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://udaaro.vercel.app"
    : "http://localhost:3000");

/* ================= MIDDLEWARE ================= */

app.use(
  cors({
    origin: FRONTEND_URL,
    methods: ["GET", "POST", "DELETE"],
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

    const raw = fs.readFileSync(filePath, "utf-8");
    return raw ? JSON.parse(raw) : [];
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

/* ================= ROOT ROUTES ================= */

app.get("/", (req, res) => {
  res.status(200).send("Udaaro Backend Live 🚀");
});

app.get("/healthz", (req, res) => {
  res.status(200).json({ status: "OK" });
});

/* ================= AUTH ================= */

app.post("/api/admin/login", (req, res) => {
  try {
    const { email, password } = req.body;

    const adminFile = path.join(dataPath, "admin.json");

    if (!fs.existsSync(adminFile)) {
      return res.status(500).json({ message: "Admin not configured" });
    }

    const admin = JSON.parse(fs.readFileSync(adminFile, "utf-8"));

    if (
      email?.trim() === admin.email &&
      password?.trim() === admin.password
    ) {
      const token = jwt.sign({ email }, SECRET, {
        expiresIn: "1h",
      });

      return res.json({ token });
    }

    return res.status(401).json({ message: "Invalid credentials" });
  } catch (error) {
    return res.status(500).json({ message: "Login failed" });
  }
});

/* ================= TOKEN VERIFY ================= */

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
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

/* ================= PROTECTED GET ROUTES ================= */

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

/* ===== Founder ===== */
app.post("/api/founders", (req, res) => {
  const founders = readData("founders.json");
  const {
    name,
    email,
    phone,
    startup,
    industry,
    stage,
    fundingNeeded,
    description,
  } = req.body;

  if (!name || !email) {
    return res.status(400).json({ message: "Name and Email required" });
  }

  const newFounder = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    name: name.trim(),
    email: email.trim(),
    phone,
    startup,
    industry,
    stage,
    fundingNeeded,
    description,
  };

  founders.push(newFounder);
  writeData("founders.json", founders);

  res.status(201).json(newFounder);
});

/* ===== Investor ===== */
app.post("/api/investors", (req, res) => {
  const investors = readData("investors.json");
  const {
    name,
    email,
    firm,
    investmentFocus,
    preferredStage,
    ticketSize,
  } = req.body;

  if (!name || !email) {
    return res.status(400).json({ message: "Name and Email required" });
  }

  const newInvestor = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    name: name.trim(),
    email: email.trim(),
    firm,
    investmentFocus,
    preferredStage,
    ticketSize,
  };

  investors.push(newInvestor);
  writeData("investors.json", investors);

  res.status(201).json(newInvestor);
});

/* ===== Mentor ===== */
app.post("/api/mentors", (req, res) => {
  const mentors = readData("mentors.json");
  const {
    name,
    email,
    expertise,
    experienceLevel,
    preferredStage,
    availability,
  } = req.body;

  if (!name || !email) {
    return res.status(400).json({ message: "Name and Email required" });
  }

  const newMentor = {
    id: uuidv4(),
    createdAt: new Date().toISOString(),
    name: name.trim(),
    email: email.trim(),
    expertise,
    experienceLevel,
    preferredStage,
    availability,
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

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});