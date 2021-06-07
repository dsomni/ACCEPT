module.exports = {
  PathToUsersList: "D:\\Code\\TestSystemPack\\TestSystem\\public\\scripts\\users.xlsx",
  PathToDeleteUsersList: "D:\\Code\\TestSystemPack\\TestSystem\\public\\scripts\\deleteUsers.xlsx",
  PathToTeachersList: "D:\\Code\\TestSystemPack\\TestSystem\\public\\scripts\\teachers.xlsx",
  sessionLiveTime: 45*60,
  port: "3000",
  secret: "secret",
  FolderLifeTime: 42000.0,
  maxThreadsTests: 10,
  maxThreadsTasks: 5,
  onPage: {
    newsMain: 5,
    newsList: 10,
    tasks: 25,
    lessons: 20,
    tournaments: 15,
    students: 30,
    attempts: 20
  },
  mongodbConfigs: {
    dbName: "db",
    Host: "localhost:27017",
    User: {
      Username: "username",
      Password: "password"
    },
    CollectionNames: {
      users: "users",
      news: "news",
      tasks: "tasks",
      lessons: "lessons",
      tournament: "tournaments",
      quizzes: "quizzes"
    }
  }
}