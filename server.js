const bodyParser = require('body-parser');
const express = require('express');
const dbConnect = require('./config/dbConnect');
const app = express();
const cors = require('cors');
const dotenv = require('dotenv').config();
const PORT = process.env.PORT || 4000 ;
const authRouter = require("./routes/authRoute")
const locationRouter = require('./routes/locationRoute')
const { notFound, errorHandler } = require('./middlerwares/errorHandlers');
const cookieParser = require('cookie-parser');
dbConnect();

app.use(cors({
    origin: ["*"],
     methods:["POST", "GET", "DELETE"],
     credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));
app.use(cookieParser());


app.use('/api/user', authRouter);
app.use('/api/location', locationRouter)


app.use(notFound);
app.use(errorHandler);


app.listen(PORT,'192.168.29.98', () => {
    console.log(`Server is starting on ${PORT}`)
});