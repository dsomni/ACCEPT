module.exports = {
    PathToUsersList:"PATH", //Path to users.xlsx file
    PathToTeachersList:"PATH", //Path to teachers.xlsx file
    port: "3000", //server port
    secret : 'secret',
    FolderLifeTime: 1.2*60*1000, //milliseconds
    mongodbConfigs:{
        dbName: "db", //mongodb data base name
        Host:"localhost:27017",//where data base located(default: "localhost:27017")
        User:{// mongodb user with Read and Write permissions or leave empty
            Username:"username",
            Password:"password",
        },
        CollectionNames:{ //names of collections
            users: "users", //with users
            news : "news", //with news
            tasks: "tasks", //with tasks
            lessons: "lessons"//with lessons
        }
    },
}