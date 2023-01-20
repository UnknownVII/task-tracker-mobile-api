const router = require("express").Router();
const Objects = require("../../models/object");
const verify = require("../../app/verify-token");

const { objectValidation } = require("../../app/validate");

//GET ALL OBJECTS with Query of limit and page
router.get("/all-objects", verify, async (req, res) => {
  let { limit, page } = req.query;
  const limitData = parseInt(limit);
  const skip = (page - 1) * limit;
  try {
    const tasks = await Objects.find().limit(limitData).skip(skip);
    if (tasks != 0) {
      res.json({ page: page, limit: limit, tasks });
    } else {
      return res.status(400).json({ error: "DB is empty" });
    }
  } catch (err) {
    res.status(400).json({ message: err });
  }
});

//CREATE NEW OBJECT
router.post("/new", verify, async (req, res) => {
  //VALIDATION OF DATA
  const { error } = objectValidation(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  //CHECK IF OBJECT ALREADY EXIST
  const objectExists = await Objects.findOne({
    text: req.body.text,
    day: req.body.day,
    reminder: req.body.reminder,
  });
  if (objectExists)
    return res.status(400).json({ error: "Object Already Exists" });

  //CREATING CONTACT
  const object = new Objects({
    text: req.body.text,
    day: req.body.day,
    reminder: req.body.reminder,
  });
  try {
    const savedUser = await object.save();
    res.send(savedUser);
  } catch (err) {
    res.status(400).send(err);
  }
});

//DELETE SPECIFIC OBJECTS

router.delete("/delete/:id", verify, async (req, res) => {
  const result = await Objects.findByIdAndDelete({
    _id: req.params.id,
  });
  if (result != null) {
    return res
      .status(200)
      .json({ _id: req.params.id, message: "Deleted Successfully" });
  } else {
    return res.status(400).json({
      error: "ID[" + req.params.id + "]: does not Exists or has been deleted",
    });
  }
});

//GET A SPECIFIC OBJECT
router.get("/get/:id", verify, async (req, res) => {
  const q = await Objects.findById({
    _id: req.params.id,
  });
  res.json(q);
});

//UDPATE A SPECIFIC OBJECT
router.patch("/update/:id", verify, async (req, res) => {
  //VALIDATION OF DATA
  //   const { error } = objectValidation(req.body);
  //   if (error) return res.status(400).json({ error: error.details[0].message });

  //CHECK IF OBJECT WILL BE DUPLICATED
  const objectExist = await Objects.findOne({
    text: req.body.text,
    day: req.body.day,
    reminder: req.body.reminder,
    _id: {
      $ne: req.params.id,
    },
  });

  if (objectExist)
    return res.status(400).json({ error: "Object will be duplicated" });

  //UPDATING CONTACT
  try {
    const patch = await Objects.updateOne(
      {
        _id: req.params.id,
      },
      {
        $set: {
          text: req.body.text,
          day: req.body.day,
          reminder: req.body.reminder,
        },
      }
    );
    res.json({ message: "Object ID[" + req.params.id + "] Updated" });
  } catch (err) {
    res.status(400).json({ error: err });
  }
});

module.exports = router;
