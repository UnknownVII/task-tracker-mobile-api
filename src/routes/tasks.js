const router = require("express").Router();
const Tasks = require("../../models/tasks_model");
const verify = require("../../app/verify-token");

const { taskValidation } = require("../../app/validate");

//GET ALL Tasks with Query of limit and page
router.get("/all-tasks", verify, async (req, res) => {
  let { limit, page } = req.query;
  const limitData = parseInt(limit);
  const skip = (page - 1) * limit;
  try {
    const tasks = await Tasks.find().limit(limitData).skip(skip);
    if (tasks != 0) {
      res.json({ tasks });
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
  const { error } = taskValidation(req.body);
  if (error) return res.status(400).send(error.details[0].message);

  //CHECK IF OBJECT ALREADY EXIST
  // const objectExists = await Tasks.findOne({
  //   first_name: req.body.first_name,
  //   last_name: req.body.last_name,
  // });
  // if (objectExists)
  //   return res.status(400).json({ error: "Object Already Exists" });

  //CREATING CONTACT

  const object = new Tasks({
    title: req.body.title,
    description: req.body.description,
    due_date: req.body.due_date,
    start_time: req.body.start_time,
    end_time: req.body.end_time,
    prioritize: req.body.prioritize,
    completed: req.body.completed,
    date_finished: req.body.date_finished,
    time_finished: req.body.time_finished,
  });

  try {
    const savedUser = await object.save();
    res.send(savedUser);
  } catch (err) {
    res.status(400).send(err);
  }
});

//DELETE SPECIFIC Tasks

router.delete("/delete/:id", verify, async (req, res) => {
  const result = await Tasks.findByIdAndDelete({
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
  const result = await Tasks.findById({
    _id: req.params.id,
  });
  if (result != null) {
    return res.status(200).json(result);
  } else {
    return res.status(400).json({
      error: "ID[" + req.params.id + "]: does not Exists or has been deleted",
    });
  }
});

//UDPATE A SPECIFIC OBJECT
router.patch("/update/:id", verify, async (req, res) => {
  //VALIDATION OF DATA
  //   const { error } = objectValidation(req.body);
  //   if (error) return res.status(400).json({ error: error.details[0].message });

  //CHECK IF OBJECT WILL BE DUPLICATED
  const objectExist = await Tasks.findOne({
    title: req.body.title,
    description: req.body.description,
    due_date: req.body.due_date,
    start_time: req.body.start_time,
    end_time: req.body.end_time,
    prioritize: req.body.prioritize,
    completed: req.body.completed,
    date_finished: req.body.date_finished,
    time_finished: req.body.time_finished,
    _id: {
      $ne: req.params.id,
    },
  });

  if (objectExist)
    return res
      .status(400)
      .json({ error: "Task with the same values already exists" });

  //UPDATING CONTACT
  try {
    const patch = await Tasks.updateOne(
      {
        _id: req.params.id,
      },
      {
        $set: {
          title: req.body.title,
          description: req.body.description,
          due_date: req.body.due_date,
          start_time: req.body.start_time,
          end_time: req.body.end_time,
          prioritize: req.body.prioritize,
          completed: req.body.completed,
          date_finished: req.body.date_finished,
          time_finished: req.body.time_finished,
        },
      }
    );
    res.json({ message: "Object ID[" + req.params.id + "] Updated" });
  } catch (err) {
    res.status(400).json({ error: err });
  }
});

module.exports = router;
