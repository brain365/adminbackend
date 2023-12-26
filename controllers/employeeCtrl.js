const genrateToken = require("../config/jwtToken");
const genrateRefreshToken = require("../config/refreshToken");
const Employee = require("../models/employeModel");
const asyncHandler = require("express-async-handler");
const validateMongodbId = require("../utils/validateMongodbid");
const User = require('../models/userModel')



const addEmployeeToAdmin = asyncHandler(async (req, res) => {
    const {_id} = req.admin; // Assuming you extract user ID from the bearer token
  
    try {
      const user = await User.findById(_id);
      if (!user) {
        return res.status(404).json({ message: 'Admin not found' });
      }
      const { firstname, lastname, email, phone, password} = req.body;
      const newEmployee = new Employee({ firstname, lastname, email, phone, password});
      await newEmployee.save();
  
      // Add the new location's ID to the user's profile
      user.employees.push(newEmployee._id);
      await user.save();
  
      res.json({ message: 'New Employee added to user successfully', user });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

const loginEmployeeCtrl = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const findEmployee = await Employee.findOne({ email });

    if (findEmployee) {

        if (await findEmployee.isPasswordMatched(password)) {
            const refreshToken = genrateRefreshToken(findEmployee?._id);
            const updateEmployee = await Employee.findByIdAndUpdate(
                findEmployee.id,
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
                _id: findEmployee?._id,
                firstname: findEmployee?.firstname,
                lastname: findEmployee?.lastname,
                phone: findEmployee?.phone,
                email: findEmployee?.email,
                token: genrateToken(findEmployee?._id),
            });
        } else {
            throw new Error("Invalid Credentials");
        }
    } else {
        throw new Error("Employee not found");
    }
});

// get location by id
const getEmployeebyId = asyncHandler(async (req, res) => {
    try {
      const { employeeId,userId } = req.params;
  
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      const employee = await Employee.findOne({ _id: employeeId });
      if (!employee) {
        return res.status(404).json({ message: 'Employee not found' });
      }
  
      if (!user.employees.includes(employeeId)) {
        return res.status(403).json({ message: 'Emplyoee does not belong to the user' });
      }
  
      res.json({ employee });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  })

// update employee
const updateEmployee = asyncHandler(async (req, res) => {
    const { userId, employeeId } = req.params;
    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'Admin not found' });
      }
  
      const updatedEmployee = await Employee.findOneAndUpdate(
        { _id: employeeId, _id: { $in: user.employees } }, // Ensure machine belongs to the user
        { $set: { firstname: req.body.firstname, lastname: req.body.lastname, email: req.body.email, phone: req.body.phone, password: req.body.password } },
        { new: true }
      );
  
      if (!updatedEmployee) {
        return res.status(404).json({ message: 'Employee not found' });
      }
  
      res.json({ message: 'Employee details updated successfully', employee: updatedEmployee });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

// delete a employee
const deleteEmployee = asyncHandler(async (req, res) => {
    const { userId, employeeId } = req.params;
  
    try {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      const isValidEmplyoeeId = user.employees.some(id => id.toString() === employeeId);
      if (!isValidEmplyoeeId) {
        return res.status(404).json({ message: 'Employee not found for this user' });
      }
  
      user.employees = user.employees.filter(id => id.toString() !== employeeId);
      await user.save();
  
      res.json({ message: 'Employees deleted successfully', user });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });


// search and all Employee
const getAllEmployeesForUser = asyncHandler(async (req, res) => {
  const { userId } = req.params; // Assuming userId is passed in the URL
  const { searchemployee } = req.query;

  try {
    const user = await User.findById(userId).populate({
      path: 'employees',
      select: 'firstname lastname email phone'
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let employees = user.employees;

    if (searchemployee) {
      employees = employees.filter(employees =>
        employees.firstname.toLowerCase().includes(searchemployee?.toLowerCase())
      );
    }

    res.json({ employees });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = { addEmployeeToAdmin, loginEmployeeCtrl, getEmployeebyId, updateEmployee, deleteEmployee, getAllEmployeesForUser }