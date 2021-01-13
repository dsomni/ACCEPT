exports.addLesson = async function (Lesson, grade, title, description, tasks, author){
    var number = await Lesson.estimatedDocumentCount().exec()
    await Lesson.insertMany([{
        grade: grade,
        identificator: number,
        title : title,
        description: description,
        tasks: tasks,
        author: author
    }]);
}