const moment = require("moment");
const express = require("express");
const User = require("../../models/user_model");
const { taskValidation } = require("../../utils/validate");
const verify = require("../../utils/verify-token");

const router = express.Router();


router.get("/get/:id/all-tasks", verify, async (req, res) => {
  let { limit, page, status, prioritize } = req.query;
  const limitData = parseInt(limit);
  const skip = (page - 1) * limit;

  const query = {};
  if (status) {
    query.status = status;
  }
  if (prioritize) {
    query.prioritize = prioritize === "true";
  }

  const projection = {
    tasks: {
      $filter: {
        input: "$tasks",
        as: "task",
        cond: {
          $and: Object.entries(query).map(([key, value]) => {
            return { $eq: [`$$task.${key}`, value] };
          }),
        },
      },
    },
  };

  const tasks = await User.findById(req.params.id, projection)
    .limit(limitData)
    .skip(skip)
    .then((user) => {
      if (!user) {
        return res.status(404).json({ message: "User does not exist" });
      } else if (user.isLocked) {
        return res.status(403).json({ message: "User is locked" });
      } else if (!user.tasks || user.tasks.length === 0) {
        return res.status(200).json({ message: "Tasks are empty" });
      } else {
        return res.status(200).json({ tasks: user.tasks });
      }
    })
    .catch((error) => {
      if (res.headersSent) {
        return;
      }
      return res.status(500).json({ error: error.message });
    });
});
//CREATE NEW OBJECT
router.post("/create/:id/new-task", verify, async (req, res) => {
  //VALIDATION OF DATA
  const { error } = taskValidation(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  //CREATING CONTACT

  const savedUser = await User.findById(req.params.id)
    .then((user) => {
      if (!user) {
        return res.status(404).json({ message: "User does not exists" });
      }

      if (user.isLocked) {
        return res.status(403).json({ message: "User is locked" });
      }

      const newTask = {
        title: req.body.title,
        description: req.body.description,
        due_date: req.body.due_date,
        start_time: req.body.start_time,
        end_time: req.body.end_time,
        prioritize: req.body.prioritize,
        completed: req.body.completed,
        date_time_finished: req.body.date_time_finished,
      };
      user.tasks.push(newTask);
      return user.save();
    })
    .then(() => {
      if (res.headersSent) {
        return;
      }
      return res.status(200).json({ message: "Task added successfully" });
    })
    .catch((error) => {
      if (res.headersSent) {
        return;
      }
      return res.status(500).json({ error: error.message });
    });
});

//UDPATE A SPECIFIC TASKS
router.patch("/update/:id/user-task/:task_id", verify, async (req, res) => {
  //VALIDATION OF DATA
  const { error } = taskValidation(req.body);
  if (error) return res.status(400).json({ error: error.details[0].message });

  User.findById(req.params.id)
    .then(async (user) => {
      if (!user) {
        return res.status(404).json({ message: "User does not exists" });
      }

      if (user.isLocked) {
        return res.status(403).json({ message: "User is locked" });
      }

      const taskIndex = user.tasks.findIndex(
        (task) => task._id.toString() === req.params.task_id
      );

      if (taskIndex === -1) {
        return res.status(404).json({
          error:
            "Cannot Update ID[" +
            req.params.task_id +
            "] does not Exists or has been deleted",
        });
      }

      // check if the new title and description values are already taken by another task of the user
      const titleTaken = user.tasks.some(
        (task) =>
          task.title === req.body.title && task.id !== req.params.task_id
      );
      const descriptionTaken = user.tasks.some(
        (task) =>
          task.description === req.body.description &&
          task.id !== req.params.task_id
      );

      if (titleTaken && descriptionTaken) {
        return res.status(400).json({
          error: "Title or description already taken by another task.",
        });
      }

      const existingTask = user.tasks[taskIndex];
      const checkExisting =
        req.body.title === existingTask.title &&
        req.body.description === existingTask.description &&
        new Date(req.body.due_date).toISOString() ===
          existingTask.due_date.toISOString() &&
        req.body.start_time === existingTask.start_time &&
        req.body.end_time === existingTask.end_time &&
        req.body.prioritize === existingTask.prioritize;

      if (checkExisting) {
        return res
          .status(200)
          .json({ message: "No changes were made to the task" });
      }

      user.tasks[taskIndex].title =
        req.body.title || user.tasks[taskIndex].title;
      user.tasks[taskIndex].description =
        req.body.description || user.tasks[taskIndex].description;
      user.tasks[taskIndex].due_date =
        req.body.due_date || user.tasks[taskIndex].due_date;
      user.tasks[taskIndex].start_time =
        req.body.start_time || user.tasks[taskIndex].start_time;
      user.tasks[taskIndex].end_time =
        req.body.end_time || user.tasks[taskIndex].end_time;
      user.tasks[taskIndex].prioritize =
        req.body.prioritize !== undefined
          ? req.body.prioritize
          : user.tasks[taskIndex].prioritize;

      user.tasks[taskIndex].status =
        req.body.status || user.tasks[taskIndex].status;

      if (typeof req.body.status !== "undefined") {
        user.tasks[taskIndex].date_time_finished =
          req.body.status === "Complete" ? moment().format() : null;
      }

      await user.save();
    })
    .then(() => {
      if (res.headersSent) {
        return;
      }
      return res.status(200).json({
        message: "ID[" + req.params.task_id + "] Updated Successfully",
      });
    })
    .catch((error) => {
      if (res.headersSent) {
        return;
      }
      return res.status(500).json({ error: error.message });
    });
});

//DELETE SPECIFIC Tasks
router.delete("/delete/:id/user-task/:task_id", verify, async (req, res) => {
  const result = await User.findById(req.params.id)
    .then((user) => {
      if (!user) {
        return res.status(404).json({ message: "User does not exists" });
      }

      if (user.isLocked) {
        return res.status(403).json({ message: "User is locked" });
      }

      const taskIndex = user.tasks.findIndex(
        (task) => task._id.toString() === req.params.task_id
      );

      if (taskIndex === -1) {
        return res.status(404).json({
          error:
            "ID[" +
            req.params.task_id +
            "] does not Exists or has been deleted",
        });
      }
      user.tasks.splice(taskIndex, 1);
      return user.save();
    })
    .then(() => {
      if (res.headersSent) {
        return;
      }
      return res.status(200).json({
        message: "ID[" + req.params.task_id + "] Deleted Successfully",
      });
    })
    .catch((error) => {
      if (res.headersSent) {
        return;
      }
      return res.status(500).json({ error: error.message });
    });
});

//GET SPECIFIC Tasks
router.get("/get/:id/user-task/:task_id", verify, async (req, res) => {
  const result = await User.findById(req.params.id)
    .then((user) => {
      if (!user) {
        return res.status(404).json({ message: "User does not exists" });
      }

      if (user.isLocked) {
        return res.status(403).json({ message: "User is locked" });
      }

      const taskIndex = user.tasks.findIndex(
        (task) => task._id.toString() === req.params.task_id
      );

      if (taskIndex === -1) {
        return res.status(404).json({
          error:
            "ID[" +
            req.params.task_id +
            "] does not Exists or has been deleted",
        });
      }
      const task = user.tasks.find(
        (task) => task._id.toString() === req.params.task_id
      );
      return res.status(200).json(task);
    })
    .then(() => {
      if (res.headersSent) {
        return;
      }
      return res.status(200).json({
        tasks: user.tasks,
      });
    })
    .catch((error) => {
      if (res.headersSent) {
        return;
      }
      return res.status(500).json({ error: error.message });
    });
});

module.exports = router;
