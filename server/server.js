import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import path from 'path'; // Already here
import connectDB from './config/db.js';
import complaintRoutes from './routes/complaintRoutes.js';
import userRoutes from './routes/userRoutes.js';

// --- ADD THESE LINES FOR CORRECT PATHING ---
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// --- END OF NEW LINES ---

dotenv.config();
connectDB();

const app = express();

app.use(cors());
app.use(express.json());

// API routes
app.use('/api/users', userRoutes);
app.use('/api/complaints', complaintRoutes);

// --- THIS IS THE CORRECTED STATIC FOLDER SETUP ---
// It now correctly points to the 'uploads' folder inside the 'server' directory.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// --- END OF CORRECTED LINE ---

app.get('/', (req, res) => {
    res.send('API is running...');
});

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));