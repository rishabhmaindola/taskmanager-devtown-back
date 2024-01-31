const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const axios = require("axios");
const dotenv = require("dotenv");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { Timestamp } = require("mongodb");

dotenv.config();

const app = express();
app.use(express.json());
app.use(cors());

const JWT_KEY = process.env.JWT_KEY;
const PORT = process.env.PORT;

mongoose.connect(process.env.MONGODB_URI);

const taskSchema = new mongoose.Schema(
  {
    user: String,
    title: String,
    description: String,
    dueDate: String
  },
  {
    timestamps: true,
  }
);

const Task = mongoose.model("Task", taskSchema);

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
});

const User = mongoose.model("User", userSchema);

app.get("", (req, res) => {
  res.send("SERVER IS LIVE");
});

app.post("/signup", async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(401).send("User Already Exists");
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hashedPassword });
    await newUser.save();
    console.log(newUser);
    res.status(200).json({ message: "User Created Successfully" });
  } catch (error) {
    console.error("Error creating user:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (passwordMatch) {
      const token = jwt.sign(
        { userId: user._id, email: user.email },
        process.env.JWT_KEY,
        { expiresIn: "2h" }
      );
      return res.status(200).json({ message: "Login successful",token,user});
    } else {
      return res.status(401).json({ message: "Invalid credentials" });
    }
  } catch (error) {
    console.error("Error during login:", error.message);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

app.post("/task", async (req, res) => {
  try {
    const data = req.body;
    await Task.create(data);
    console.log(data);
    res.status(201).send({message: "Task Added Succesfully!"});
  } catch (error) {
    console.log("Error saving task in database", error.message);
  }
});

app.get("/tasks", async (req, res) => {
  try {
    const { userId } = req.query;
    const user = await User.findById(userId);
    if (user) {
      const tasks = await Task.find({ user: userId });
      res.status(200).send(tasks);
    } else {
      res.status(400).json({ message: "User Does not exist" });
    }
  } catch (error) {
    console.log("Error fetching tasks from database", error.message);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

app.put("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updatedTask = await Task.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!updatedTask) {
      return res
        .status(404)
        .json({ message: "Cannot find any task with given ID " });
    }
    res.status(200).json(updatedTask);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTask = await Task.findByIdAndDelete(id);
    if (!deletedTask) {
      return res
        .status(404)
        .json({ message: `Cannot find any task to delete with given ID` });
    }
    res.status(200).json(deletedTask);
  } catch (error) {
    console.error("Error deleting task in database", error.message);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

app.listen(PORT, () => {
  console.log("SERVER IS RUNNING ON PORT 5000");
});
