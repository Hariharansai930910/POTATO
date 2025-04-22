const functions = require('firebase-functions');
const admin = require('firebase-admin');
const nodemailer = require('nodemailer');

admin.initializeApp();

exports.sendMatchNotifications = functions.firestore
  .document('match_requests/{requestId}')
  .onCreate(async (snap, context) => {
    const matchData = snap.data();
    
    try {
      // Get all users from Authentication
      const userListResult = await admin.auth().listUsers();
      const users = userListResult.users;
      
      // Filter out the requesting user
      const otherUsers = users.filter(user => user.email !== matchData.user_email);
      
      // Set up email transporter
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'your-email@gmail.com', // Replace with your email
          pass: 'your-app-password'     // Replace with your app password
        }
      });
      
      // Send emails to all other users
      const emailPromises = otherUsers.map(user => {
        const mailOptions = {
          from: 'SliceMate <your-email@gmail.com>',
          to: user.email,
          subject: 'New SliceMate Match Available!',
          html: `
            <h1>New Match Request!</h1>
            <p>Someone wants to share ${matchData.food_name} and needs a partner!</p>
            <p>They want ${matchData.slices_wanted} slices out of 8.</p>
            <p><a href="https://your-app-url.com/respond.html?requestId=${context.params.requestId}">Click here to respond</a></p>
          `
        };
        
        return transporter.sendMail(mailOptions);
      });
      
      await Promise.all(emailPromises);
      console.log(`Sent match notifications to ${emailPromises.length} users`);
      return null;
    } catch (error) {
      console.error('Error sending match notifications:', error);
      return null;
    }
  });
