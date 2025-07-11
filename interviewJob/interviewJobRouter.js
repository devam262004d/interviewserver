const express = require("express");
const router = express.Router();
const signupLimiter = require("../middleware/rateLimiter");
const tokenVerify = require("../middleware/verifyToken");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

const {createInterviewJob, getJob,updateResumeText, analyzeresume} =  require("./interviewJobController");


router.post("/createInterviewJob",signupLimiter,tokenVerify, createInterviewJob);
router.get("/getJob/",tokenVerify,getJob);
router.post("/updateResumeText", tokenVerify, upload.single("file"), updateResumeText);
router.post ("/analyzeresume", tokenVerify, analyzeresume);


module.exports = router;