var TaskModel = require('../models/task_model');

var TaskCollection = Backbone.Collection.extend({
    model: TaskModel
});

module.exports = TaskCollection;