const mongoose = require("mongoose");


const interviewDecisonSchema = new mongoose.Schema({
    interviewJobId:{
        type: mongoose.Schema.Types.ObjectId,
                ref:"InterviewJob",
    },
    decision:{
    type:String
    },
    description:{
        type:String
    }
})

module.exports = mongoose.model("InterviewDecison", interviewDecisonSchema);
