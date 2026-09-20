// import nodemailer from 'nodemailer';
// import fs from 'fs';
// import path from 'path';
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const emailAddress = "email@pdu-edu.org";
const emailPassword = "xRoJTS4poS2I0TM9";

async function sendEmail(to:any, subject:any, placeholders:any,isInvoice:any,isCert:any) {
    try {
        if (!to) {
            throw new Error("Recipient email address is None");
        }

        // Define the template path
        const templatePath = path.join(__dirname,isInvoice ? 'email.html' : isCert ? 'cert.html' : 'cred.html');
        
        if (typeof templatePath !== 'string') {
            throw new Error("templatePath should be a string representing the file path.");
        }

        // Read the HTML template
        const template = fs.readFileSync(templatePath, 'utf-8');

        // Replace placeholders with actual values
        const htmlBody = template.replace(/\{\{(.*?)\}\}/g, (_:any, key:any) => {
            console.log(`Replacing placeholder: {{${key}}}`);
            return placeholders[key] || `{{${key}}}`;  // If no value, keep placeholder in the output
        });
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
            from: '"PDU" <email@pdu-edu.org>',
            to: to, // list of receivers
            subject: subject, // Subject line
            html: htmlBody, // HTML body content
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

        console.log(`Email sent to ${to} successfully.`);
        return true;
    } catch (error:any) {
        console.error(`Failed to send email: ${error.message}`);
        return false;
    }
}
export default sendEmail;



// // test

// sendEmail("mwfarrukh@gmail.com", "Test Email", {
//     username : "Farrukh",

// })