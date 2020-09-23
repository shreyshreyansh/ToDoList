//requiring all the necessary modules for the server.
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _ = require("lodash");


//associating the app with express.
const app = express();

//inform the app about the views folder.
app.set('view engine', 'ejs');

//use bodyParser for transfering data from browser to server and urlencoded for form based data.
app.use(bodyParser.urlencoded({extended: true}));

//telling the server to use static folder like css and images folder from public folder.
app.use(express.static("public"));

//connecting my server to the mongodb atlas and also passing some parameters to avoid depreciation warnings.
mongoose.connect("mongodb://<userName>:<password>@cluster0-shard-00-00.ynkro.mongodb.net:27017,cluster0-shard-00-01.ynkro.mongodb.net:27017,cluster0-shard-00-02.ynkro.mongodb.net:27017/todolistDB?ssl=true&replicaSet=atlas-uayq94-shard-0&authSource=admin&retryWrites=true&w=majority", { useNewUrlParser: true , useUnifiedTopology: true, useFindAndModify : false});

//creating the schema for the items collection.
const itemsSchema = new mongoose.Schema({
  name : {
    type : String,
    required : [true , "item is not provided"]
  }
});

//creating model of items collection.
const Item = mongoose.model("Item", itemsSchema);

//creating three items for default items if there are no items present in my collection.
const item1 = new Item({
  name : "Welcome to the ToDoList App"
});
const item2 = new Item({
  name : "Press + to add an item"
});
const item3 = new Item({
  name : "<-- Click to remove the item"
});

//storing those three items in an array.
const defaultItems = [item1, item2, item3];

//creating listSchema for Lists collection which has a name as well as an array of itemSchema.
const listSchema = ({
  name : String,
  items : [itemsSchema]
});

//creating model for the List collections.
const List = mongoose.model("List", listSchema);

//replying to the browser get request at root.
app.get("/", function(req, res) {

  //search for all items in the items collection in todolistDB.
  Item.find(function(err, items){

    //if there is an err log the error.
      if(err)
        console.log(err);
      else{

        //if there is no doc in the items collections add the defaultItems in the collection.
        if(items.length==0){
          Item.insertMany(defaultItems, function(err){
            if(err)
            console.log(err);
            else
            console.log("inserted!");
          });

          //after adding load the page.
          res.redirect("/");
        }else{

          //if there are items already present then no need for adding defaultItems just render the list.ejs with the items int the collections.
          res.render("list", {listTitle: "Today", newListItems: items});
        }
      }
    });
});

//replying to the browser get request at custom root made by the user.
app.get("/:customListName", function(req, res){

  //stored the custom root tilte logged by the the bodyParser.
  const customListName = _.capitalize(req.params.customListName);

  //search for the custom root title in our List collection.
  List.findOne({name : customListName}, function(err, foundList){

    //if there is no error and doc not found then create a doc with name as the customListName and its items as defaultItems.
    if(!err){
      if(!foundList){
        const list = new List({
          name : customListName,
          items : defaultItems
        });

        //save the list in the List collection in our todolistDB.
        list.save();

        //refresh the page with the customListName.
        res.redirect("/" + customListName);
      }else{

        //if found then just render the list.ejs with the list doc.
        res.render("list", {listTitle: foundList.name, newListItems: foundList.items});
      }
    }else{

      //if error found, log the error.
      console.log(err);
    }
  });
});

//replying to the browser if the submit button was clicked.
app.post("/", function(req, res){

  //store the list name and item name so that a new item can be created.
  const listName = req.body.list;
  const itemName = req.body.newItem;
  const item4 = new Item({
    name : itemName
  });

  //if the listName is "Today" then store that doc in the items collection and refresh the page.
  if(listName==="Today"){
    item4.save();
    res.redirect("/");
  }else{

    //if the listName is some custom title then find the list doc in the Lists collection and
    //push the item which we created in the list doc array and then save the list and refresh the page.
    List.findOne({name : listName}, function(err, foundList){
          foundList.items.push(item4);
          foundList.save();
          res.redirect("/" + listName);
    });
  }
});

//responding to the browser is the checkbox was clicked.
app.post("/delete", function(req, res){

  //store the list name and id of the item which was checked.
  const listName = req.body.listName;
  const checkedItemId = req.body.checkbox;

  //if list name is "Today", find the item with id and remove the item and refresh the page.
  if(listName==="Today"){
    Item.findByIdAndRemove({_id : checkedItemId}, function(err){
      if(err)
        console.log(err);
      else
        console.log("deleted!");
    });
    res.redirect("/");
  }else{

    //if list is some custom then first find the list doc in the Lists collection and
    //then use $pull to remove the item from the items array by id.
    List.findOneAndUpdate( {name : listName}, { $pull : { items : { _id : checkedItemId } } }, function(err, foundList){
        if(!err){
          res.redirect("/" + listName);
        }
      });
  }
});


//listening to the dynamic port as well as 3000 for the browser request.
let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}
app.listen(port, function() {
  console.log("Server started successfully!");
});
