const router = require('express').Router();
const User = require("../../models/user");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const {
    registerValidation,
    loginValidation
} = require('../../app/validate');


//REGISTER 
router.post('/register', async (req, res) => {

    //VALIDATION OF DATA 
    const {
        error
    } = registerValidation(req.body);
    if (error) return res.status(400).json({ 'error': error.details[0].message });

    //CHECK IF USER ALREADY EXIST
    const nameExist = await User.findOne({
        name: req.body.name
    });
    if (nameExist) return res.status(400).json({ 'error': 'Username Already Taken' });
    const emailExist = await User.findOne({
        email: req.body.email
    });
    if (emailExist) return res.status(400).json({ 'error': 'Email Already Exists' });

    //HASH PASSWORDS
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(req.body.password, salt);

    //CREATE NEW USER
    const user = new User({
        name: req.body.name,
        email: req.body.email,
        password: hashPassword,
    });
    try {
        const savedUser = await user.save();
        res.status(200).json({ 'message': 'Account Created Successfully' });
    } catch (err) {
        res.status(400).json({ 'error': err });
    }
});

//LOGIN
router.post('/login', async (req, res) => {
    //VALIDATION OF DATA 
    const {
        error
    } = loginValidation(req.body);
    if (error) return res.status(400).json({ 'error': error.details[0].message });
    //CHECK IF EMAIL EXISTS
    const user = await User.findOne({
        email: req.body.email
    });
    if (!user) return res.status(400).json({ 'error': 'Email/Password is wrong!' });
    //CHECK IF PASSWORD IS CORRECT
    const validPass = await bcrypt.compare(req.body.password, user.password);
    if (!validPass) return res.status(400).json({ 'error': 'Email/Password is wrong!' });

    //CREATE AND ASSIGN TOKEN
    const token = jwt.sign({
        _id: user._id
    }, process.env.TOKEN_SECRET);
    res.status(200).json({ 'auth-token': token, 'message': user.name});

});


module.exports = router;