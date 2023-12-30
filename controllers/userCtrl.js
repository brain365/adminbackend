const genrateToken = require("../config/jwtToken");
const User = require("../models/userModel");
const asyncHandler = require("express-async-handler");
const validateMongodbId = require("../utils/validateMongodbid");
const genrateRefreshToken = require("../config/refreshToken");
const Location = require('../models/locationModel')
const Machine = require('../models/machineModel')
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const mongoose = require('mongoose')

// create admin and superadmin
const createUser = asyncHandler(async (req, res) => {
  const email = req.body.email;
  const findUser = await User.findOne({ email: email });
  if (!findUser) {
    const newUser = await User.create(req.body);
    res.json(newUser);
  } else {
  }
});


//login admin
const loginUserCtrl = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const findUser = await User.findOne({ email });

  if (findUser) {
    const currentDate = new Date();
    const restrictionDate = findUser.restrictionDate;

    if (!restrictionDate || restrictionDate > currentDate) {
      if (await findUser.isPasswordMatched(password)) {
        const refreshToken = genrateRefreshToken(findUser?._id);
        const updateUser = await User.findByIdAndUpdate(
          findUser.id,
          {
            refreshToken: refreshToken,
          },
          {
            new: true,
          }
        );

        res.cookie("refreshToken", refreshToken, {
          httpOnly: true,
          maxAge: 72 * 60 * 60 * 1000,
        });

        res.json({
          _id: findUser?._id,
          firstname: findUser?.firstname,
          lastname: findUser?.lastname,
          phone: findUser?.phone,
          email: findUser?.email,
          role: findUser?.role,
          restrictionDate: findUser?.restrictionDate,
          token: genrateToken(findUser?._id),
        });
      } else {
        throw new Error("Invalid Credentials");
      }
    } else {
      throw new Error("Restricted");
    }
  } else {
    throw new Error("User not found");
  }
});

//login super admin
const loginAdmin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const findAdmin = await User.findOne({ email });
  if (findAdmin.role !== "superadmin") throw new Error("Not Authorized");
  if (findAdmin && (await findAdmin.isPasswordMatched(password))) {
    const refreshToken = genrateRefreshToken(findAdmin?._id);
    const updateuser = await User.findByIdAndUpdate(
      findAdmin.id,
      {
        refreshToken: refreshToken,
      },
      {
        new: true,
      }
    );
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      maxAge: 72 * 60 * 60 * 1000,
    });
    res.json({
      _id: findAdmin?._id,
      firstname: findAdmin?.firstname,
      lastname: findAdmin?.lastname,
      email: findAdmin?.email,
      phone: findAdmin?.phone,
      token: genrateToken(findAdmin?._id),
    });
  } else {
    throw new Error("Invalid Crendantials");
  }
});

// get a admin
const getaUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  validateMongodbId(id);
  try {
    const getaUser = await User.findById(id).populate({
      path: 'location',
      populate: {
        path: 'machines',
        model: 'Machine',
      }
    })
    .exec();
    if (getaUser) {
      const updatedUser = await getaUser.save();
      res.json({
        getaUser: updatedUser
      });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// delete a admin
const deleteaUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const deleteaUser = await User.findByIdAndDelete(id);
    res.json({
      deleteaUser,
    });
  } catch (error) {
    throw new Error(error);
  }
});

// update a admin
const updatedUser = asyncHandler(async (req, res) => {
  const { _id, role } = req.admin;
  validateMongodbId(_id);

  if (role !== 'superadmin') {
    return res.status(403).json({ message: 'Unauthorized: Only super admins can update admin.' });
  }

  try {
    const { id } = req.params;
    const userToUpdate = await User.findById(id);

    if (!userToUpdate) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    userToUpdate.email = req?.body?.email || userToUpdate.email;
    userToUpdate.password = req?.body?.password || userToUpdate.password;
    userToUpdate.firstname = req?.body?.firstname || userToUpdate.firstname;
    userToUpdate.lastname = req?.body?.lastname || userToUpdate.lastname;
    userToUpdate.phone = req?.body?.phone || userToUpdate.phone;


    const updatedUser = await userToUpdate.save();

    res.json(updatedUser);
  } catch (error) {
    throw new Error(error);
  }
});


