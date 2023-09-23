const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
require("dotenv").config();
const stripe = require("stripe")(process.env.PAYMENT_SECRET_KEY);
const port = process.env.PORT || 4000;

//middleware
app.use(cors());
app.use(express.json());

//Start JWT verification
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }
  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

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
      .collection("carts"); //Created by Kabir
    const paymentCollection = client
      .db("resumeBuilderPortal")
      .collection("payments"); //Created by Kabir
    const blogsCollection = client
      .db("resumeBuilderPortal")
      .collection("blogs");
   
    //jwt
    app.post("/jwt", (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "10h",
      });
      console.log(token);
      res.send({ token });
    });

   
    //user related routes
    //  TODO : add verifyJWT
    app.get("/users", verifyJWT, async (req, res) => {
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

    app.get("/blogs/:id", async (req, res) => {
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
      const aggregationPipeline = [
        {
          $group: {
            _id: "$profile",
            count: { $sum: 1 },
          },
        },
      ];
      const result = await resumeCollection
        .aggregate(aggregationPipeline)
        .toArray();

      const profileCounts = {};
      result.forEach((item) => {
        profileCounts[item._id] = item.count;
      });
      res.send(profileCounts);
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

app.listen(port, () => {
  console.log(`Resume builder portal server is running on port ${port}`);
});
