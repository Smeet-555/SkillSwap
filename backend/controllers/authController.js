const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mailSender = require("../utils/mailSender");

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, isAdmin: user.isAdmin },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );
};

// Register a new user (with OTP verification)
exports.register = async (req, res) => {
  try {
    const { name, email, password, otp } = req.body;
    
    // Validate required fields
    if (!name || !email || !password || !otp) {
      return res.status(400).json({ 
        message: "All fields are required (name, email, password, otp)" 
      });
    }
    
    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "Email already in use" });
    }

    // Verify OTP
    const OTP = require("../models/otpModel");
    console.log("🔍 Checking OTP for email:", email, "OTP:", otp);
    
    const otpRecord = await OTP.findOne({ email, otp }).sort({ createdAt: -1 });
    console.log("📋 OTP Record found:", otpRecord ? "YES" : "NO");
    
    if (!otpRecord) {
      // Check if there's any OTP for this email
      const anyOtp = await OTP.findOne({ email }).sort({ createdAt: -1 });
      console.log("📧 Any OTP for this email:", anyOtp ? `YES (OTP: ${anyOtp.otp})` : "NO");
      
      return res.status(400).json({ 
        message: "Invalid or expired OTP. Please request a new OTP." 
      });
    }
    
    console.log("✅ OTP verified successfully");

    // OTP is valid, proceed with registration
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashedPassword });

    // Delete used OTP
    await OTP.deleteMany({ email });

    const token = generateToken(user);

    // Send welcome email
    try {
      await mailSender(
        email,
        "Welcome to SkillSwap!",
        `<h1>Welcome ${name}!</h1>
         <p>Thank you for registering with SkillSwap.</p>
         <p>Your account has been successfully created and verified.</p>
         <p>Start exploring skills and connect with others!</p>`
      );
      console.log("Welcome email sent to:", email);
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError.message);
    }

    res.status(201).json({ 
      success: true,
      message: "Registration successful",
      token, 
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin
      }
    });
    
    console.log("User registered successfully:", email);
    
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: err.message });
  }
};

const generateAccessToken = (user) =>
  jwt.sign({ id: user._id, isAdmin: user.isAdmin }, process.env.JWT_SECRET, {
    expiresIn: "15m",
  });

const generateRefreshToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });

exports.login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Store refreshToken in DB
  user.refreshTokens.push(refreshToken);
  await user.save();

  // mail for notification of login of a user
  try {
    await mailSender(
      email,
      "Login Notification - SkillSwap",
      `<h1>Hello ${user.name}!</h1>
       <p>You have successfully logged in to your SkillSwap account.</p>
       <p>If this wasn't you, please secure your account immediately.</p>`
    );
  } catch (emailError) {
    console.error("Failed to send login notification:", emailError.message);
  }

  res.status(200).json({
    token: accessToken,
    refreshToken,
    user,
  });
};
exports.refresh = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(401).json({ message: "No refresh token provided" });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user || !user.refreshTokens.includes(refreshToken)) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    const newAccessToken = generateAccessToken(user);
    res.status(200).json({ token: newAccessToken });
  } catch (err) {
    res.status(403).json({ message: "Refresh token expired or invalid" });
  }
};

exports.logout = async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(400).json({ message: "Refresh token missing" });

  try {
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Remove this refresh token from user's list
    user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
    await user.save();

    res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    res.status(403).json({ message: "Invalid refresh token" });
  }
};

// Get current user from token
exports.getMe = async (req, res) => {
  try {
    res.status(200).json(req.user); // `req.user` is populated from JWT
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
