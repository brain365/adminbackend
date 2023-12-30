const express = require('express');

const { employeeMiddleware, isAdmin, authMiddleware } = require('../middlerwares/authMiddleware');
const { addEmployeeToAdmin, loginEmployeeCtrl, getEmployeebyId, updateEmployee, deleteEmployee, getAllEmployeesForUser } = require('../controllers/employeeCtrl');
const router = express.Router();


router.get('/:userId', authMiddleware, getAllEmployeesForUser)

router.post('/register/:userId',authMiddleware, addEmployeeToAdmin);
router.post('/login', loginEmployeeCtrl);
router.get('/:userId/:employeeId', authMiddleware, getEmployeebyId)

router.put('/edit-employee/:userId/employee/:employeeId', authMiddleware, updateEmployee)

router.delete('/delete/:userId/:employeeId',authMiddleware, deleteEmployee)


module.exports = router;    