// Overview of the application : You might come across a lot of things on the web or anywhere else ,which you might want to visit later , you can store that data on this
// website , so that you might get a reference to visit that later , we also want to add a query or search mechanism so that as the database grows biiger in size ,
// the user can get relevant information. Common search mechanisms that can be used are elastic search and vector embeddings 

import express, { Application, Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import { UserModel , ContentModel , TagModel, LinkModel}  from "./db";
import jwt from "jsonwebtoken";
import { JWT_PASSWORD } from "./config";
import { UserMiddleware } from "./middleware";
import { random } from "./utils";
import cors from "cors";
// Initialize express app
const app: Application = express();
app.use(express.json());
app.use(cors());

// 🔹 Validation Schemas
const usernameSchema = z.string().min(3, "Username should be between 3 and 10 characters").max(10);
const passwordSchema = z.string()
    .min(8, "Password must be between 8 and 20 characters")
    .max(20)
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

const signupSchema = z.object({
    username: usernameSchema,
    password: passwordSchema
});

type SignUpData = z.infer<typeof signupSchema>;

// 🔹 Utility Function to Hash Password
const hashPassword = async (password: string) => {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
};

// 🔹 Define route handler separately
const signupHandler = async (
    req: Request<{}, any, SignUpData>, // {url parameters , response body , request body}
    res: Response
) => {
    try {
        // Validate Input
        const validData: SignUpData = signupSchema.parse(req.body);

        // Check if User Already Exists
        const existingUser = await UserModel.findOne({ username: validData.username });
        if (existingUser) {
            return res.status(403).json({ message: "User already exists with this username" });
        }

        // Hash Password
        const hashedPassword = await hashPassword(validData.password);

        // Save to Database
        await UserModel.create({
            username: validData.username,
            password: hashedPassword
        });

        return res.status(200).json({ message: "Signed up successfully" });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return res.status(411).json({ message: "Error in inputs", errors: error.errors });
        }
        console.error("Server Error:", error);
        return res.status(500).json({ message: "Server error" });
    }
};

// 🔹 Register the route
app.post("/api/v1/signup", signupHandler);

const signinHandler = async (
    req : Request<{} , any , SignUpData>,
    res : Response
) => {

    try{
    const username = req.body.username;
    const password = req.body.password;

    const user = await UserModel.findOne({
        username : username
    })

    if(!user)
    {
        return res.status(403).json({
            message : "No User with this username exists "
        })
    }

    const isMatch = await bcrypt.compare(password , user.password);

    if(!isMatch)
    {
        return res.status(403).json({
            message : "Wrong password entered"
        })
    }

    // If the password matches , we have to generate the JWT_TOKEN for them , so that it can be used for all the authenticated end points in the future 
    const token = jwt.sign({
        userId : user._id
    }, JWT_PASSWORD);

    res.json({
        token : token
    })
}catch{
    res.status(500).json({
      message : "There is an internal server error "
    })
}


}

// signin end point 
app.post("/api/v1/signin" , signinHandler );

/**
 * Helper function to get or create tags.
 */
const getOrCreateTags = async (tags: string[]): Promise<string[]> => {
    return Promise.all(
        tags.map(async (tag) => {
            if (tag.match(/^[0-9a-fA-F]{24}$/)) {
                //If it's already an ObjectId, use it as is.
                return tag;
            }
            // ✅ Otherwise, check if the tag exists, or create it.
            const existingTag = await TagModel.findOneAndUpdate(
                { title: tag },
                {}, //nothing to update
                { new: true, upsert: true, setDefaultsOnInsert: true } //new: true , returns the newly created entry , upsert creates a new field if it doesn't exist and setdefault lets automatic handling of defaults
            );
            return existingTag._id.toString();
        })
    );
};

/**
 * Handler to add content.
 */
export const addContentHandler = async (req: Request, res: Response) => {
    try {
        const userId = req.userId; // ✅ Authenticated user ID
        if (!userId) return res.status(401).json({ message: "Unauthorized" });

        const { link, type, title, tags } = req.body;

        const tagIds = await getOrCreateTags(tags);

    
        const newContent = await ContentModel.create({
            userId,
            link,
            type,
            title,
            tags: tagIds,
        });

        res.status(201).json({ message: "Content added successfully", content: newContent });
    } catch (error : any) {
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    }
};



// Endpoint to add new content 
app.post("/api/v1/content" , UserMiddleware , addContentHandler );


// Endpoint to receive all the content of a user , it should be authenticated through a middleware 

app.get("/api/v1/content" , UserMiddleware , async(req:Request , res:Response) => {
    try{
    const userId = req.userId;
    const userContent = await ContentModel.find({
        userId : userId
    }).populate("tags" , "title");
    if(!userContent)
    {
        return res.json({
            message : "No content for this user"
        })
    }

    res.json({
        content : userContent
    })

}catch{
res.status(501).json({
    message : "Internal server Error"
})
}
})


// Endpoint to delete some content , this endpoint should be authenticated through the user Middleware 
app.delete("/api/v1/content", UserMiddleware, async (req: Request, res: Response) => {
    try {
        const userId = req.userId; // Get user ID from middleware
        const { contentId } = req.body; // Get content ID from request body

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        if (!contentId) {
            return res.status(400).json({ message: "Content ID is required" });
        }

        const result = await ContentModel.deleteOne({ userId, _id: contentId });

        if (result.deletedCount === 0) {
            return res.status(403).json({ message: "You don't own this content or it doesn't exist" });
        }

        res.status(200).json({ message: "Content deleted successfully" });
    } catch (error) {
        console.error("Error deleting content:", error);
        res.status(500).json({ message: "There was an error while deleting your content" });
    }
});


// End point to create a link of my second brain
app.post("/api/v1/brain/share", UserMiddleware, async(req: Request, res: Response) => {
    try {
       const share = req.body.share;
       
       if (share) {
          const existinglink = await LinkModel.findOne({
             userId: req.userId
          });
 
          if (existinglink) {
             return res.json({
                hash: existinglink.hash
             });
          }
 
          const hash = random(10);
          await LinkModel.create({
             userId: req.userId,
             hash: hash
          });
 
          return res.json({
             hash: hash
          });
       } else {
          await LinkModel.deleteOne({
             userId: req.userId
          });
          
          return res.json({
             message: "removed link"
          });
       }
    } catch (error) {
       return res.status(500).json({
          message: "There was some internal server error"
       });
    }
 });
// End point to fetch contents of some one else second brain
// This will be a completely open end point , i.e you don't need to be logged in to access this
app.get("/api/v1/brain/:shareLink" , async (req:Request , res:Response) => {
    const hash = req.params.shareLink;

   const link =  await LinkModel.findOne({
        hash
    })

    if(!link)
    {
        res.status(404).json({
            message : "Sorry Incorrect Url"
        })
        return;
    }
    //If we use sequential database calls instead of referneces , the code will look like this 
    //userId
    const content = await ContentModel.find({
        userId : link.userId
    }).populate("tags","title")

    const user = await UserModel.findOne({
        _id : link.userId
    })

    if(!user) 
    {
        res.status(411).json({
            message : 'user not found , err0r should ideally not come'
        })
        return;
    }

    res.json({
        username : user.username,
        content : content
    })
})



// 🔹 Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
