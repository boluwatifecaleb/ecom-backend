import User from '../models/users.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

export const registerUser = async (req, res) => {
    try {
        const {name, email, password} = req.body;

        const existingUser = await User.findOne({email});
        if (existingUser) {
            return res.status(400).json({ message: "email already in use"});
        }

        const user = await User.create({name, email, password});
        res.status(201).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
        });
    } catch (error) {
        res.status(500).json({
            message: "Server error",
            error: error.message});
    } 
};


export const loginUser = async (req, res) => {
    try {
        const {email, password} = req.body;

        const user = await User.findOne({email});
        if (!user) {
            return res.status(401).json({message: 'Invalid credentials'});
        }
//this checks to see if the password provided by the user matches the hashed password stored in the database. It uses bcrypt's compare function to perform this check. 
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({message: 'Invalid credentials'});
        }

        const token = jwt.sign(
            {id: user._id,
                role: user.role}, 
                process.env.JWT_SECRET, 
// my JWT_EXPIRES_IN is an environment variable that specifies the duration for which 
// the generated JSON Web Token (JWT) will remain valid. It is used in the jwt.sign() function to set the expiration time of the token. The value of process.env.JWT_EXPIRES_IN is typically defined in a .env file or in the environment configuration of the application.
                {expiresIn: process.env.JWT_EXPIRES_IN});
        
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'Production',
            maxAge: 1000 * 60 * 60 * 24,
        });

        res.status(200).json({_id: user._id, 
            name: user.name, 
            email: user.email, 
            role: user.role});
    } catch (error) {
        res.status(500).json({ 
            message: 'server error',
            error: error.message});
    }
};