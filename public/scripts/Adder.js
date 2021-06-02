

exports.addLesson = async function (Lesson, grade, title, description, tasks, author){
    var number = await Lesson.estimatedDocumentCount().exec()
    let lesson = {
        grade,
        identificator: number,
        title,
        description,
        tasks,
        author
    }
    await Lesson.insertMany([lesson]);
}

exports.addNews = async function (News, title, description, text, imageName, author){
    var number = await News.estimatedDocumentCount().exec()
    new_news = {
        identificator: number,
        title,
        description,
        text,
        imageName,
        date: Date.now().toString(),
        author
    }
    await News.insertMany([new_news]);
    return new_news
}

exports.addTask = async function (Task, title, statement, input, output, examples, tests, topic, grade, hint, author){
    var number = await Task.estimatedDocumentCount().exec()

    await Task.insertMany([{
        grade,
        identificator: '0_'+number,
        title,
        statement,
        examples,
        input,
        output,
        tests,
        topic,
        hint,
        author
    }]);
}

exports.addTournament = async function (Tournament, title, description, tasks,
     author, whenStarts, whenEnds, frozeAfter, mods, allowRegAfterStart, allOrNothing, penalty) {
    var number = await Tournament.estimatedDocumentCount().exec()
    let tournament = {
        identificator: number,
        title,
        description,
        tasks,
        author,
        whenStarts,
        whenEnds,
        frozeAfter,
        mods,
        allowRegAfterStart,
        allOrNothing,
        penalty,
        isBegan: false,
        isEnded: false,
        isFrozen: false
    }
    await Tournament.insertMany([tournament]);
}

exports.addTaskToTournament = async function (Tournament, tour_id, title, statement, input, output, examples, tests) {

    let tournament = await Tournament.findOne({ identificator: tour_id }).exec();
    tournament.tasks.push({
        identificator: tour_id + '_' + tournament.tasks.length,
        title,
        statement,
        input,
        output,
        examples,
        tests,
    });
    tournament.markModified("tasks");
    await tournament.save();
}

exports.AddQuizTemplate = async (Quiz, title, description, duration, author) => {
    let quiz = {
        identificator: await Quiz.countDocuments({template: true})*2+1,
        parent: null,
        template: true,
        title: title,
        teacher: "",
        description: description,
        duration: duration,
        tasks: [],
        grade: "",
        author: author,
        whenEnds: "",
        isBegan: false,
        isEnded: false,
        results: [],
        attempts: []
    }
    await Quiz.create(quiz)
}
exports.AddQuiz = async (Quiz, grade, teacher, parentID) => {
    let parent = await Quiz.findOne({ identificator: parentID }).exec();
    let whenEnds = new Date();
    whenEnds = new Date(whenEnds.getTime() + parent.duration * 60 * 1000).replace("T", " ");
    let quiz = {
        identificator: await Quiz.countDocuments({template: false})*2,
        parent: parentID,
        teacher: teacher,
        template: false,
        title: parent.title,
        description: parent.description,
        duration: parent.duration,
        tasks: parent.tasks,
        grade,
        author: parent.author,
        whenEnds,
        isBegan: true,
        isEnded: false,
        results: [],
        attempts: []
    }
    await Quiz.create(quiz)
}