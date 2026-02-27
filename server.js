const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const app = express();

/* ================= CONFIG ================= */

const PORT = process.env.PORT || 5000;
const SECRET = process.env.SECRET;
const MONGO_URI = process.env.MONGO_URI;

/* ================= CORS ================= */

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://udaaro.vercel.app"
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

/* ================= CONNECT MONGODB ================= */

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

/* ================= SCHEMAS ================= */

const founderSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    phone: String,
    startup: String,
    industry: String,
    stage: String,
    fundingNeeded: String,
    description: String,
  },
  { timestamps: true }
);

const investorSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    firm: String,
    investmentFocus: String,
    preferredStage: String,
    ticketSize: String,
  },
  { timestamps: true }
);

const mentorSchema = new mongoose.Schema(
  {
    name: String,
    email: String,
    expertise: String,
    experienceLevel: String,
    preferredStage: String,
    availability: String,
  },
  { timestamps: true }
);

const Founder = mongoose.model("Founder", founderSchema);
const Investor = mongoose.model("Investor", investorSchema);
const Mentor = mongoose.model("Mentor", mentorSchema);

/* ================= ROOT ================= */

app.get("/", (req, res) => {
  res.send("Udaaro Backend Live 🚀");
});

/* ================= ADMIN LOGIN ================= */

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
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

/* ================= GET ROUTES ================= */

app.get("/api/founders", verifyToken, async (req, res) => {
  const data = await Founder.find().sort({ createdAt: -1 });
  res.json(data);
});

app.get("/api/investors", verifyToken, async (req, res) => {
  const data = await Investor.find().sort({ createdAt: -1 });
  res.json(data);
});

app.get("/api/mentors", verifyToken, async (req, res) => {
  const data = await Mentor.find().sort({ createdAt: -1 });
  res.json(data);
});

/* ================= POST ROUTES ================= */

app.post("/api/founders", async (req, res) => {
  const founder = await Founder.create(req.body);
  res.status(201).json(founder);
});

app.post("/api/investors", async (req, res) => {
  const investor = await Investor.create(req.body);
  res.status(201).json(investor);
});

app.post("/api/mentors", async (req, res) => {
  const mentor = await Mentor.create(req.body);
  res.status(201).json(mentor);
});

/* ================= DELETE ROUTES ================= */

app.delete("/api/:type/:id", verifyToken, async (req, res) => {
  const { type, id } = req.params;

  const modelMap = {
    founders: Founder,
    investors: Investor,
    mentors: Mentor,
  };

  if (!modelMap[type]) {
    return res.status(400).json({ message: "Invalid type" });
  }

  await modelMap[type].findByIdAndDelete(id);
  res.json({ message: "Deleted successfully" });
});

/* ================= START ================= */

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});