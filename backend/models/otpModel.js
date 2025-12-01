const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const mailSender = require('../utils/mailSender');

const otpSchema = new Schema({
    email:{
        type: String,
        required: true
    },
    otp:{
        type : String,
        required:true
    },
    createdAt:{
        type: Date,
        default : Date.now,     //get the current date with time
        expires : 300
    }
});

otpSchema.pre('save', async function(next) {
    console.log('Pre-save hook triggered for OTP:', this.otp, 'Email:', this.email);
    try {
        if (this.isNew) {
            console.log('This is a new OTP document, sending email...');
            const emailSubject = 'Your OTP for SkillSwap Registration';
            const emailBody = `
                <h2>SkillSwap - OTP Verification</h2>
                <p>Your One-Time Password (OTP) for registration is:</p>
                <h1 style="color: #007bff; font-size: 32px; text-align: center; letter-spacing: 5px;">${this.otp}</h1>
                <p>This OTP is valid for 5 minutes only.</p>
                <p>If you didn't request this OTP, please ignore this email.</p>
            `;
            
            await mailSender(this.email, emailSubject, emailBody);
            console.log(`✅ OTP email sent successfully to ${this.email}`);
        } else {
            console.log('This is not a new document, skipping email');
        }
        next();
    } catch (error) {
        console.error('❌ Error sending OTP email:', error);
        next(error);
    }
});

module.exports = mongoose.model('OTP', otpSchema);


