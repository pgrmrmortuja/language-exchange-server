const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

//middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.dk8ve.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


const client = new MongoClient(uri);

async function run() {
    try {

        // await client.connect();

        const database = client.db('languageDB');

        const languageCollection = database.collection('languages');

        const bookingsCollection = database.collection("bookings");

        const usersCollection = database.collection("users");

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

        app.get('/myTutorials/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
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


        app.get('/myTutors/:email', async (req, res) => {
            const email = req.params.email;
            const filter = { userEmail: email };
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