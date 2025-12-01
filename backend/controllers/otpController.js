const otpGenerator = require('otp-generator')
const OTP = require("../models/otpModel.js")
const User = require("../models/User.js")

exports.sendOTP = async (req , res)=>{
    try {
        const {email} = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                message: "Email is required"
            })
        }
        
        // Check if user is already registered
        const checkExistingUser = await User.findOne({email});
    
        if (checkExistingUser) {
            return res.status(401).json({
                success: false,
                message: "User already registered"
            })
        }
    
        // Generate unique OTP
        let otp = otpGenerator.generate(6, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
            digits: true
        })
    
        let result = await OTP.findOne({ otp: otp });
        while (result) {
          otp = otpGenerator.generate(6, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
            digits: true
          });
          result = await OTP.findOne({ otp: otp });
        }  
        
        // Delete any existing OTPs for this email
        await OTP.deleteMany({ email });
        
        // Create new OTP
        const otpPayload = {otp, email}
        await OTP.create(otpPayload)
        
        res.status(200).json({
          success: true,
          message: 'OTP sent successfully. Please check your email.',
        })
    
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
}

exports.verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        
        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                message: "Email and OTP are required"
            })
        }
        
        // Find the most recent OTP for this email
        const otpRecord = await OTP.findOne({ email, otp }).sort({ createdAt: -1 });
        
        if (!otpRecord) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP"
            })
        }
        
        // OTP is valid
        res.status(200).json({
            success: true,
            message: "OTP verified successfully"
        })
        
    } catch (error) {
        console.log(error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
}