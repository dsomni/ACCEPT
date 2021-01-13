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

//addTask("Название","Условие",["Пример"],["Тест"],"Тема","Автор")