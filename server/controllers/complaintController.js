import Complaint from '../models/complaintModel.js';

// @desc    Fetch all complaints
// @route   GET /api/complaints
export const getComplaints = async (req, res) => {
    try {
        const complaints = await Complaint.find({}).sort({ createdAt: -1 });
        res.json(complaints);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a new complaint
// @route   POST /api/complaints
export const createComplaint = async (req, res) => {
    try {
        const { title, description, category, priority, resident, roomNumber } = req.body;

        let images = [];
        if (req.files) {
            images = req.files.map(file => `uploads/${file.filename}`);
        }

        const complaint = new Complaint({
            title,
            description,
            category,
            priority,
            resident,
            roomNumber,
            images,
        });
        const createdComplaint = await complaint.save();
        res.status(201).json(createdComplaint);
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update a complaint
// @route   PUT /api/complaints/:id
export const updateComplaint = async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.id);

        if (complaint) {
            complaint.status = req.body.status || complaint.status;
            complaint.technician = req.body.technician || complaint.technician;
            complaint.updates = req.body.updates || complaint.updates;
            if (req.body.status === 'resolved') {
                complaint.resolvedAt = new Date();
            }

            const updatedComplaint = await complaint.save();
            res.json(updatedComplaint);
        } else {
            res.status(404).json({ message: 'Complaint not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};