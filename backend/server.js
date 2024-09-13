const express = require('express');  
const cron = require('node-cron');  
const mongoose = require('mongoose');  
const nodemailer = require('nodemailer');  
const bodyParser = require('body-parser');
const cors = require('cors');  //done
require('dotenv').config();  

const app = express();
app.use(bodyParser.json()); 

// CORS Setup with Explicit Headers
const corsOptions = {
    origin: ['https://to-do-backend-one.vercel.app/'], // Frontend URLs
    credentials: true, // Allow credentials (cookies) to be included
    optionsSuccessStatus: 200, // For legacy browser support
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Allowed methods
};

// Apply CORS Middleware
app.use(cors(corsOptions));

// Middleware to explicitly set CORS headers (to handle custom issues)
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "https://to-do-backend-one.vercel.app/");  // Allow specific origin
    res.header("Access-Control-Allow-Credentials", "true"); // Allow credentials
    res.header("Access-Control-Allow-Methods", "GET,HEAD,PUT,PATCH,POST,DELETE");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// MongoDB connection
mongoose.connect(process.env.DB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("MongoDB Connected Successfully"))
    .catch((err) => console.log("Error is ", err));

// Task Schema and Model
const taskSchema = new mongoose.Schema({
  taskName: String,
  frequency: String,
  nextExecution: Date
});    

const logSchema = new mongoose.Schema({
  taskName: String,
  executionTime: Date,
  status: String,
  message: String
});

const Task = mongoose.model('Task', taskSchema);   
const Log = mongoose.model('Log', logSchema);

// Nodemailer transporter setup
const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
}); 

// Helper function to send emails
const sendEmail = async (taskName) => {
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: 'abc@gmail.com',
            subject: `Scheduled Reminder for task :- ${taskName}`,
            text: `This is a reminder email for :- ${taskName}.`
        });
        console.log("Mail sent");
    } catch (error) {
        console.error('Error sending email:', error);
    }
};

// Route to schedule tasks
app.post('/add-task', async (req, res) => {
    const { taskName, frequency } = req.body;

    // Validate cron pattern
    if (typeof frequency !== 'string') {
        return res.status(400).json({ success: false, message: 'Invalid cron pattern' });
    }

    // Save task to the database
    const task = new Task({ taskName, frequency, nextExecution: new Date() });
    await task.save();

    // Schedule the task
    cron.schedule(frequency, async () => {
        console.log("Scheduled task triggered");
        try {
            const existingLog = await Log.findOne({ taskName });

            if (!existingLog) {
                await sendEmail(taskName);
                const log = new Log({
                    taskName,
                    executionTime: new Date(),
                    status: 'Success',
                    message: 'Email sent'
                });
                await log.save();
                console.log(`Task "${taskName}" executed and logged successfully.`);
            } else {
                console.log(`Log for task "${taskName}" already exists. Skipping log creation.`);
            }
        } catch (err) {
            const existingLog = await Log.findOne({ taskName });

            if (!existingLog) {
                const log = new Log({
                    taskName,
                    executionTime: new Date(),
                    status: 'Failure',
                    message: err.message
                });
                await log.save();
                console.log(`Failed to execute task "${taskName}". Error logged.`);
            } else {
                console.log(`Error occurred, but log for task "${taskName}" already exists.`);
            }
        }
    });

    res.json({ success: true, nextExecution: task.nextExecution });
});

// Route to delete a task
app.delete('/delete-task/:taskName', async (req, res) => {
    const { taskName } = req.params;

    const deletedTask = await Task.findOneAndDelete({ taskName });

    if (!deletedTask) {
        return res.status(404).json({ success: false, message: 'Task not found' });
    }

    await Log.deleteMany({ taskName });
    res.json({ success: true, message: `Task "${taskName}" and related logs deleted successfully.` });
});

// Route to delete a log
app.delete('/delete-log/:id', async (req, res) => {
    const { id } = req.params;

    const deletedLog = await Log.findByIdAndDelete(id);

    if (!deletedLog) {
        return res.status(404).json({ success: false, message: 'Log not found' });
    }

    res.json({ success: true, message: 'Log deleted successfully.' });
});

// Fetch task list
app.get('/tasks', async (req, res) => {
    const tasks = await Task.find();
    res.json(tasks);
});

// Fetch logs
app.get('/logs', async (req, res) => {
    const logs = await Log.find();
    res.json(logs);
});

// Start the server
const PORT = process.env.PORT || 3000; 
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
