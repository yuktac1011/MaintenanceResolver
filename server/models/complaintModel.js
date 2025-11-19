// server/models/complaintModel.js
import mongoose from 'mongoose';

const updateSchema = new mongoose.Schema({
    time: { type: Date, default: Date.now },
    message: { type: String, required: true },
    by: { type: String, required: true }, // Can be 'System', 'Admin', or technician's name
});

const complaintSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        description: { type: String, required: true },
        category: { type: String, required: true, enum: ['electricity', 'water', 'wifi', 'cleaning'] },
        status: { type: String, required: true, default: 'open', enum: ['open', 'in-progress', 'resolved'] },
        priority: { type: String, required: true, default: 'medium', enum: ['low', 'medium', 'high'] },
        resident: { type: String, required: true },
        roomNumber: { type: String, required: true },
        images: [{ type: String }], // Array of image URLs
        technician: {
            id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Correctly ref 'User' model
            name: { type: String },
        },
        updates: [updateSchema],
        resolvedAt: { type: Date },
    },
    {
        timestamps: true, // Automatically adds createdAt and updatedAt fields
    }
);

const Complaint = mongoose.model('Complaint', complaintSchema);

export default Complaint;