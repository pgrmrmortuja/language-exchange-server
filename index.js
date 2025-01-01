const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

//middleware
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const verifyToken = (req, res, next) => {
    const token = req.cookies.token;
    // console.log('token inside the verifyToken', token);

    if (!token) {
        return res.status(401).send({ message: 'unauthorized access' });
    }

    //verify token
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' });
        }

        req.user = decoded;

        next();
    })

}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dk8ve.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


const client = new MongoClient(uri);

async function run() {
    try {

        // await client.connect();

        const database = client.db('languageDB');

        const languageCollection = database.collection('languages');

        const bookingsCollection = database.collection("bookings");

        const usersCollection = database.collection("users");

        //auth related APIs
        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: '10h'
            });

            res
                .cookie('token', token, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
                })
                .send({ success: true })
        });

        app.post('/logout', (req, res) => {
            res
                .clearCookie('token', {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
                })
                .send({ success: true })
        })

        //tutorials api's=============================
        app.get('/tutorials', async (req, res) => {
            const cursor = languageCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/tutorials-limited', async (req, res) => {
            const limit = parseInt(req.query.limit) || 6;
            const cursor = languageCollection.find().limit(limit);
            const result = await cursor.toArray();
            res.send(result);
        });

        app.get('/tutorials/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await languageCollection.findOne(query);
            res.send(result);
        })

        app.get('/tutors', async (req, res) => {

            console.log("Fetching tutors...");
            const tutors = await languageCollection.distinct("username");

            if (tutors.length > 0) {
                console.log("Tutors fetched:", tutors);
                res.send(tutors);
            } else {
                res.status(404).send({ message: 'No tutors found' });
            }

        });


        app.get('/categories', async (req, res) => {

            console.log("Fetching categories...");
            const categories = await languageCollection.distinct("language");

            if (categories.length > 0) {
                console.log("Categories fetched:", categories);
                res.send(categories);
            } else {
                res.status(404).send({ message: 'No categories found' });
            }

        });


        app.get('/categories/:language', async (req, res) => {
            const language = req.params.language;
            const filter = { language: language };
            const result = await languageCollection.find(filter).toArray();
            res.send(result);
        })

        app.get('/myTutorials/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };

            //token email !== query email
            if (req.user.email !== req.params.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const result = await languageCollection.find(filter).toArray();
            res.send(result);
        })



        app.post('/tutorials', async (req, res) => {
            const newTutor = req.body;
            console.log(newTutor);

            const result = await languageCollection.insertOne(newTutor);
            res.send(result);
        })

        app.put('/tutorials/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const update = req.body;
            const tutorial = {
                $set: {
                    photo: update.photo,
                    language: update.language,
                    description: update.description,
                    price: update.price,

                }
            }

            const result = await languageCollection.updateOne(filter, tutorial, options);
            res.send(result);
        })


        app.get('/review/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };

            const tutor = await languageCollection.findOne(filter);

            if (!tutor) {
                return res.status(404).send({ message: 'Tutor not found!' });
            }

            res.send(tutor);
        });



        app.patch('/review/:id', async (req, res) => {
            const id = req.params.id;
            const { increment } = req.body;

            const tutorFilter = { _id: new ObjectId(id) };
            const bookingFilter = { tutorId: id };

            try {

                const languageUpdate = await languageCollection.updateOne(
                    tutorFilter,
                    { $inc: { review: increment || 1 } }
                );

                const bookingUpdate = await bookingsCollection.updateMany(
                    bookingFilter,
                    { $inc: { review: increment || 1 } }
                );

                if (languageUpdate.modifiedCount > 0 || bookingUpdate.modifiedCount > 0) {
                    res.send({
                        message: 'Review updated successfully!',
                        languageUpdated: languageUpdate.modifiedCount,
                        bookingsUpdated: bookingUpdate.modifiedCount
                    });
                } else {
                    res.status(404).send({ message: 'Tutor not found or review not updated!' });
                }
            } catch (error) {
                console.error(error);
                res.status(500).send({ message: 'Internal server error!' });
            }
        });





        app.delete('/tutorials/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await languageCollection.deleteOne(query);
            res.send(result);
        })



        //booking api's=================================

        app.get('/booked-tutors', async (req, res) => {
            const cursor = bookingsCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })


        app.get('/myTutors/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const filter = { userEmail: email };

            //token email !== query email
            if(req.user.email !== req.params.email){
                return res.status(403).send({message: 'forbidden access'})
            }

            const result = await bookingsCollection.find(filter).toArray();
            res.send(result);
        })


        app.post('/booked-tutors', async (req, res) => {
            const newTutor = req.body;
            console.log(newTutor);

            const result = await bookingsCollection.insertOne(newTutor);
            res.send(result);
        })


        //user api's================================
        app.get('/users', async (req, res) => {
            const cursor = usersCollection.find();
            const result = await cursor.toArray();
            res.send(result);
        })


        app.post('/users', async (req, res) => {
            const newUser = req.body;
            console.log('creating new user', newUser);
            const result = await usersCollection.insertOne(newUser);
            res.send(result);
        })




        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {

        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Language Exchange server is running.')
})

app.listen(port, () => {
    console.log(`Language Exchange Server is running on port: ${port}`);
})