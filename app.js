const express = require('express');
const app = express();
const cors = require('cors');
const connectDb = require('./utility/dataBase');
const { Server } = require("socket.io");
const http = require("http");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const session = require("express-session");
const authRouter = require('./auth/authRouter');
const interviewJob = require('./interviewJob/interviewJobRouter');


connectDb();
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


app.use(
  session({
    secret: "your_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // set to true with HTTPS
      httpOnly: true,
    }
  })
);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use('/api/auth', authRouter); // ✅ FIXED this line
app.use('/api/interviewJob', interviewJob);

const activeRooms = new Map();

io.on("connection", (socket) => {
  console.log("✅ User connected:", socket.id);
  const userAgent = socket.handshake.headers["user-agent"];
  console.log("📱 Device info:", userAgent);

  socket.on("check-password", async ({ roomId, password }) => {
    const job = await InterviewJobs.findOne({ interviewCode: roomId });
    if (!job) {
      socket.emit("error", { message: "Job not found" });
      return;
    }
    if (job.password !== password) {
      socket.emit("error", { message: "Password is incorrect" });
      return;
    }
    socket.emit("password-is-correct", { roomId });
  })



  socket.on("join-room", async ({ roomId, role }) => {
    console.log("join to room")
    let participants = activeRooms.get(roomId) || [];
    console.log("participants", participants);

    if (participants.includes(socket.id)) {
      console.log("🚫 Already joined:", socket.id);
      return;
    }

    if (participants.length === 0) {
      if (role !== "interviewer") {
        socket.emit("error", { message: "Please wait for the interviewer to join" });
      } else {
        socket.join(roomId);
        participants.push(socket.id);
        activeRooms.set(roomId, participants);
        console.log("✅ Interviewer joined:", socket.id);
        console.log(activeRooms)
      }
    } else if (participants.length == 1) {
      if (role !== "candidate") {
        socket.emit("error", { message: "only candidate can join this time" });
      } else {
        socket.join(roomId);
        participants.push(socket.id);
        activeRooms.set(roomId, participants);
        console.log("✅ Candidate joined:", socket.id);
         socket.to(roomId).emit("user-joined");
        console.log(activeRooms)
      }
    } else {
      if (participants.length == 2) {
        socket.emit("error", { message: "Room is full" });
      }
    }
  });

  socket.on("offer", ({ offer, roomId }) => {
    console.log("offer created ")
    socket.to(roomId).emit("offer", { offer });
  });

  socket.on("answer", ({ answer, roomId }) => {
    console.log("answer created ");
    socket.to(roomId).emit("answer", { answer });
  });

  socket.on("ice-candidate", ({ candidate, roomId }) => {
    socket.to(roomId).emit("ice-candidate", { candidate });
  });

  // ✅ Disconnect cleanup
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);

    for (const [roomId, participants] of activeRooms.entries()) {
      const index = participants.indexOf(socket.id);
      if (index !== -1) {
        participants.splice(index, 1);
        console.log(`🧹 Removed ${socket.id} from room ${roomId}`);

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



app.get('/', (req, res) => {
  res.send('Hello from Express!');
});


server.listen(5000, () => {
  console.log(`🚀 Server is running on http://localhost:4000`);
});
