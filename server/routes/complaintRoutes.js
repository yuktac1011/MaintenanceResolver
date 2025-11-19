import express from 'express';
import {
    getComplaints,
    createComplaint,
    updateComplaint,
} from '../controllers/complaintController.js';
import upload from '../middleware/uploadMiddleware.js'; // <-- IMPORT the new middleware
const router = express.Router();

// Apply multer middleware for image uploads (up to 5 images) on the POST route
router.route('/').get(getComplaints).post(upload.array('images', 5), createComplaint);

router.route('/:id').put(updateComplaint);
export default router;