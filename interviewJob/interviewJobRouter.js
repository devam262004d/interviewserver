const express = require("express");
const router = express.Router();
const signupLimiter = require("../middleware/rateLimiter");
const tokenVerify = require("../middleware/verifyToken");
const multer = require("multer");
const upload = multer({ storage: multer.memoryStorage() });

const {createInterviewJob, getJob,updateResumeText, analyzeresume, audioToText, editDate, deleteJob, getJobDetails, submitFinalDecision} =  require("./interviewJobController");


router.post("/createInterviewJob",signupLimiter,tokenVerify, createInterviewJob);
router.get("/getJob/",tokenVerify,getJob);
router.post("/updateResumeText", tokenVerify, upload.single("file"), updateResumeText);
router.post ("/analyzeresume", tokenVerify, analyzeresume);
router.post("/audioToText",tokenVerify, upload.single("audio"), audioToText );
router.post("/editDate", tokenVerify, editDate);
router.delete("/deleteJob/:id", tokenVerify, deleteJob);
router.post("/getJobDetails", tokenVerify, getJobDetails);
router.post ("/submitFinalDecision", tokenVerify, submitFinalDecision);

module.exports = router;