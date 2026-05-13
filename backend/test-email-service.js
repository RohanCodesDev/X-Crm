require("dotenv").config();
const { sendEmailMessage, verifyMailerConnection } = require("./api/sendemail/service");
const { renderTemplate } = require("./api/sendemail/template");

async function testEmailService() {
  try {
    console.log("🔧 Testing SMTP configuration...");
    
    // Verify SMTP connection
    await verifyMailerConnection();
    console.log("✅ SMTP connection verified successfully!");
    
    // Test sending an email
    console.log("\n📧 Attempting to send test email...");
    
    const testEmail = {
      to: process.env.SMTP_FROM || process.env.SMTP_USER,
      subject: "Email Service Test - {{timestamp}}",
      templateHtml: `
        <html>
          <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1>Email Service Test</h1>
            <p>This is a test email to verify your email sending configuration is working correctly.</p>
            <div style="background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <strong>Configuration Details:</strong>
              <ul>
                <li>SMTP Host: {{smtp_host}}</li>
                <li>SMTP Port: {{smtp_port}}</li>
                <li>From: {{from}}</li>
                <li>Timestamp: {{timestamp}}</li>
              </ul>
            </div>
            <p>If you received this email, your email service is working perfectly! 🎉</p>
          </body>
        </html>
      `,
      variables: {
        smtp_host: process.env.SMTP_HOST,
        smtp_port: process.env.SMTP_PORT,
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        timestamp: new Date().toISOString()
      }
    };
    
    const result = await sendEmailMessage(testEmail);
    
    console.log("✅ Email sent successfully!");
    console.log("📨 Message ID:", result.messageId);
    console.log("📊 Response:", result.response);
    
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

testEmailService();
