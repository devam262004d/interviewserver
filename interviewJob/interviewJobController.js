const InterviewJob = require('../interviewJob/interviewJob');
const mailSender = require("../utility/mailSender");
const pdfParse = require("pdf-parse");
const analyzeResume = require("../utility/resumeAnalyze");
const axios = require("axios");
const Groq = require("groq-sdk");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const InterviewDecison = require("../interviewDecison/interviewDecison");

exports.createInterviewJob = async (req, res) => {
  try {
    const { jobTitle, description, skills, scheduledAt, interviewType, draft, userEmail } = req.body;
    if (!jobTitle || !description || !skills || !scheduledAt || !interviewType) {
      return res.status(400).json({ message: "All fields are required" });
    }
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = "";
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const id = Math.floor(1000000000 + Math.random() * 9000000000);
    const interviewCode = id.toString();

    console.log("Generated:", { interviewCode, password });
    const user = req.user;
    const date = new Date(scheduledAt);

    const formatted = date.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    if (userEmail) {
      const html = generateInterviewEmail(
        interviewCode,
        password,
        formatted
      );
      mailSender(userEmail, "Your Interview Details", html);
    }

    const job = new InterviewJob({
      interviwerId: user.id,
      jobTitle: jobTitle,
      description: description,
      skills: skills,
      scheduledAt: scheduledAt,
      InterviewType: interviewType,
      interviewCode: interviewCode,
      password: password,
      interviewStatus: "scheduled",
      status: draft ? "draft" : "live",
      candidateEmail: userEmail,
    })

    await job.save();
    return res.status(201).json({
      message: "Interview job created successfully",
      interviewCode,
      password,
    });
  } catch (error) {
    console.error("Error in createInterviewJob:", error.message);
    return res.status(500).json({ message: error.message });
  }
};



exports.getJob = async (req, res) => {
  try {
    const search = req.query.q || "";
    const status = req.query.status || "";
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    console.log("status", status)
    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }
    if (search) {
      filter.jobTitle = { $regex: search, $options: "i" }
    }
    const jobs = await InterviewJob.find(filter).skip(skip).limit(limit).populate("interviewDecison");
    const totalJobs = await InterviewJob.countDocuments(filter);
    return res.status(200).json({
      data: jobs,
      totalJobs: totalJobs,
      currentPage: page,
      message: "Jobs fetched successfully",
    })
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
}


exports.updateResumeText = async (req, res) => {
  try {
    console.log("this is updateResumeText function");
    const { id, password } = req.body;
    console.log("id", id);
    if (!id) {
      return res.status(404).json({ error: "Please enter the interview Id" });
    } else if (!password) {
      return res.status(404).json({ error: "Please enter the interview Password" });
    }
    const job = await InterviewJob.findOne({ interviewCode: id, password: password });
    if (!job) {
      return res.status(404).json({ error: "invalid Id or Password!" });
    }
    if (!req.file) {

      return res.status(400).json({ error: "No file uploaded" });
    }
    const data = await pdfParse(req.file.buffer);
    job.resumeText = data.text;
    await job.save();
    return res.status(200).json({
      message: "Resume text updated successfully",
      resumeText: data.text,
      success: true
    })
  } catch (error) {
    return res.status(500).json({
      message: error.message,
    });
  }
}


exports.analyzeresume = async (req, res) => {
  try {
    console.log("This is analyzeResume function");
    console.log(req.body)
    const { id } = req.body;

    const job = await InterviewJob.findOne({ interviewCode: id });
    if (!job) {
      return res.status(404).json({
        error: "Job not found or invalid ID",
        success: false
      });
    }

    const textFile = job.resumeText;
    if (!textFile || textFile.trim() === "") {
      return res.status(400).json({ error: "No resume found" });
    }
    const interviewType = job.InterviewType;
    const analysis = await analyzeResume(textFile, interviewType);
    job.resumeAnalyze = analysis;
    job.save();
    return res.status(200).json({ analysis });
  } catch (error) {
    console.error("Error in analyzeResume:", error);
    return res.status(500).json({ message: error.message });
  }
};

