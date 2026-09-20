const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const emailAddress = "email@pdu-edu.org";
const emailPassword = "xRoJTS4poS2I0TM9";

const adminEmail= "admin@pdu-edu.org";

async function sendContactEmail(from:any,fromEmail:any,subject:any,content:any) {
    try {
        if (!subject) {
            throw new Error("Subject is None");
        }
        // Create a transporter object using SMTP transport
        const transporter = nodemailer.createTransport({
            host: 'pdu-edu.org',
            port: 587,
            secure: false, // true for 465 port
            auth: {
                user: emailAddress,
                pass: emailPassword,
            },
        });

        // Define email options
        const mailOptions = {
            from: `"${from}" <${fromEmail}>`,
            to: adminEmail, // list of receivers
            subject: subject, // Subject line
            text: content, 
        };

        // Send email
        transporter.sendMail(mailOptions,(err:any,info:any)=>{
            if(err){
                console.log(err);
            }
            else{
                console.log(info);
            }
        })

        return true;
    } catch (error:any) {
        console.error(`Failed to send email: ${error.message}`);
        return false;
    }
}
export default sendContactEmail;
