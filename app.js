const express = require('express');
const app = express();
const cors = require('cors');
const connectDb = require('./utility/dataBase');
const { Server } = require("socket.io");
const http = require("http");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const authRouter = require('./auth/authRouter');
const interviewJob = require('./interviewJob/interviewJobRouter');
const passport = require("passport");

connectDb();


app.set("trust proxy", 1);
// ✅ CORS setup
app.use(cors({
  origin: 'http://localhost:3000', // frontend origin
  credentials: true,               // allow cookies
}));

// ✅ Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ✅ Passport setup (optional: if using Google OAuth)
require("./passport/googleStrategy")(passport);
app.use(passport.initialize());

const server = http.createServer(app);

// ✅ Socket.io
const io = new Server(server, {
  cors: {
    origin: "*", // okay for dev sockets
    methods: ["GET", "POST"]
  }
});



const activeRooms = new Map();

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);
  const userAgent = socket.handshake.headers["user-agent"];
  console.log("📱 Device info:", userAgent);

  socket.on("check-password", async ({ roomId, password }) => {
    const job = await InterviewJobs.findOne({ interviewCode: roomId });
    if (!job) return socket.emit("error", { message: "Job not found" });
    if (job.password !== password)
      return socket.emit("error", { message: "Password is incorrect" });
    socket.emit("password-is-correct", { roomId });
  });

  socket.on("join-room", async ({ roomId, role }) => {
    console.log("join to room");
    let participants = activeRooms.get(roomId) || [];
    console.log("participants", participants);

    if (participants.includes(socket.id)) return;

    if (participants.length === 0) {
      if (role !== "interviewer") {
        socket.emit("error", { message: "Please wait for the interviewer to join" });
      } else {
        socket.join(roomId);
        participants.push(socket.id);
        activeRooms.set(roomId, participants);
        console.log("✅ Interviewer joined:", socket.id);
      }
    } else if (participants.length === 1) {
      if (role !== "candidate") {
        socket.emit("error", { message: "Only candidate can join this time" });
      } else {
        socket.join(roomId);
        participants.push(socket.id);
        activeRooms.set(roomId, participants);
        console.log("✅ Candidate joined:", socket.id);
        socket.to(roomId).emit("user-joined");
      }
    } else {
      socket.emit("error", { message: "Room is full" });
    }
  });

  socket.on("offer", ({ offer, roomId }) => {
    socket.to(roomId).emit("offer", { offer });
  });

  socket.on("answer", ({ answer, roomId }) => {
    socket.to(roomId).emit("answer", { answer });
  });

  socket.on("ice-candidate", ({ candidate, roomId }) => {
    socket.to(roomId).emit("ice-candidate", { candidate });
  });

  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
    for (const [roomId, participants] of activeRooms.entries()) {
      const index = participants.indexOf(socket.id);
      if (index !== -1) {
        participants.splice(index, 1);
        if (participants.length === 0) {
          activeRooms.delete(roomId);
          console.log(`🗑️ Deleted empty room ${roomId}`);
        } else {
          activeRooms.set(roomId, participants);
        }
        break;
      }
    }
  });
});

// ✅ API routes
app.use('/api/auth', authRouter);
app.use('/api/interviewJob', interviewJob);

app.get("/test-cookie", (req, res) => {
  res.cookie("token", "test-123", {
    httpOnly: true,
    sameSite: "lax",
    secure: false
  }).send("Cookie set");
});

// ✅ Test route
app.get('/', (req, res) => {
  res.send('Hello from Express!');
});

server.listen(5000, () => {
  console.log(`🚀 Server is running on http://localhost:5000`);
});