exports.audioToText = async (req, res) => {
  try {
    console.log("this is audio to text file ");
    console.log("Audio uploaded:", req.file);
    console.log(req.body);
    const { roomId, totalTime } = req.body;
    console.log(req.body)
    const audioBuffer = req.file.buffer;
    const response = await axios.post("https://api.deepgram.com/v1/listen", audioBuffer, {
      headers: {
        "Content-Type": "audio/webm",
        Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
      },
    })
    const transcript = response.data.results.channels[0].alternatives[0].transcript;
    console.log("Transcript:", transcript);
    const job = await InterviewJob.findOne({ interviewCode: roomId });
    // job.interviewTranscription = transcript;
    // interview analze
   job.totalTime =totalTime;
    job.interviewTranscription = "Can you tell me about your experience with React? I have been working with React for over three years, building dynamic and responsive web applications using hooks like useState, useEffect, and useContext. What are the main features of React? React is a component-based library that allows efficient UI rendering using a virtual DOM, supports one-way data binding, and offers hooks for managing state and lifecycle in functional components. Can you explain the difference between controlled and uncontrolled components? Controlled components have their form data controlled by React state, while uncontrolled components store their own state internally and rely on refs to access values. How do you optimize the performance of a React application? I use React.memo for memoization, useCallback and useMemo to prevent unnecessary re-renders, lazy loading for components, and proper key usage in lists. Can you explain the concept of reconciliation in React? Reconciliation is the process by which React updates the virtual DOM and efficiently determines the minimal changes required to update the actual DOM. Have you worked with state management libraries like Redux? Yes, I have implemented Redux for global state management using actions, reducers, and the store, and I have also worked with Redux Toolkit for cleaner and less boilerplate code. What is the difference between useEffect and useLayoutEffect? useEffect runs asynchronously after the render is committed to the screen, whereas useLayoutEffect runs synchronously after DOM mutations but before the browser paints, making it useful for measuring DOM elements. Do you have experience with testing React components? Yes, I use tools like Jest and React Testing Library for unit and integration testing to ensure components render correctly and handle user interactions as expected."
    const prompt = `
You are an expert interview analyzer. Analyze the given interview transcript and return the result strictly in the JSON format provided below.

### INPUT TRANSCRIPT:
${job.interviewTranscription}

---

### TASKS:

1. Identify and separate the conversation into:
   - **Interviewer Questions**: All questions and statements from the interviewer.
   - **Candidate Answers**: All responses from the candidate.

2. Generate an array of important Q&A pairs like this:
   [
     { "question": "Interviewer question text", "answer": "Candidate answer text" }
   ]

3. Analyze Candidate Performance and provide:
   {
     "metrics": [
       { "speakingRate": "Short | Moderate | Long" },
       { "clarity": 1-10 },
       { "confidence": 1-10 }
     ],
     "relevance": 1-10,
     "keyStrengths": ["strength1", "strength2"],
     "weaknesses": ["weakness1", "weakness2"],
     "selectionChance": "XX%",
     "feedback": "3-4 lines of constructive feedback",
     "TechnicalSkills": 1-10
   }

4. Analyze Interviewer Performance and provide:
   {
     "questionQuality": 1-10,
     "flow": 1-10,
     "engagement": 1-10,
     "improvementSuggestions": ["suggestion1", "suggestion2"],
     "TechnicalSkills": 1-10
   }

5. Summarize the interview in 3-4 sentences.

---

### OUTPUT JSON FORMAT:
{
  "interviewerQuestions": ["question1", "question2", ...],
  "candidateAnswers": ["answer1", "answer2", ...],
  "qaPairs": [
    { "question": "Interviewer question text", "answer": "Candidate answer text" }
  ],
  "candidateAnalysis": {
    "metrics": [
      { "speakingRate": "" },
      { "clarity": 0 },
      { "confidence": 0 }
    ],
    "relevance": 0,
    "keyStrengths": [],
    "weaknesses": [],
    "selectionChance": "",
    "feedback": "",
    "TechnicalSkills": 0
  },
  "interviewerAnalysis": {
    "questionQuality": 0,
    "flow": 0,
    "engagement": 0,
    "improvementSuggestions": [],
    "TechnicalSkills": 0
  },
  "summary": ""
}

---

IMPORTANT:
- Return only valid JSON (no extra text, no explanations).
- Do NOT change the JSON keys or structure.
- Fill all fields based on the transcript content.
- Dont write like this in frist line Here is the output JSON format: direct send in json okay.
`;



    const responsee = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama3-70b-8192",
    });
    console.log(responsee.choices[0]?.message?.content);

    job.analyzeData = responsee.choices[0]?.message?.content;
    await job.save();

  } catch (error) {
    console.error("Error in analyzeResume:", error);
    return res.status(500).json({ message: error.message });
  }
}



exports.editDate = async (req, res) => {
  try {
    const { id, dateData, menuvalue } = req.body;

    const job = await InterviewJob.findOne({ _id: id });
    job.scheduledAt = dateData;
    if (menuvalue != "") {
      job.status = menuvalue;
    }
    const date = new Date(job.scheduledAt);

    const formatted = date.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    await job.save();
    const html = generateUpdatedInterviewEmail(
      job.interviewCode,
      job.password,
     formatted
    );
    mailSender(job.candidateEmail, "Interview Schedule Update", html);
    return res.status(200).json({ message: "Interview Schedule Updated" });
  } catch (error) {
    console.error("Error in analyzeResume:", error);
    return res.status(500).json({ message: error.message });
  }
}

exports.deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    const job = await InterviewJob.findOne({ _id: id });
    const html = generateDeletedInterviewEmail(
      job.interviewCode,
      job.password,
      job.jobTitle
    );
    mailSender(job.candidateEmail, "Your Scheduled Interview Has Been Cancelled", html);
    await InterviewJob.deleteOne({ _id: id });

    return res.status(200).json({ message: "Your Scheduled Interview Has Been Cancelled" });
  } catch (error) {
    console.error("Error in analyzeResume:", error);
    return res.status(500).json({ message: error.message });
  }
}

