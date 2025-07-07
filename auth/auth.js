const User = require("./user");
const bCrypt = require("bcryptjs");
const cleanObject = require("../utility/firldFilter");
const jwt = require("jsonwebtoken");



exports.signUp = async (req, res) => {
    try {
        console.log("this is signup controllercode", req.body);

        const { fullName, email, password, phoneNumber, accountType, gender } = req.body;
        console.log(accountType);
        if (!fullName || !email || !password || !phoneNumber || !accountType) {
            console.log("this is signupdbdcbidcefcbfic")
            return res.status(400).json({ message: "All fields are requiered" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        const hashedPassword = await bCrypt.hash(password, 10);

        const user = ({
            userName: fullName,
            email,
            password: hashedPassword,
            phone: phoneNumber,
            accoutnType: accountType,
            gender: gender,
        });

        console.log("this is user", user)
        console.log(user)
        const userData = cleanObject(user);
        const newUser = new User(userData);
        await newUser.save();
        res.status(201).json({ message: "User created successfully" });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}



exports.login = async (req, res) => {
  try {
    console.log("🔐 Login controller triggered");

    const { email, password } = req.body;

    // ✅ Validate input
    if (!email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // ✅ Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // ✅ Validate password
    const isMatch = await bCrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid password" });
    }

    // ✅ Generate token
    const token = jwt.sign(
      {
        email: user.email,
        id: user._id,
        accountType: user.accoutnType, // Make sure this field name is correct in your schema
      },
      process.env.JWT_SECRET || "helojwt",
      {
        expiresIn: "1d",
      }
    );

    console.log("✅ Token created:", token);

    // ✅ Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, 
      secure: false,               
      sameSite: "lax",             
    });

    // ✅ Send response
    return res.status(200).json({
      message: "Login successful",
      user: {
        email: user.email,
        id: user._id,
        accountType: user.accoutnType,
      },
    });
  } catch (error) {
    console.error("❌ Login error:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.logout = (req, res) => {
    res.clearCookie("token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: "Lax",
    });
    res.status(200).json({ message: "Logged out successfully" });

}