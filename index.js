const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken')
const app= express();
require('dotenv').config();
const stripe = require("stripe")(process.env.STRIPE_SECRET);

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// const { query } = require('express');

const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.qloaa9d.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri)
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req,res,next){
    // console.log('token Inside VerifyJWT', req.headers.authorization);
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(401).send('unauthorized')
    }
    const token = authHeader.split(' ')[1];
    // console.log(token);
    jwt.verify(token,process.env.ACCESS_TOKEN, function (err, decoded){
        if(err){
            return res.status(403).send({message: 'forbidden access'})
        }
        req.decoded = decoded;
        next()
    })


}

async function run() {
    try{
        const companyNameCollection = await client.db('bikeGalley').collection('companyName');
        const productsCollection = await client.db('bikeGalley').collection('products');
        const bookingCollection = await client.db('bikeGalley').collection('booking');
        const usersCollection = await client.db('bikeGalley').collection('users');
        const paymentsCollection = await client.db('bikeGalley').collection('payments');

       

        app.get('/companyName', async (req,res) =>{
            const query = {};
            const name = await companyNameCollection.find(query).toArray();
            res.send(name)
        })
        
        app.get('/products', async (req,res) =>{
            const query = {};
            const name = await productsCollection.find(query).toArray();
            res.send(name)
        }) 

        app.post('/products', async (req,res) => {
            const post = req.body;
            const result = await productsCollection.insertOne(post)
            res.send(result)
        })

        app.get('/products/:id',  async (req,res) =>{
            const id = req.params.id
            // console.log(id);
            const query = {Company_name: id}
            const pro = await productsCollection.find(query).toArray()
            res.send(pro)
            // console.log(query)  
        }) 
        app.get('/productBook/:id', async (req,res) =>{
            const id = req.params.id
            // console.log(id);
            const query = {_id: ObjectId(id)}
            const pro = await productsCollection.findOne(query)
            res.send(pro)
            // console.log(query)  
        }) 

        app.post('/booking', async (req,res) => {
            const booking = req.body;

            const result = await bookingCollection.insertOne(booking)
            res.send(result)
            // console.log(result)
        })

        app.get('/myOrders/:id', async (req,res)=>{
            const id = req.params.id;
            const query = {email: id}
            const order = await bookingCollection.find(query).toArray();
            res.send(order)
        })

        app.get('/payment/:id', async (req,res) =>{
            const id = req.params.id;
            const query = { _id: ObjectId(id)}
            const payment =  await bookingCollection.findOne(query);
            res.send(payment)
        })

        app.post('/create-payment-intent', async (req,res) =>{
            const booking = req.body;
            const price = booking.price;
            const amount = price * 100;

            const paymentIntent = await stripe.paymentIntents.create({
                currency: 'usd',
                amount: amount,
                "payment_method_types": [
                    "card"
                ],
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
              });

        })

        app.post('/payments/', async (req,res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.bookingId;
            const filter = {_id: ObjectId(id)}
            const updateDoc = {
                $set: {
                    paid: true,
                    transactionId: payment.transactionId
                }
            }
            const updateResult = await bookingCollection.updateOne(filter,updateDoc)
            res.send(result);
        })


        app.get('/seller/:id', async (req,res) => {
            const id = req.params.id;
            const query = {email: id}
            const seller = await productsCollection.find(query).toArray();
            res.send(seller)

        })
        app.get('/allSeller/:id', async (req,res) =>{
            const id = req.params.id;
            const query = {account_category: id }
            const result = await usersCollection.find(query).toArray();
            res.send(result)


        })
        
        app.post('/users', async (req,res) => {
            const users = req.body;
            const result = await usersCollection.insertOne(users)
            res.send(result)
        })

        app.get('/users',async (req,res) =>{
            const query = {}
            const result = await usersCollection.find(query).toArray()
            res.send(result)
        })

       /*  app.get('/user/role/:email', async (req,res) => {
            const id = req.params.email;
            const query = {email: id}
            const result = await usersCollection.findOne(query);
            res.send(result)
        }) */
        
        app.get('/users/admin/:email', async (req,res) => {
            const email = req.params.email;
            const query = {email};
            const user = await usersCollection.findOne(query)
            res.send({isAdmin: user?.role === 'admin'})
        })

        app.get('/users/seller/:email', async (req,res) => {
            const email = req.params.email;
            const query = {email};
            const user = await usersCollection.findOne(query)
            res.send({isSeller: user?.account_category === 'Seller'})
        })

        /////////////////////////
        app.get('/jwt', async (req,res) =>{
            const email = req.query.email;
            const query = {email:email}
            const user = await usersCollection.findOne(query);
            if(user || !user){
                const token = jwt.sign({email}, process.env.ACCESS_TOKEN, {expiresIn: '1d'})
                return res.send({access_token: token})
            }
            console.log(user)
            res.status(403).send({access_token:''})
        })

        ////////////////////////

        app.put('/users/verify/:id', async (req,res) => {
            const id = req.params.id;
            const filter = {_id: ObjectId(id)};
            const option = {upsert: true}
            const update = {
                $set:{
                    role:'verify',
                }
            }
            const result = await usersCollection.updateOne(filter,update,option)
            res.send(result)
        })


        app.delete('/users/:id', async (req,res) =>{
            const id = req.params.id;
            const filter = {_id: ObjectId(id)};
            const result = await usersCollection.deleteOne(filter)
            res.send(result)
        })
        app.delete('/products/:id', async(req,res) =>{
            const id = req.params.id;
            const filter = {_id: ObjectId(id)}
            const result = await productsCollection.deleteOne(filter)
            res.send(result)
        })
        app.delete('/order/products/:id', async(req,res) =>{
            const id = req.params.id;
            const filter = {_id: ObjectId(id)}
            const result = await bookingCollection.deleteOne(filter)
            res.send(result)
        })



    }
    finally{

    }

}
run().catch(console.log)

app.get('/', async (req,res) =>{
    res.send('bike gallery portal server is running');
})
app.listen(port,() =>{
    console.log(`bike gallery running on ${port}`);
})