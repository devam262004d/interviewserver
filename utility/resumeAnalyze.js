const Groq = require("groq-sdk");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function analyzeResume(resumeText,interviewType) {
    console.log("Analyzing resume...");
    const prompt = `
You are a professional technical recruiter. Analyze the following resume and extract:
1. Full Name
2. Total Years of Experience
3. Key Technical Skills
4. Summarized Projects (1-2 lines each)
5. Interview Questions based on resume and interview type ${interviewType}
Resume:
${resumeText}
Return the output in JSON format with fields: name, experience, skills, projects, interview_questions.
not send in string okay aslo overall interview quwtion all are in one array .
note: do not add like any comment or extra , in this or  okay., project array in one project object in name and description.
     if this text is not a resume so return null.
`;
    const response = await groq.chat.completions.create({
        messages: [
            {
                role: "user",
                content: prompt,
            },
        ],
        model: "llama3-70b-8192", 
    });
    console.log(response);
    console.log(response.choices[0]?.message?.content);
    const result = extractJsonFromResponse(response.choices[0]?.message?.content)
    return result || "No analysis found.";
}


function extractJsonFromResponse(text) {
  const match = text.match(/```([\s\S]*?)```/);
  if (!match || match.length < 2) {
    throw new Error("No JSON block found in the response.");
  }
  let jsonString = match[1].trim();
  jsonString = jsonString.replace(/\/\/.*$/gm, ""); // Remove inline comments

  try {
    return JSON.parse(jsonString);
  } catch (err) {
    throw new Error("Invalid JSON format inside response: " + err.message);
  }
}

module.exports = analyzeResume;
