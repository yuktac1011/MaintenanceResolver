import User from '../models/userModel.js';
import jwt from 'jsonwebtoken';

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @desc    Register a new user (Resident or Admin)
// @route   POST /api/users/register
const registerUser = async (req, res) => {
    const { name, email, password, role } = req.body;
    if (role === 'technician') {
        res.status(400).json({ message: 'Technician cannot register this way.' });
        return;
    }
    const userExists = await User.findOne({ email });

    if (userExists) {
        res.status(400).json({ message: 'User already exists' });
        return;
    }

    const user = await User.create({ name, email, password, role });

    if (user) {
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
        });
    } else {
        res.status(400).json({ message: 'Invalid user data' });
    }
};

// @desc    Auth user & get token
// @route   POST /api/users/login
const loginUser = async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id),
        });
    } else {
        res.status(401).json({ message: 'Invalid email or password' });
    }
};

// @desc    Add a new technician (Admin only)
// @route   POST /api/users/add-technician
const addTechnician = async (req, res) => {
    const { name, email, password, specialization } = req.body;
    const userExists = await User.findOne({ email });

    if (userExists) {
        return res.status(400).json({ message: 'Technician with this email already exists' });
    }

    const user = await User.create({
        name,
        email,
        password,
        role: 'technician',
        specialization,
    });

    if (user) {
        res.status(201).json({
            message: 'Technician added successfully',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                specialization: user.specialization,
            },
        });
    } else {
        res.status(400).json({ message: 'Invalid technician data' });
    }
};

// @desc    Get all technicians
// @route   GET /api/users/technicians
const getTechnicians = async (req, res) => {
    try {
        const technicians = await User.find({ role: 'technician' }).select('-password');
        res.json(technicians);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

export { registerUser, loginUser, addTechnician, getTechnicians };