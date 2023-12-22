
const asyncHandler = require("express-async-handler");
const Location = require('../models/locationModel')
const User = require('../models/userModel')



const addLocationToUser = asyncHandler(async (req, res) => {
    const {_id} = req.admin; // Assuming you extract user ID from the bearer token
  
    try {
      const user = await User.findById(_id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      const { locationname, address, percentage} = req.body;
      const newLocation = new Location({ locationname, address, percentage });
      await newLocation.save();
  
      // Add the new location's ID to the user's profile
      user.location.push(newLocation._id);
      await user.save();
  
      res.json({ message: 'New location added to user successfully', user });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  const updateLocation = asyncHandler(async (req, res) => {
    const { userId, locationId } = req.params;
    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      const updatedLocation = await Location.findOneAndUpdate(
        { _id: locationId, _id: { $in: user.location } }, // Ensure machine belongs to the user
        { $set: { locationname: req.body.locationname, address: req.body.address, percentage: req.body.percentage } },
        { new: true }
      );
  
      if (!updatedLocation) {
        return res.status(404).json({ message: 'Location not found' });
      }
  
      res.json({ message: 'Location details updated successfully', location: updatedLocation });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  

  const deleteLocation = asyncHandler(async (req, res) => {
    const { userId, locationId } = req.params;
  
    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      const isValidLocationId = user.location.some(id => id.toString() === locationId);
      if (!isValidLocationId) {
        return res.status(404).json({ message: 'Location not found for this user' });
      }
  
      user.location = user.location.filter(id => id.toString() !== locationId);
      await user.save();
  
      res.json({ message: 'Location deleted successfully', user });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

// get location by id
  const getLocationbyId = asyncHandler(async (req, res) => {
    try {
      const { locationId,userId } = req.params;
  
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      const location = await Location.findOne({ _id: locationId });
      if (!location) {
        return res.status(404).json({ message: 'Location not found' });
      }
  
      // Check if the location belongs to the user
      if (!user.location.includes(locationId)) {
        return res.status(403).json({ message: 'Location does not belong to the user' });
      }
  
      res.json({ location });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  })

//   const getLocationsOfUser = asyncHandler(async (req, res) => {
//     const { userId } = req.params; // Assuming userId is passed in the URL
  
//     try {
//       const user = await User.findById(userId).populate('location');
//       if (!user) {
//         return res.status(404).json({ message: 'User not found' });
//       }
  
//       res.json({ locations: user.location });
//     } catch (error) {
//       res.status(500).json({ error: error.message });
//     }
//   });
  
  
  const getAllLocationsForUser = asyncHandler(async (req, res) => {
    const { userId } = req.params; // Assuming userId is passed in the URL
    const { searchLocation } = req.query;
  
    try {
      const user = await User.findById(userId).populate({
        path: 'location',
        select: 'locationname address percentage'
         // Select only the 'locationname' field
      });
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      let locations = user.location;
  
      if (searchLocation) {
        locations = locations.filter(location =>
          location.locationname.toLowerCase().includes(searchLocation.toLowerCase())
        );
      }
  
      res.json({ locations });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  
  
  
  


  module.exports = {addLocationToUser, updateLocation,deleteLocation, getAllLocationsForUser,getLocationbyId}
  