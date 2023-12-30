const genrateToken = require("../config/jwtToken");
const genrateRefreshToken = require("../config/refreshToken");
const Employee = require("../models/employeModel");
const asyncHandler = require("express-async-handler");
const validateMongodbId = require("../utils/validateMongodbid");
const User = require('../models/userModel')



const addEmployeeToAdmin = asyncHandler(async (req, res) => {
  try {
    const {userId} = req.params; // Extract userId from the request params
    const {
      firstname,
      lastname,
      phone,
      email,
      address,
      password
    } = req.body; // Assuming the request contains these fields in JSON format

    // Create a new Employee instance using the Employee model
    const newEmployee = new Employee({
      firstname,
      lastname,
      phone,
      email,
      address,
      password
    });

    // Save the new employee to the database
    await newEmployee.save();

    // Find the user by userId and push the newly created employee's ID into the 'employees' array
    const user = await User.findByIdAndUpdate(
      userId,
      { $push: { employees: newEmployee._id } }, // Add the employee's ID to the 'employees' array
      { new: true }
    );

    res.status(201).json({ message: 'Employee created and added to the user', user });
  } catch (err) {
    res.status(500).json({ message: 'Failed to add employee to the user', error: err.message });
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
      const updatedEmployee = await Employee.findByIdAndUpdate(
          employeeId,
          {
              $set: {
                  firstname: req.body.firstname,
                  lastname: req.body.lastname,
                  address: req.body.address,
                  phone: req.body.phone,
                  password: req.body.password
              }
          },
          { new: true }
      );

      if (!updatedEmployee) {
          return res.status(404).json({ message: 'Employee not found' });
      }

      // Check if the updated employee ID belongs to the specified user
      const user = await User.findOne({ _id: userId, employees: employeeId });
      if (!user) {
          return res.status(404).json({ message: 'Employee does not belong to the user' });
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
  const { userId } = req.params;
  const { searchEmployee } = req.query;

  try {
    const user = await User.findById(userId).populate('employees');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let employees = user.employees;

    if (searchEmployee) {
      employees = employees.filter(employee =>
        employee.firstname.toLowerCase().includes(searchEmployee.toLowerCase())
      );
    }

    res.json({ employees });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



module.exports = { addEmployeeToAdmin, loginEmployeeCtrl, getEmployeebyId, updateEmployee, deleteEmployee, getAllEmployeesForUser }