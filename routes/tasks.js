const express = require('express');
const Task = require('../models/Task'); // Import Task model

const router = express.Router();

// Create a Task
router.post('/', async (req, res) => {
  try {
    const { title, startTime, endTime, priority, status } = req.body;

    // Validation
    if (!title || !startTime || !endTime || !priority || !status) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const newTask = new Task({ title, startTime, endTime, priority, status });
    await newTask.save();
    res.status(201).json(newTask);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task.' });
  }
});

// Get All Tasks with Filtering and Sorting
router.get('/', async (req, res) => {
  try {
    const { priority, status, sortBy } = req.query;

    console.log('Received query:', req.query); // Debugging log
    const filter = {};
    if (priority) filter.priority = priority;
    if (status) filter.status = status;

    const tasks = await Task.find(filter).sort({ [sortBy || 'startTime']: 1 });
    console.log('Tasks fetched:', tasks); // Debugging log
    res.status(200).json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error); // Debugging log
    res.status(500).json({ error: 'Failed to fetch tasks.' });
  }
});

// Update a Task
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, startTime, endTime, priority, status } = req.body;

    const updatedTask = await Task.findByIdAndUpdate(
      id,
      { title, startTime, endTime, priority, status },
      { new: true }
    );

    if (!updatedTask) return res.status(404).json({ error: 'Task not found.' });

    res.status(200).json(updatedTask);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task.' });
  }
});

// Delete a Task
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const deletedTask = await Task.findByIdAndDelete(id);
    if (!deletedTask) return res.status(404).json({ error: 'Task not found.' });

    res.status(200).json({ message: 'Task deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task.' });
  }
});

// Get Statistics
router.get('/stats', async (req, res) => {
  try {
    const tasks = await Task.find();

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((task) => task.status === 'Finished');
    const pendingTasks = tasks.filter((task) => task.status === 'Pending');

    const completedPercentage = totalTasks > 0 ? (completedTasks.length / totalTasks) * 100 : 0;
    const pendingPercentage = totalTasks > 0 ? (pendingTasks.length / totalTasks) * 100 : 0;

    // Time stats for pending tasks
    const timeStats = pendingTasks.reduce(
      (acc, task) => {
        const currentTime = new Date();
        const startTime = new Date(task.startTime);
        const endTime = new Date(task.endTime);

        if (startTime.getTime() > 0 && endTime.getTime() > 0) {
          const timeLapsed = Math.max(0, (currentTime - startTime) / (1000 * 60 * 60)); // hours
          const balanceTime = Math.max(0, (endTime - currentTime) / (1000 * 60 * 60)); // hours

          acc.timeLapsed += timeLapsed;
          acc.balanceTime += balanceTime;
        }

        return acc;
      },
      { timeLapsed: 0, balanceTime: 0 }
    );

    // Calculate average completion time for completed tasks
    const averageCompletionTime =
      completedTasks.length > 0
        ? completedTasks.reduce((acc, task) => {
            const start = new Date(task.startTime);
            const end = new Date(task.endTime);
            return acc + (end - start) / (1000 * 60 * 60); // hours
          }, 0) / completedTasks.length
        : 0;

    res.status(200).json({
      totalTasks,
      completedPercentage,
      pendingPercentage,
      ...timeStats,
      averageCompletionTime,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch statistics.' });
  }
});

module.exports = router;
