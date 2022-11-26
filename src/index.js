require('dotenv/config');
const express = require('express');
const cookieParser =require('cookie-parser'); 
const jwt = require('jsonwebtoken');
const { MongoClient } = require('mongodb');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const multer  = require('multer')
const upload = multer({ dest: 'uploads/' })
const { uploadFile,getFileStream } = require('./s3');





const server = express();
server.use(cookieParser());
server.use(express.json());
server.use(express.urlencoded({extended: true}));

function createAccessToken(req,res){

  const userData ={ email: req.body.email}
  const accessToken = jwt.sign(userData,process.env.ACCESS_TOKEN_SECRET);
  return accessToken;
}

async function findUserInDb(req,res){
    const uri = "mongodb://localhost:27017";
    const client = new MongoClient(uri);
    let userFlag;
    try {
      const database = client.db('satyam');
      const coll = database.collection('one');
      const query = { email: req.body.email };
      const user = await coll.findOne(query);
      console.log(user);
      if(user){
        userFlag = true;
        let obj = { ...user,userFlag:userFlag}
        return obj;
      }else{
        userFlag = false; 
        console.log("userFlag is set to false");
        return userFlag;
      }
     }
  finally {
    await client.close();
  }


}

function insertInDb(req,res){
    const uri = "mongodb://localhost:27017";
    const client = new MongoClient(uri);
    let returnAccessToken;
    async function run() {
    try {
      const database = client.db('satyam');
      const coll = database.collection('one');
      const user = req.body;
      returnAccessToken = createAccessToken(req,res);
      const userWithAccessToken = {...user,accessTok:returnAccessToken};
      const result = await coll.insertOne(userWithAccessToken);
      console.log(result);
  }catch(err){
    res.send({ error : `${err.message}`});
  }
  finally {
    await client.close();
  }
}
run().catch(console.dir);
return returnAccessToken;
}

function sendMail(req,res){
    return new Promise(function(resolve,reject){
    var transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        auth: {
          user: 's6387651169@gmail.com',
          pass: 'szdbgeptdjyaamdk'
        }
      });
      
      var mailOptions = {
        from: 's6387651169@gmail.com',
        to: req.body.email,
        subject: 'Successfull Registration',
        text: 'Thanks for registering with us.Hope we will add value in your life'
      };
      
      transporter.sendMail(mailOptions, function(error, info){
        if (error) {
          console.log(error);
          reject(error);
        } else {
          resolve();
          console.log('Email sent: ' + info.response);
        }
      });
})}

function authenticateToken(req,res){
  var authheader = req.headers['authorization']
  var token =authheader && authheader.split(" ")[1]
  if(token == null) return res.sendStatus(401)
  const decode = jwt.verify(token,process.env.ACCESS_TOKEN_SECRET)
  console.log("decode is equal to",decode);
  return decode.email
}

server.post('/register',async(req,res)=>{
    const userPresentFlag=await findUserInDb(req,res);
    if(!userPresentFlag){
        const jwtToken = insertInDb(req,res);
        console.log("jwt token is equal to",jwtToken);
        await sendMail(req,res);
        res.send({status:200,message:"success",jwt_token:jwtToken});
    }else{
        res.send({ message :"already registered"});
    }
    
});

server.post('/login',async(req,res)=>{
      let userPresentFlag = await findUserInDb(req,res);
      if(typeof userPresentFlag === 'object'){
        if(req.body.password == userPresentFlag.password){
            let auth = authenticateToken(req,res);
            if(auth == userPresentFlag.email){
              res.send({
                status:200,
                message:"Success",
                jwt_token: userPresentFlag.accessTok
              })
            }else{
              res.send({
                message:"Not authorized"
              })
            }
        }else{
          res.send({
            message:"Wrong Password"
          })
        }
      }else{
        res.send({
          message:"pls register"
        })
      }
})

server.get('/images/:key',(req,res)=>{
  const key = req.params.key;
  const readStream = getFileStream(key);
  readStream.pipe(res);
})


server.post('/upload', upload.single('image'),async function (req, res) {
      const file = req.file;
      console.log(file);
      const result = await uploadFile(file);
      res.send({
        message: "Success",
        result: result
      })
})



server.listen(process.env.PORT,()=>{
    console.log(`Server listening on ${process.env.PORT}`);
})

