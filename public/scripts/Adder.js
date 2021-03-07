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

exports.addTask = async function (Task, title, statement, examples, tests, topic, grade, hint, author){
    var number = await Task.estimatedDocumentCount().exec()
    await Task.insertMany([{
        grade: grade,
        identificator: number,
        title : title,
        statement: statement,
        examples: examples,
        tests: tests,
        topic: topic,
        hint: hint,
        author: author
    }]);
}
exports.addTournament = async function (Tournament, title, description, tasks, author, whenStarts, whenEnds, participants) {
    var number = await Tournament.estimatedDocumentCount().exec()
    let tournament = {
        identificator: number,
        title: title,
        description: description,
        tasks: tasks,
        author: author,
        participants: participants,
        whenStarts: whenStarts,
        whenEnds: whenEnds,
        isBegan: false,
        isEnded: false
    }
    await Tournament.insertMany([tournament]);
}

