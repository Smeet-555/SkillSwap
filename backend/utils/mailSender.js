const nodemailer = require("nodemailer");

const mailSender = async (email, subject, body) => {
  try {

    const transporter = nodemailer.createTransport({
      host: process.env.MAIL_HOST,
      port: process.env.MAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: `"SkillSwap" <${process.env.MAIL_USER}>`,
      to: email,
      subject: subject,
      html: body,
    });

    console.log(" Email sent successfully!");
    console.log("   Message ID:", info.messageId);
    console.log("   Sent to:", email);
    console.log("   Response:", info.response);
    return info;
  } catch (error) {
    console.error("Error sending email:", error.message);
    console.error("Full error:", error);
    throw error;
  }
};

module.exports = mailSender;