exports.getJobDetails = async (req, res) => {
  try {

    const { roomId } = req.body;
    const job = await InterviewJob.findOne({ interviewCode: roomId });
    return res.status(200).json({
      analyzeData: job.analyzeData,
      resumeDetails: job.resumeAnalyze,
      candidateEmail: job.candidateEmail,
      jobTitle: job.jobTitle,
      flag:job.flag
    });
  } catch (error) {
    console.error("Error in analyzeResume:", error);
    return res.status(500).json({ message: error.message });
  }
}


exports.submitFinalDecision = async (req, res) => {
  try {
    console.log("this is req.body", req.body);
    const { description, option, roomId } = req.body;
    const job = await InterviewJob.findOne({ interviewCode: roomId });
    if (!description || !option) {
      return res.status(400).json({ message: "Please enter description and option" });
    }
    const finalDecision = await new InterviewDecison({
      interviewJobId: job._id,
      description,
      decision: option,
    })
    job.interviewDecison = finalDecision._id;
    job.flag = true;
    await job.save();
    await finalDecision.save();
    return res.status(200).json({ message: "Form Submited!" });
  } catch (error) {
    console.error("Error in analyzeResume:", error);
    return res.status(500).json({ message: error.message });
  }
}



function generateInterviewEmail(interviewCode, password, interviewDate = "Not specified") {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
      <h2 style="color: #2c3e50; text-align: center;">🎯 Interview Invitation</h2>

      <p style="font-size: 16px; color: #444;">Hello Candidate,</p>

      <p style="font-size: 16px; color: #444;">
        You are invited to attend an interview. Please find your interview details below:
      </p>

      <div style="background-color: #f9f9f9; padding: 15px 20px; border-left: 4px solid #1976d2; margin: 20px 0; border-radius: 5px;">
        <p style="font-size: 16px; margin: 0;"><strong>📅 Date:</strong> <span>${interviewDate}</span></p>
        <p style="font-size: 16px; margin: 0;"><strong>🔐 Interview Code:</strong> <span style="color: #1976d2;">${interviewCode}</span></p>
        <p style="font-size: 16px; margin: 0;"><strong>🔑 Password:</strong> <span style="color: #1976d2;">${password}</span></p>
      </div>


      <p style="font-size: 15px; color: #555; margin-top: 30px;">
        Please ensure you are ready and available at the scheduled time. Use the above code and password to join.
      </p>

      <p style="font-size: 14px; color: #888; text-align: center; margin-top: 30px;">
        This is an automated message. Do not reply.
      </p>
    </div>
  `;
}

function generateUpdatedInterviewEmail(interviewCode, password, newDate = "Not specified") {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
      <h2 style="color: #e67e22; text-align: center;">📢 Interview Schedule Updated</h2>

      <p style="font-size: 16px; color: #444;">Hello Candidate,</p>

      <p style="font-size: 16px; color: #444;">
        Please note that your interview schedule has been updated. Find the new details below:
      </p>

      <div style="background-color: #fff8e1; padding: 15px 20px; border-left: 4px solid #e67e22; margin: 20px 0; border-radius: 5px;">
        <p style="font-size: 16px; margin: 0;"><strong>📅 New Date:</strong> <span>${newDate}</span></p>
        <p style="font-size: 16px; margin: 0;"><strong>🔐 Interview Code:</strong> <span style="color: #e67e22;">${interviewCode}</span></p>
        <p style="font-size: 16px; margin: 0;"><strong>🔑 Password:</strong> <span style="color: #e67e22;">${password}</span></p>
      </div>

      <p style="font-size: 15px; color: #555; margin-top: 30px;">
        Please make sure you are available at the new time. Use the above code and password to join the interview.
      </p>

      <p style="font-size: 14px; color: #888; text-align: center; margin-top: 30px;">
        This is an automated message. Do not reply.
      </p>
    </div>
  `;
}

function generateDeletedInterviewEmail(interviewCode, password, jobTitle = "Interview") {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
      <h2 style="color: #d32f2f; text-align: center;">❌ Interview Cancelled</h2>

      <p style="font-size: 16px; color: #444;">Hello Candidate,</p>

      <p style="font-size: 16px; color: #444;">
        We regret to inform you that your scheduled interview for the position <strong>${jobTitle}</strong> has been <span style="color: #d32f2f;">cancelled</span>.
      </p>

      <div style="background-color: #f9f9f9; padding: 15px 20px; border-left: 4px solid #d32f2f; margin: 20px 0; border-radius: 5px;">
        <p style="font-size: 16px; margin: 0;"><strong>🚫 Previous Interview Code:</strong> <span style="color: #d32f2f;">${interviewCode}</span></p>
        <p style="font-size: 16px; margin: 0;"><strong>🚫 Previous Password:</strong> <span style="color: #d32f2f;">${password}</span></p>
      </div>

      <p style="font-size: 15px; color: #555; margin-top: 20px;">
        The above details are no longer valid, and you will not be able to join this session. If required, you will receive a new interview schedule soon.
      </p>

      <p style="font-size: 14px; color: #888; text-align: center; margin-top: 30px;">
        This is an automated message. Do not reply.
      </p>
    </div>
  `;
}
