const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion } = require("mongodb");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());
console.log(process.env.ACCESS_TOKEN_SECRET)

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.5abjn4e.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server    (optional starting in v4.7)
    // await client.connect();

    //commented by meem
    // Connect the client to the server	(optional starting in v4.7)

    // user collection
    const usersCollection = client
      .db("resumeBuilderPortal")
      .collection("users");
    const reviewCollection = client
      .db("resumeBuilderPortal")
      .collection("review");

  //jwt
  app.post("/jwt",(req,res)=>{
    const user=req.body
    console.log(user)
    const token=jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{ expiresIn: 5 })
    console.log(token)
    res.send({token})
  })

    //user related routes

    app.get("/users", async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      console.log(user);
      const query = { email: user?.email };
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists" });
      }

      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    //user Reviews routes
    app.get("/review", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });
    app.post("/review", async (req, res) => {
      const review = req.body;
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });

    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Resume builder portal server is running");
});

app.listen(port, () => {
  console.log(`Resume builder portal server is running on port ${port}`);
});

