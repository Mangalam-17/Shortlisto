const express = require('express');
const router = express.Router();
const { createDrive, getDrives, getDriveById, updateDrive, deleteDrive, getDriveForm } = require('../controllers/driveController');
const auth = require('../middleware/auth');

// @route   POST api/drives
// @desc    Create a new assessment drive
// @access  Private
router.post('/', auth, createDrive);

// @route   GET api/drives
// @desc    Get all drives created by admin
// @access  Private
router.get('/', auth, getDrives);

// @route   GET api/drives/:id
// @desc    Get drive details (Public for registration)
// @access  Public
router.get('/:id', getDriveById);

// @route   GET api/drives/:id/form
// @desc    Get drive form schema (Public)
// @access  Public
router.get('/:id/form', getDriveForm);

// @route   PUT api/drives/:id
// @desc    Update a drive
// @access  Private
router.put('/:id', auth, updateDrive);

// @route   DELETE api/drives/:id
// @desc    Delete a drive
// @access  Private
router.delete('/:id', auth, deleteDrive);

// @route   DELETE api/drives
// @desc    Delete all drives and associated data for an admin
// @access  Private
const { deleteAllDrives } = require('../controllers/driveController');
router.delete('/', auth, deleteAllDrives);

module.exports = router;
