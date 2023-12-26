const express = require('express');
const {
    addLocationToUser, updateLocation, deleteLocation, getAllLocationsForUser, getLocationbyId
} = require('../controllers/locationCtrl');
const { authMiddleware, isAdmin } = require('../middlerwares/authMiddleware');

const router = express.Router();

router.post('/create', authMiddleware, addLocationToUser);
router.put('/edit-location/:userId/location/:machineId', authMiddleware, updateLocation)
router.delete('/delete-location/:userId/location/:locationId', authMiddleware, deleteLocation)
router.get('/:userId', authMiddleware, getAllLocationsForUser)
router.get('/:userId/:locationId', authMiddleware, getLocationbyId)


module.exports = router;    