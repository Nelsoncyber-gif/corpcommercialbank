const express = require('express');
const router = express.Router();

const { protect, adminOnly } = require('../middleware/auth');

const {
  getAllUsers,
  getAllTransactions,
  freezeAccount,
  unfreezeAccount,
  checkAccountStatus,
  getUserAccounts,
  deleteUser  // ADD THIS
} = require('../controllers/adminController');



router.get('/users', protect, adminOnly, getAllUsers);

router.get('/user-accounts/:userId', protect, adminOnly, getUserAccounts);


router.get('/transactions', protect, adminOnly, getAllTransactions);

router.get('/status/:accountId', protect, adminOnly, checkAccountStatus);

router.post('/freeze', protect, adminOnly, freezeAccount);

router.post('/unfreeze', protect, adminOnly, unfreezeAccount);

router.delete('/delete-user', protect, adminOnly, deleteUser);  // ADD THIS


module.exports = router;
