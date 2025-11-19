import express from 'express';
const router = express.Router();
import { registerUser, loginUser, addTechnician, getTechnicians } from '../controllers/userController.js';

router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/add-technician', addTechnician); // Add this route
router.get('/technicians', getTechnicians);     // Add this route

export default router;