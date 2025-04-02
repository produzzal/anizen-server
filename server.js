require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
app.use(cors());
app.use(express.json());

const mongoURI = process.env.MONGO_URI;
const client = new MongoClient(mongoURI);
let db, animeCollection, usersCollection;

// Establish MongoDB connection
async function connectDB() {
  try {
    await client.connect();
    db = client.db("animeDB"); // Your DB name
    animeCollection = db.collection("animes"); // Your anime collection name
    usersCollection = db.collection("users"); // Your users collection name
    console.log("✅ Connected to MongoDB!");

    // After connecting to DB, insert the admin user
    await insertUser();
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
  }
}

// Insert admin user into DB (only once)
async function insertUser() {
  try {
    const admin = {
      user: process.env.USER,
      password: process.env.PASSWORD,
      role: process.env.ROLE,
    };

    const existingUser = await usersCollection.findOne({ user: admin.user });

    if (!existingUser) {
      await usersCollection.insertOne(admin);
      console.log("Admin user added successfully!");
    } else {
      console.log("Admin user already exists!");
    }
  } catch (err) {
    console.error("Error inserting user:", err);
  }
}

// Connect to the database on startup
connectDB();

// Sample route for testing server
app.get("/", (req, res) => {
  res.send("Server is working fine!");
});

// 👉 Login route
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  try {
    // Find user by email
    const user = await usersCollection.findOne({ user: email });

    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // Check if the password matches (plaintext comparison)
    if (user.password !== password) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // If credentials are correct, send back user email and role
    res.status(200).json({
      message: "Login successful",
      user: {
        email: user.user,
        role: user.role,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/add-user", async (req, res) => {
  const { user, password, role } = req.body;

  // Basic validation
  if (!user || !password || !role) {
    return res.status(400).json({ error: "All fields are required!" });
  }

  try {
    // Check if the user already exists
    const existingUser = await usersCollection.findOne({ user });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists!" });
    }

    // Create new user
    const newUser = {
      user,
      password,
      role,
    };

    // Insert the new user into the database
    await usersCollection.insertOne(newUser);

    // Respond with success message
    res.status(201).json({ message: "User added successfully!" });
  } catch (err) {
    console.error("Error adding user:", err);
    res.status(500).json({ error: "An error occurred while adding the user" });
  }
});

// 👉 Add a new anime
app.post("/api/anime", async (req, res) => {
  try {
    const anime = req.body;
    const result = await animeCollection.insertOne(anime);
    res.json({ message: "Anime added!", id: result.insertedId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 👉 Get all animes
app.get("/api/anime", async (req, res) => {
  try {
    const animes = await animeCollection.find().toArray();
    res.json(animes);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 👉 Get a single anime by ID
app.get("/api/anime/:id", async (req, res) => {
  try {
    const anime = await animeCollection.findOne({
      _id: new ObjectId(req.params.id),
    });
    if (!anime) return res.status(404).json({ error: "Anime not found!" });
    res.json(anime);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 👉 Update an anime
app.patch("/api/anime/:id", async (req, res) => {
  try {
    // Validate ObjectId
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: "Invalid ObjectId format" });
    }

    // Log the incoming data for debugging
    const updatedAnime = req.body;
    console.log("Update data:", updatedAnime);

    // Perform the update
    const result = await animeCollection.updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updatedAnime }
    );
    console.log("Update result:", result);

    // Check if any documents were modified
    if (result.modifiedCount === 0) {
      return res
        .status(404)
        .json({ message: "No anime found or no changes made!" });
    }

    // Return the success message
    res.json({
      message: "Anime updated successfully!",
      modified: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error updating anime:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// 👉 Delete an anime

app.delete("/api/anime/:id", async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: "Invalid ObjectId format" });
  }

  try {
    const result = await animeCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Anime not found!" });
    }

    res.json({ message: "Anime deleted successfully!" });
  } catch (error) {
    console.error("Error deleting anime:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
