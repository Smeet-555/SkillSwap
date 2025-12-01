// const nodemailer = require('nodemailer')

import otpModel from "../models/otpModel";


async function sendOtpVerification(email , otp) {

    try {
            const emailSender = mailSender(
                email , 
                "Verification email",
                `<h2>Please confirm your otp</h2>`
                `<p>here is your otp ${otp}</p>`
            );
            console.log("Email Sent successfully : " , emailSender);
            
    } catch (error) {
            console.log("Error while sending email", error);
            throw error;       
    }
}

otpModel.pre("save" , async function(next){
    console.log("New doc saved to the database");
    //only send otp when new document is created, and not when the existing document is updated
    if (this.isNew) {
    await sendOtpVerification(this.email, this.otp);
  }
  next();
});