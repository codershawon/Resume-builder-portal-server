const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const http = require("http");
const { Server } = require("socket.io");
const server = http.createServer(app);
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const port = process.env.PORT || 4000;
//middleware
app.use(cors());
app.use(express.json());
//   comment 


const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

//Start JWT verification
const verifyJWT=(req,res,next)=>{
  const authorization=req.headers.authorization

  if(!authorization){
    return res.status(401).send({error:true, message:"unauthorized access"})
  }
  const token=authorization.split(" ")[1]
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET,(error,decoded)=>{
    if(error){
      return res.status(403).send({error:true, message:"unauthorized access"})
    }
    req.decoded=decoded
    next()
  })
}

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
    const resumeCollection = client
      .db("resumeBuilderPortal")
      .collection("resume");
    const cartsCollection = client
      .db("resumeBuilderPortal")
      .collection("carts"); 
    const paymentCollection = client
      .db("resumeBuilderPortal")
      .collection("payments"); 
    const blogsCollection = client
      .db("resumeBuilderPortal")
      .collection("blogs");
//jwt
    app.post("/jwt",(req,res)=>{
      const user=req?.body
      console.log(user)
      const token=jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,{ expiresIn: "1h"})
      console.log(token)
      res.send({token})
    })

    // socket.io connection
    io.on("connection", (socket) => {
      console.log(`User connected : ${socket.id}`);

      socket.on("send-message", (message) => {
        console.log(message);
        // Broadcast the received message to all the connected user
        io.emit("received-message", message);
      });

      socket.on("disconnect", () => console.log("User disconnected"));
    });

    //user related routes
    //  TODO : add verifyJWT
    app.get("/users", verifyJWT, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post("/users",verifyJWT, async (req, res) => {
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

    //admin
    //  TODO : add verifyJWT
    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded?.email !== email) {
        res.send({ admin: false });
        return;
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === "admin" };
      res.send(result);
    });

    app.patch("/users/admin/:id", async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: "admin",
        },
      };
      const result = await usersCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/users/:email", async (req, res) => {
      console.log(req.params.email);
      const email = req.params.email;
      console.log(email);
      const query = { email: email };
      const result = await usersCollection.findOne(query);
      res.send(result);
      console.log(result);
    });

    app.put("/users/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const options = { upsert: true };
      const updatedUserInfo = req.body;

      const userInfo = {
        $set: {
          phone: updatedUserInfo.phone,
          birthdate: updatedUserInfo.birthdate,
          country: updatedUserInfo.country,
          city: updatedUserInfo.city,
          nationality: updatedUserInfo.nationality,
          name: updatedUserInfo.name,
        },
      };

      try {
        const result = await usersCollection.updateOne(
          filter,
          userInfo,
          options
        );
        res.send(result);
      } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).send("Error updating user");
      }
    });
    app.post("/users/:email/update-profile", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const options = { upsert: true };
      const updatedUserInfo = req.body;

      const userInfo = {
        $set: {
          photoURL: updatedUserInfo.photoURL,
        },
      };

      try {
        const result = await usersCollection.updateOne(
          filter,
          userInfo,
          options
        );
        res.send(result);
      } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).send("Error updating user");
      }
    });


    //blogs
    app.get("/blogs", async (req, res) => {
      const result = await blogsCollection.find().toArray();
      res.send(result);
    });

    app.get("/blogs/:id",  async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const blogData = await blogsCollection.findOne(query);
      res.send(blogData);
    });

    app.post("/blogs", async (req, res) => {
      const newBlog = req.body;
      const result = await blogsCollection.insertOne(newBlog);
      res.send(result);
    });

    app.put('/blogs/:id', async (req, res) => {
      const postId = req.params.id;
      const newComment = req.body;
    
      try {
        const objectId = new ObjectId(postId);
        const result = await blogsCollection.updateOne(
          { _id: objectId },
          { $push: { comments: newComment } }
        );
    
        if (result.matchedCount === 0) {
          return res.status(404).json({ error: 'Blog post not found' });
        }
    
        res.json({ success: true });
      } catch (error) {
        console.error('Error updating comments:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
    

    //user Reviews routes

    app.get("/review", async (req, res) => {
      const result = await reviewCollection.find().toArray();
      res.send(result);
    });
    app.post("/review", async (req, res) => {
      const review = req.body;
      console.log(review);
      const query = { email: review?.email };
      const existingReview = await reviewCollection.findOne(query);
      if (existingReview) {
        return res.send({ message: "user already exists" });
      }

      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });

    app.put("/review/:id", async (req, res) => {
      const id = req.params.id;
      console.log("id", id);
      const newStatus = "approved"; // Set the new status to "approved"
      const filter = { _id: new ObjectId(id) };
      console.log("objectID", filter);
      const updateDoc = {
        $set: {
          status: newStatus,
        },
      };

      try {
        const result = await reviewCollection.updateOne(filter, updateDoc);
        console.log("result", result);
        if (result.modifiedCount > 0) {
          res.json({ success: true, message: "Testimonial status updated successfully." });
        } else {
          res.json({ success: false, message: "Testimonial not found or status not updated." });
        }
      } catch (error) {
        console.error("Error updating testimonial status:", error);
        res.status(500).json({ success: false, message: "Error updating testimonial status." });
      }
    });

    app.delete("/review/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await reviewCollection.deleteOne(query);
      res.send(result);
    });

    app.get("/resume", async (req, res) => {
      const result = await resumeCollection.find().toArray();
      res.send(result);
    });

    // Carts Collection start here

    // cart or buy collection api
    app.get("/carts", verifyJWT, async (req, res) => {
      const email = req.query.email;

      if (!email) {
        res.send([]);
      }

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res
          .status(403)
          .send({ error: true, message: "Forbidden access" });
      }

      const query = { email: email };
      const result = await cartsCollection.find(query).toArray();
      res.send(result);
    });

    // cart collection
    app.post("/carts", async (req, res) => {
      const item = req.body;
      const result = await cartsCollection.insertOne(item);
      res.send(result);
    });

    // cart item delete
    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await cartsCollection.deleteOne(query);
      res.send(result);
    });

    //Get payment api
    app.get("/payment", verifyJWT, async (req, res) => {
      const email = req.query.email;

      if (!email) {
        res.send([]);
      }

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res
          .status(403)
          .send({ error: true, message: "Forbidden access" });
      }

      const query = { email: email };
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/payment/:email",  async (req, res) => {
      console.log(req.params.email);
      const email = req.params.email;
      console.log(email);
      const query = { email: email };
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
      console.log(result);
    });

    //Payment card api

    app.post("/create-payment-intent", async (req, res) => {
      try {
        const { price } = req.body;
        if (!price) {
          return res.send({ message: "Price not valid" });
        }

        const amount = parseInt(price * 100); // Convert to cents
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "usd",
          payment_method_types: ["card"],
        });

        res.json({
          clientSecret: paymentIntent.client_secret,
        });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: "An error occurred" });
      }
    });

    // Payment related api
    app.post("/payment", async (req, res) => {
      const payment = req.body;
      const insertResult = await paymentCollection.insertOne(payment);
      const query = {
        _id: { $in: payment.cartItems.map((id) => new ObjectId(id)) },
      };
      const deleteResult = await cartsCollection.deleteMany(query);
      res.send({ insertResult, deleteResult });
    });

    app.get("/resumeCounts", async (req, res) => {
      try {
        const aggregationPipeline = [
          {
            $group: {
              _id: "$type", // Change from "$profile" to "$type"
              count: { $sum: 1 },
            },
          },
        ];
    
        const result = await resumeCollection.aggregate(aggregationPipeline).toArray();
    
        const profileCounts = {};
        result.forEach((item) => {
          profileCounts[item._id] = item.count;
        });
    
        console.log('Profile Counts:', profileCounts);
        res.status(200).json(profileCounts);
      } catch (error) {
        console.error('Error fetching resume counts:', error);
        res.status(500).json({ error: 'Internal server error' });
      }
    });
    
    app.get("/monthly-sales", async (req, res) => {
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      const pipeline = [
        {
          $match: {
            date: { $gte: oneYearAgo },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$date" },
              month: { $month: "$date" },
              template: "$template",
            },
            count: { $sum: 1 },
          },
        },
        {
          $group: {
            _id: "$_id.year",
            months: {
              $push: {
                month: "$_id.month",
                template: "$_id.template",
                count: "$count",
              },
            },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ];
      const result = await paymentCollection.aggregate(pipeline).toArray();
      res.send(result);
    });

    app.get("/usersHistory", async (req, res) => {
      const result = await paymentCollection.find().toArray();
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

// app.listen(port, () => {
//   console.log(`Resume builder portal server is running on port ${port}`);
// });

server.listen(port, () => {
  console.log(`Resume builder portal server is running on port ${port}`);
});
