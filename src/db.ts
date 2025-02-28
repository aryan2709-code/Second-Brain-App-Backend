import mongoose , {model , Mongoose, Schema } from "mongoose";
mongoose.connect("mongodb+srv://youremail.mongodb.net/brainly")

// User schema 
const userSchema = new Schema({
  username : {type : String , required : true , unique : true},
  password : {type : String , required : true}
})
// User Model
const UserModel = model('User' , userSchema);

// Content Schema 
const contentTypes = ['twitter' , 'youtube'];
const contentSchema = new Schema({
  link : {type : String , required : true},
  type : {type : String , enum : contentTypes , required : true},
  title : {type : String , required : true},
  tags : [{type : mongoose.Types.ObjectId , ref : 'Tag'}],
  userId : {type : mongoose.Types.ObjectId , ref : 'User' , required : true}
})
//Content Model
const ContentModel = model('Content' , contentSchema)

// tag Schema
const tagSchema = new Schema({
  title : {type: String , required : true , unique : true}
})
//tag model
const TagModel = model('Tag' , tagSchema)


// link schema
const linkSchema = new Schema({
  hash : {type : String , required : true},
  userId : {type : mongoose.Types.ObjectId , ref : 'User' , required : true, unique : true}
})
// link model
const LinkModel =  model('Link' , linkSchema)

export {UserModel , ContentModel , TagModel , LinkModel}
