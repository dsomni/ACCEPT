exports.addLesson = async function (Lesson, grade, title, description, tasks, author){
    var number = await Lesson.estimatedDocumentCount().exec()
    let lesson = {
        grade: grade,
        identificator: number,
        title : title,
        description: description,
        tasks: tasks,
        author: author
    }
    await Lesson.insertMany([lesson]);
}

exports.addNews = async function (News, title, text, reference, author){
    var number = await News.estimatedDocumentCount().exec()
    new_news = {
        identificator: number,
        title : title,
        text: text,
        reference: reference,
        date :  Date.now().toString(),
        author: author
    }
    await News.insertMany([new_news]);
    return new_news
}

exports.addTask = async function (Task, title, statement, examples, tests, topic, grade, author){
    var number = await Task.estimatedDocumentCount().exec()
    await Task.insertMany([{
        grade: grade,
        identificator: number,
        title : title,
        statement: statement,
        examples: examples,
        tests: tests,
        topic: topic,
        author: author
    }]);
}


