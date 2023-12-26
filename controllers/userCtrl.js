const genrateToken = require("../config/jwtToken");
const User = require("../models/userModel");
const asyncHandler = require("express-async-handler");
const validateMongodbId = require("../utils/validateMongodbid");
const genrateRefreshToken = require("../config/refreshToken");
const Location = require('../models/locationModel')
const Machine = require('../models/machineModel')
const jwt = require("jsonwebtoken");
const crypto = require("crypto");


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
    const getaUser = await User.findById(id).populate("location").populate("machines").populate("employees");
    if (getaUser) {
      const numofmachines = getaUser.machines.length;
      getaUser.numofmachines = numofmachines;
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
const addMachineToUser = asyncHandler(async (req, res) => {
  const {_id} = req.admin; // Assuming you extract user ID from the bearer token

  try {
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Create a new machine using the Machine model
    const { machineName, serialNumber } = req.body;
    const newMachine = new Machine({ machineName, serialNumber });
    await newMachine.save();

    // Add the new machine's ID to the user's profile
    user.machines.push(newMachine._id);
    (await user.save()).populate();

    res.json({ message: 'New machine added to user successfully', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// update machine
const updateMachineForUser = asyncHandler(async (req, res) => {
  const { userId, machineId } = req.params;

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const updatedMachine = await Machine.findOneAndUpdate(
      { _id: machineId, _id: { $in: user.machines } }, // Ensure machine belongs to the user
      { $set: { machineName: req.body.machineName, serialNumber: req.body.serialNumber } },
      { new: true }
    );

    if (!updatedMachine) {
      return res.status(404).json({ message: 'Machine not found for this user' });
    }

    res.json({ message: 'Machine details updated successfully', machine: updatedMachine });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// delete machine
const deleteMachineFromUser = asyncHandler(async (req, res) => {
  const { userId, machineId } = req.params; // Assuming userId and machineId are passed in the URL

  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const isValidMachineId = user.machines.some(id => id.toString() === machineId);
    if (!isValidMachineId) {
      return res.status(404).json({ message: 'Machine not found for this user' });
    }

    user.machines = user.machines.filter(id => id.toString() !== machineId);
    await user.save();

    res.json({ message: 'Machine deleted successfully', user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// get a machines 
const getMachinesOfUser = asyncHandler(async (req, res) => {
  const { userId } = req.params; // Assuming userId is passed in the URL

  try {
    const user = await User.findById(userId).populate('machines');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ machines: user.machines });
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

    // Check if the location belongs to the user
    if (!user.machines.includes(machineId)) {
      return res.status(403).json({ message: 'machine does not belong to the user' });
    }

    res.json({ machine });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
})


module.exports = { createUser, loginUserCtrl, loginAdmin, getAllUsers, getaUser, deleteaUser, updatedUser, addMachineToUser, updateMachineForUser,
   deleteMachineFromUser, getMachinesOfUser, getMachinebyId }
