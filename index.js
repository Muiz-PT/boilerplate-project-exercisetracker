const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')
const { Schema } = mongoose

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

connectDB();

const userSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
}, {versionKey: false})

const User = mongoose.model('User', userSchema)

const exerciseSchema = new Schema({
  userId: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {versionKey: false})

const Exercise = mongoose.model('Exercise', exerciseSchema)

app.use(express.urlencoded({ extended: false }))
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post("/api/users", async (req, res) => {
  const { username } = req.body

  try {
    const existingUser = await User.findOne({ username })
    
    if (existingUser) {
      return res.send("User already exists").status(400)
    }
    
      const user = new User({ username })
      await user.save()
      return res.json({username: user.username})
  } catch (err) {
    console.log(err)
    return res.send(err).status(500)
  }
})

app.get("/api/users", async (req, res) => {
  const users = await User.find()

  try {
    if (!users) {
      return res.send("No users found").status(404)
    }

    return res.json(users)
  } catch (err) {
    console.log(err)
  }
})

app.post("/api/users/:_id/exercises", async (req, res) => {
  const id = req.params._id;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(id);
    
    if (!user) {
      return res.send("User not found").status(404)
    }

    const exercise = new Exercise({
      userId: id,
      description,
      duration,
      date: date ? new Date(date) : new Date()
    })

    await exercise.save()

    const response = {
      _id: user._id,
      username: user.username,
      date: exercise.date.toDateString(),
      duration: exercise.duration,
      description: exercise.description
    }

    return res.json(response)
    
  } catch (err) {
    console.log(err)
  }
})

app.get("api/users/:_id/logs", async (req, res) => {
  const id = req.params._id;
  const { from, to, limit } = req.query;

  try {
    const user = await User.findById(id);
    
    if (!user) {
      return res.status(400).send("User not found")
    }

    let dateFilter = {};
    if (from) dateFilter.$gte = new Date(from);
    if (to) dateFilter.$lte = new Date(to);

    let query = { userId: id };
    if (from || to) query.date = dateFilter;

    const parsedLimit = parseInt(limit);
    const maxResults = Number.isNaN(parsedLimit) ? undefined : parsedLimit;

    let exercises = await Exercise.find(query)
      .sort({ date: 1 }) // Sort by date (ascending)
      .limit(maxResults);

    const response = {
      _id: user._id,
      username: user.username,
      count: exercises.length,
      log: exercises.map(exercise => ({
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString()
      }))
    }

    return res.json(response)
  } catch (err) {
    console.log(err)
  }
})



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