// search and all admins
const getAllUsers = asyncHandler(async (req, res) => {
  try {
    const { searchuser } = req.query;
    let users;

    if (!searchuser) {
      users = await User.find({ role: { $ne: 'superadmin' } });
    } else {
      users = await User.find({
        $and: [
          { role: { $ne: 'superadmin' } },
          { firstname: { $regex: new RegExp(searchuser, 'i') } }
        ]
      });
    }
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// user add machine
const addMachineToUserLocation = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { locationId, employeeIds } = req.body; // Get locationId and employeeIds from the request body

  try {
    const user = await User.findById(userId).populate('location');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const location = user.location.find(loc => loc._id.toString() === locationId);
    if (!location) {
      return res.status(404).json({ message: 'Location not found for the user' });
    }

    const { machineName, serialNumber } = req.body;
    const newMachine = new Machine({ machineName, serialNumber });

    newMachine.employees = employeeIds; 

    await newMachine.save();

    location.machines = location.machines || [];
    location.machines.push(newMachine._id);

    if (location instanceof mongoose.Document) {
      await location.save();
      const updatedUser = await User.findById(userId)
        .populate({
          path: 'location',
          populate: {
            path: 'machines',
            model: 'Machine'
          }
        })
        .exec();
      res.json({ message: 'New machine added to location successfully', updatedUser });
    } else {
      return res.status(500).json({ error: 'Error saving location' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// update machine
const updateMachineInUserLocation = asyncHandler(async (req, res) => {
  const { userId, machineId, locationId } = req.params; // Extract locationId from params
  const { machineName, serialNumber, employeeIds } = req.body; // No need to add locationId

  try {
    const updatedMachine = await Machine.findByIdAndUpdate(
      machineId,
      { machineName, serialNumber, location: locationId }, // Set locationId for the machine
      { new: true }
    );

    if (!updatedMachine) {
      return res.status(404).json({ message: 'Machine not found' });
    }

    // Update employees for the machine
    updatedMachine.employees = employeeIds; // Assuming employeeIds is an array of employee IDs

    await updatedMachine.save();

    const updatedUser = await User.findById(userId)
      .populate({
        path: 'location',
        populate: {
          path: 'machines',
          model: 'Machine'
        }
      })
      .exec();

    res.json({ message: 'Machine details updated successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});






// delete machine
const deleteMachineFromUser = asyncHandler(async (req, res) => {
  const { userId, locationId, machineId } = req.params;

  try {
    const user = await User.findById(userId).populate('location');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const location = user.location.find(loc => loc._id.toString() === locationId);
    if (!location) {
      return res.status(404).json({ message: 'Location not found for the user' });
    }

    const machineIndex = location.machines.findIndex(mach => mach._id.toString() === machineId);
    if (machineIndex === -1) {
      return res.status(404).json({ message: 'Machine not found in this location' });
    }

    const deletedMachine = location.machines[machineIndex];
    location.machines.splice(machineIndex, 1);

    await Machine.findByIdAndDelete(machineId); // Remove machine from the database

    await location.save();

    const updatedUser = await User.findById(userId)
      .populate({
        path: 'location',
        populate: {
          path: 'machines',
          model: 'Machine'
        }
      })
      .exec();

    res.json({ message: 'Machine deleted successfully', updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});





// get a machines 
const getMachinesOfUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  try {
    const userWithLocationsAndMachines = await User.findById(userId)
      .populate({
        path: 'location',
        populate: {
          path: 'machines',
          model: 'Machine',
          populate: {
            path: 'employees',
            model: 'Employee'
          }
        }
      })
      .exec();

    if (!userWithLocationsAndMachines) {
      return res.status(404).json({ message: 'User not found' });
    }
    const updatedUser = await User.findById(userId)
        .populate({
          path: 'location',
          populate: {
            path: 'machines',
            model: 'Machine',
            populate: {
              path: 'employees',
              model: 'Employee'
            }
          }
        })
        .exec();

    res.json({ machines: updatedUser.location });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// get location machine detail
const getMachinesByLocationId = asyncHandler(async (req, res) => {
  const { locationId } = req.params; 

  try {
    const location = await Location.findById(locationId).populate('machines').exec();

    if (!location) {
      return res.status(404).json({ message: 'Location not found' });
    }

    const machinesOfLocation = location.machines;

    res.json({ machinesOfLocation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// get location by id
const getMachinebyId = asyncHandler(async (req, res) => {
  try {
    const { machineId,userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const machine = await Machine.findOne({ _id: machineId });
    if (!machine) {
      return res.status(404).json({ message: 'machine not found' });
    }
    if (!user.machines.includes(machineId)) {
      return res.status(403).json({ message: 'machine does not belong to the user' });
    }

    res.json({ machine });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
})


module.exports = { createUser, loginUserCtrl, loginAdmin, getAllUsers, getaUser, deleteaUser, updatedUser, addMachineToUserLocation, updateMachineInUserLocation,
   deleteMachineFromUser, getMachinesOfUser, getMachinebyId, getMachinesByLocationId }
